import { supabase } from "@/integrations/supabase/client";
import { logAuditEvent } from "@/lib/logAuditEvent";
import type { AssessmentFormData } from "./types";

/**
 * This mirrors the submission pipeline in AssessmentForm.tsx (the existing/
 * Parent flow) field-for-field and call-for-call: validate-student-data ->
 * save `assessments` row -> fire-and-forget analyze-curriculum -> run
 * diagnostics-engine -> save `diagnostic_results` -> hand back where to
 * navigate. It exists so the new Student flow submits through the exact
 * same backend contract without touching AssessmentForm.tsx or any backend
 * code. Intentionally UI-agnostic (no toast/navigate calls) so it can be
 * driven by either flow's own step components.
 */

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

export interface SubmitAssessmentOptions {
  formData: AssessmentFormData;
  prevReportId?: string;
}

const fallbackResult = (formData: AssessmentFormData, prevReportId?: string): SubmitAssessmentResult => ({
  path: "/report-preview",
  state: { formData, prevReportId },
  warnings: [],
});

export async function submitAssessment({
  formData,
  prevReportId,
}: SubmitAssessmentOptions): Promise<SubmitAssessmentResult> {
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
    currentCurriculum: formData.currentCurriculum,
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

  // Fire-and-forget: same analyze-curriculum payload shape as the existing flow
  supabase.functions
    .invoke("analyze-curriculum", {
      body: {
        formData: {
          schoolStage: formData.schoolStage,
          snapshotGrade: parseInt(formData.snapshotGrade, 10) || undefined,
          snapshotLocation: formData.snapshotLocation || undefined,
          usState: formData.usState || undefined,
          previousCountry: formData.previousLocation || undefined,
          currentCurriculum: formData.currentCurriculum || undefined,
          targetCurriculum: formData.targetGoal || formData.curriculumType || undefined,
          targetGoal: formData.targetGoal || undefined,
          academicPath: formData.academicPath.length > 0 ? formData.academicPath : undefined,
          strongestSubjects: formData.strongestSubjects.length > 0 ? formData.strongestSubjects : undefined,
          challengingAreas: formData.challengingSubjects.length > 0 ? formData.challengingSubjects : undefined,
          languagesSpoken: formData.selectedLanguages.length > 0 ? formData.selectedLanguages : undefined,
          transitionTimeline: formData.timeline || undefined,
        },
      },
      headers: { "X-API-Version": "v1" },
    })
    .then(({ data: analysisResp }) => {
      if (analysisResp?.success && analysisResp.data) {
        supabase
          .from("student_profiles")
          .update({ curriculum_analysis: analysisResp.data } as any)
          .eq("id", studentProfile.id)
          .then(({ error: updateErr }) => {
            if (updateErr) console.error("[submitAssessment] Failed to store curriculum_analysis:", updateErr);
          });
      }
    })
    .catch((err) => {
      console.error("[submitAssessment] analyze-curriculum fire-and-forget error:", err);
    });

  // ── Diagnostics ──
  const { data: diagResponse, error: diagError } = await supabase.functions.invoke("diagnostics-engine", {
    body: {
      studentId: studentProfile.id,
      assessmentId: assessment.id,
      diagnosticType: "full",
    },
  });

  if (diagError || !diagResponse?.success) {
    return { ...fallbackResult(formData, prevReportId), warnings };
  }

  const diagResult = diagResponse.data;

  const { data: savedDiag, error: saveError } = await supabase
    .from("diagnostic_results" as any)
    .insert({
      user_id: userId,
      student_profile_id: studentProfile.id,
      assessment_id: assessment.id,
      overall_score: diagResult.overallScore,
      subject_scores: diagResult.subjectScores,
      strength_areas: diagResult.strengthAreas,
      gap_areas: diagResult.gapAreas,
      readiness_level: diagResult.readinessLevel,
      recommendations: diagResult.recommendations,
      diagnostic_type: "full",
    } as any)
    .select("id")
    .single();

  if (saveError || !savedDiag) {
    return { ...fallbackResult(formData, prevReportId), warnings };
  }

  return {
    path: `/report-preview?diagnosticId=${(savedDiag as any).id}`,
    state: {
      formData,
      diagnosticResultId: (savedDiag as any).id,
      assessmentId: assessment.id,
      prevReportId,
    },
    warnings,
  };
}
