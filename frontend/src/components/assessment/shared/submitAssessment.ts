import { supabase } from "@/integrations/supabase/client";
import { logAuditEvent } from "@/lib/logAuditEvent";

/**
 * Shared submission pipeline used by both the Parent and Student flows:
 * validate-student-data -> save `assessments` row -> analyze-curriculum
 * -> hand back where to navigate. Intentionally UI-agnostic (no toast/
 * navigate calls) so it can be driven by either flow's own step components.
 *
 * diagnostics-engine used to run here too (in parallel with
 * analyze-curriculum) and save a `diagnostic_results` row. It's no longer
 * called: its only consumer was the Guardian Dashboard, which is disabled
 * (see App.tsx's /dashboard route), and its own readiness-score formula
 * differed from analyze-curriculum's (fixed once, but the two were never
 * meant to be two independently-computed sources of truth for the same
 * number). analyze-curriculum's RAG-grounded overallAlignment.percentage is
 * now the only readiness score in the product. diagnostics-engine's code is
 * untouched and still deployed — only this call site was removed — so it
 * can be wired back in if a dashboard returns.
 *
 * Generic over `T` rather than importing AssessmentFormData directly: the
 * Parent and Student flows keep their own formData shapes (e.g. `childName`
 * vs `studentName`) since that full object is stored verbatim as
 * `assessment_data`. This type only pins down the subset of fields this
 * pipeline actually reads to build the validate-student-data /
 * analyze-curriculum payloads — both flows' formData types satisfy it
 * structurally, so each flow's exact current wire payload (and its stored
 * assessment_data shape) is preserved byte-for-byte.
 */
export interface SubmittableFormData {
  schoolStage: string;
  snapshotGrade: string;
  snapshotAge: string;
  currentCurriculum: string[];
  timeline: string;
  snapshotLocation: string;
  usState: string;
  previousLocation: string;
  targetGoal: string;
  curriculumType: string;
  academicPath: string[];
  strongestSubjects: string[];
  challengingSubjects: string[];
  selectedLanguages: string[];
  subjectConfidences: Record<string, string>;
}

/**
 * Single source of truth for "strongest"/"challenging" subjects: both are
 * derived from subjectConfidences (Strong/Moderate/Needs Help) rather than
 * collected as their own separate question. Used by both this file's
 * analyze-curriculum call and ReportPreview.tsx's own analyze-curriculum
 * call, so there is exactly one place this logic lives.
 *
 * "Moderate" maps to neither list — it isn't a strength or a gap, just a
 * subject with no strong signal either way.
 */
export const deriveSubjectStrengths = (
  subjectConfidences: Record<string, string> | undefined | null
): { strongest: string[]; challenging: string[] } => {
  const strongest: string[] = [];
  const challenging: string[] = [];
  for (const [subject, confidence] of Object.entries(subjectConfidences ?? {})) {
    if (confidence === "strong") strongest.push(subject);
    else if (confidence === "needs-help") challenging.push(subject);
  }
  return { strongest, challenging };
};

export interface SubmitAssessmentFieldError {
  field: string;
  message: string;
}

export interface SubmitAssessmentWarning {
  message: string;
  suggestion?: string;
}

export class ValidationFailedError extends Error {
  errors: SubmitAssessmentFieldError[];
  constructor(errors: SubmitAssessmentFieldError[]) {
    super("Please correct the highlighted fields.");
    this.name = "ValidationFailedError";
    this.errors = errors;
  }
}

export interface SubmitAssessmentResult {
  path: string;
  state: Record<string, unknown>;
  warnings: SubmitAssessmentWarning[];
}

export interface SubmitAssessmentOptions<T extends SubmittableFormData> {
  formData: T;
  prevReportId?: string;
}

const fallbackResult = <T extends SubmittableFormData>(formData: T, prevReportId?: string): SubmitAssessmentResult => ({
  path: "/report-preview",
  state: { formData, prevReportId },
  warnings: [],
});

export async function submitAssessment<T extends SubmittableFormData>({
  formData,
  prevReportId,
}: SubmitAssessmentOptions<T>): Promise<SubmitAssessmentResult> {
  const formDataJson = JSON.stringify(formData);
  sessionStorage.setItem("assessment-form-data", formDataJson);
  localStorage.setItem("assessment-form-data", formDataJson);
  sessionStorage.removeItem("saved-report-analysis");
  sessionStorage.removeItem("saved-report-id");

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return fallbackResult(formData, prevReportId);
  }

  const userId = session.user.id;

  // ── Validation gate: call validate-student-data (same edge function, same payload shape) ──
  const validationPayload = {
    schoolStage: formData.schoolStage,
    snapshotGrade: parseInt(formData.snapshotGrade, 10) || 0,
    snapshotAge: formData.snapshotAge ? parseInt(formData.snapshotAge, 10) : undefined,
    currentCurriculum: formData.currentCurriculum.join(", "),
    timeline: formData.timeline || undefined,
    snapshotLocation: formData.snapshotLocation || undefined,
    usState: formData.usState || undefined,
  };

  const { data: valResponse, error: valError } = await supabase.functions.invoke("validate-student-data", {
    body: validationPayload,
    headers: { "X-API-Version": "v1" },
  });

  if (valError) {
    throw new Error("Could not validate your data. Please try again.");
  }

  const valResult = valResponse?.data ?? valResponse;

  if (valResult && !valResult.isValid && valResult.errors?.length > 0) {
    throw new ValidationFailedError(valResult.errors);
  }

  const warnings: SubmitAssessmentWarning[] = valResult?.warnings?.length > 0 ? valResult.warnings : [];

  // ── Proceed with save ──
  const { data: studentProfile } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!studentProfile) {
    return { ...fallbackResult(formData, prevReportId), warnings };
  }

  const { data: assessment, error: assessmentError } = await supabase
    .from("assessments")
    .insert({
      user_id: userId,
      student_profile_id: studentProfile.id,
      assessment_data: formData as any,
      status: "completed",
    })
    .select("id")
    .single();

  if (assessmentError || !assessment) {
    return { ...fallbackResult(formData, prevReportId), warnings };
  }

  logAuditEvent({
    action: "update_student_profile",
    tableName: "assessments",
    recordId: assessment.id,
    newData: { student_profile_id: studentProfile.id, status: "completed" },
  });

  // analyze-curriculum used to be fire-and-forget here AND called again,
  // synchronously, by ReportPreview.tsx — two full Gemini + RAG round trips
  // for one report. It's now awaited here and its result is threaded through
  // to ReportPreview via navigation state (see `prefetchedAnalysis` below),
  // which checks for it before making its own call.
  const { strongest, challenging } = deriveSubjectStrengths(formData.subjectConfidences);
  const analysisSettled = await supabase.functions
    .invoke("analyze-curriculum", {
      body: {
        formData: {
          schoolStage: formData.schoolStage,
          snapshotGrade: parseInt(formData.snapshotGrade, 10) || undefined,
          snapshotLocation: formData.snapshotLocation || undefined,
          usState: formData.usState || undefined,
          previousCountry: formData.previousLocation || undefined,
          // Joined to a string, not passed as the raw array: analyze-curriculum's
          // schema declares currentCurriculum as `type: 'string'`, and its
          // validator does a strict `typeof value === 'string'` check — so
          // sending the array failed validation with a 400 on EVERY submission.
          // That error was swallowed by the .catch() below, leaving
          // prefetchedAnalysis null and forcing ReportPreview to redo the whole
          // analyze-curriculum call itself (it joins the same way, via
          // resolveCurriculumList).
          currentCurriculum: formData.currentCurriculum.length > 0
            ? formData.currentCurriculum.join(", ")
            : undefined,
          targetCurriculum: formData.targetGoal || formData.curriculumType || undefined,
          targetGoal: formData.targetGoal || undefined,
          academicPath: formData.academicPath.length > 0 ? formData.academicPath : undefined,
          strongestSubjects: strongest.length > 0 ? strongest : undefined,
          challengingAreas: challenging.length > 0 ? challenging : undefined,
          languagesSpoken: formData.selectedLanguages.length > 0 ? formData.selectedLanguages : undefined,
          transitionTimeline: formData.timeline || undefined,
        },
      },
      headers: { "X-API-Version": "v1" },
    })
    .catch((err) => {
      console.error("[submitAssessment] analyze-curriculum error:", err);
      return null;
    });

  // Same unwrap shape ReportPreview.tsx uses for its own analyze-curriculum
  // response — { success, data: { analysis, validation, _meta } } — so
  // `prefetchedAnalysis` below is exactly the AnalysisData shape ReportPreview
  // expects, not the outer envelope.
  interface AnalyzeCurriculumResponseData {
    analysis?: Record<string, unknown>;
    [key: string]: unknown;
  }
  let prefetchedAnalysis: Record<string, unknown> | undefined;
  const rawAnalysisData = analysisSettled?.data as { data?: AnalyzeCurriculumResponseData } & AnalyzeCurriculumResponseData | undefined;
  const analysisResponseData: AnalyzeCurriculumResponseData | undefined = rawAnalysisData?.data ?? rawAnalysisData;
  if (analysisResponseData?.analysis) {
    prefetchedAnalysis = analysisResponseData.analysis;
    supabase
      .from("student_profiles")
      .update({ curriculum_analysis: analysisResponseData } as any)
      .eq("id", studentProfile.id)
      .then(({ error: updateErr }) => {
        if (updateErr) console.error("[submitAssessment] Failed to store curriculum_analysis:", updateErr);
      });
  }

  return {
    path: "/report-preview",
    state: {
      formData,
      assessmentId: assessment.id,
      prevReportId,
      prefetchedAnalysis,
    },
    warnings,
  };
}
