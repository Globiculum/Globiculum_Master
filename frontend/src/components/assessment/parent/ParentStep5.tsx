import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logAuditEvent } from "@/lib/logAuditEvent";
import LoadingScreen from "../shared/LoadingScreen";
import SectionContainer from "../shared/SectionContainer";
import { buildValidationPayload, buildAnalyzeCurriculumPayload, type ParentFormData } from "./parentMapper";

// Step 5: Generate Report.
// This is a verbatim port of AssessmentForm.tsx's handleSubmit() — same
// sequence of calls (validate-student-data -> assessments insert ->
// analyze-curriculum fire-and-forget -> diagnostics-engine ->
// diagnostic_results insert -> /report-preview), same error handling, same
// toasts. Only the payload construction is delegated to parentMapper.ts;
// field-level validation errors are reported back via onValidationErrors
// instead of local step-index state, since this component doesn't own the
// step index.

interface ParentStep5Props {
  formData: ParentFormData;
  prevReportId?: string;
  onPrev: () => void;
  onValidationErrors: (errors: Record<string, string>) => void;
}

const ParentStep5 = ({ formData, prevReportId, onPrev, onValidationErrors }: ParentStep5Props) => {
  const navigate = useNavigate();
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsValidating(true);

    const formDataJson = JSON.stringify(formData);
    sessionStorage.setItem("assessment-form-data", formDataJson);
    localStorage.setItem("assessment-form-data", formDataJson);
    sessionStorage.removeItem("saved-report-analysis");
    sessionStorage.removeItem("saved-report-id");

    console.log("[ParentStep5] Submitting form data:", formData);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/report-preview", { state: { formData, prevReportId } });
        return;
      }

      const userId = session.user.id;

      const validationPayload = buildValidationPayload(formData);

      const { data: valResponse, error: valError } = await supabase.functions.invoke("validate-student-data", {
        body: validationPayload,
        headers: { "X-API-Version": "v1" },
      });

      if (valError) {
        console.error("[ParentStep5] Validation call failed:", valError);
        toast({
          title: "Validation service unavailable",
          description: "Could not validate your data. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const valResult = valResponse?.data ?? valResponse;

      if (valResult && !valResult.isValid && valResult.errors?.length > 0) {
        const newFieldErrors: Record<string, string> = {};
        for (const err of valResult.errors) {
          newFieldErrors[err.field] = err.message;
        }
        onValidationErrors(newFieldErrors);

        toast({
          title: "Please correct the highlighted fields",
          description: `${valResult.errors.length} issue(s) found.`,
          variant: "destructive",
        });
        return;
      }

      if (valResult?.warnings?.length > 0) {
        for (const w of valResult.warnings) {
          toast({ title: w.message, description: w.suggestion || "" });
        }
      }

      setIsValidating(false);
      setIsSubmitting(true);

      const { data: studentProfile } = await supabase.from("student_profiles").select("id").eq("user_id", userId).maybeSingle();

      if (!studentProfile) {
        console.warn("[ParentStep5] No student profile found, skipping diagnostics");
        navigate("/report-preview", { state: { formData, prevReportId } });
        return;
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
        console.error("[ParentStep5] Failed to save assessment:", assessmentError);
        navigate("/report-preview", { state: { formData, prevReportId } });
        return;
      }

      logAuditEvent({
        action: "update_student_profile",
        tableName: "assessments",
        recordId: assessment.id,
        newData: { student_profile_id: studentProfile.id, status: "completed" },
      });

      supabase.functions
        .invoke("analyze-curriculum", {
          body: { formData: buildAnalyzeCurriculumPayload(formData) },
          headers: { "X-API-Version": "v1" },
        })
        .then(({ data: analysisResp }) => {
          console.log("[ParentStep5] analyze-curriculum response:", analysisResp);
          if (analysisResp?.data?._meta?.debug_logs) {
            console.log("[ParentStep5] analyze-curriculum debug logs:", analysisResp.data._meta.debug_logs);
            console.table(analysisResp.data._meta.debug_logs);
          }
          if (analysisResp?.data?._meta) {
            console.log("[ParentStep5] RAG meta:", {
              rag_enabled: analysisResp.data._meta.rag_enabled,
              rag_alignment_pct: analysisResp.data._meta.rag_alignment_pct,
              rag_gap_count: analysisResp.data._meta.rag_gap_count,
              requestId: analysisResp.data._meta.requestId,
              jobId: analysisResp.data._meta.jobId,
              attempts: analysisResp.data._meta.attempts,
            });
          }

          if (analysisResp?.success && analysisResp.data) {
            supabase
              .from("student_profiles")
              .update({ curriculum_analysis: analysisResp.data } as any)
              .eq("id", studentProfile.id)
              .then(({ error: updateErr }) => {
                if (updateErr) console.error("[ParentStep5] Failed to store curriculum_analysis:", updateErr);
                else console.log("[ParentStep5] curriculum_analysis stored successfully");
              });
          }
        })
        .catch((err) => {
          console.error("[ParentStep5] analyze-curriculum fire-and-forget error:", err);
        });

      const { data: diagResponse, error: diagError } = await supabase.functions.invoke("diagnostics-engine", {
        body: {
          studentId: studentProfile.id,
          assessmentId: assessment.id,
          diagnosticType: "full",
        },
      });

      if (diagError || !diagResponse?.success) {
        const errMsg = diagError?.message || diagResponse?.error || "Diagnostics engine failed";
        console.error("[ParentStep5] Diagnostics error:", errMsg);
        toast({
          title: "Could not run diagnostics",
          description: errMsg,
          variant: "destructive",
        });
        navigate("/report-preview", { state: { formData, prevReportId } });
        return;
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
        console.error("[ParentStep5] Failed to save diagnostic result:", saveError);
        navigate("/report-preview", { state: { formData, prevReportId } });
        return;
      }

      navigate(`/report-preview?diagnosticId=${(savedDiag as any).id}`, {
        state: { formData, diagnosticResultId: (savedDiag as any).id, assessmentId: assessment.id, prevReportId },
      });
    } catch (err: any) {
      console.error("[ParentStep5] Unexpected error:", err);
      toast({
        title: "Something went wrong",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
      navigate("/report-preview", { state: { formData, prevReportId } });
    } finally {
      setIsValidating(false);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <SectionContainer icon={Sparkles} title="Generate Report" description="Review your answers, then generate the AI-powered readiness report.">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-mint/10 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 text-secondary" />
          Your child's information is encrypted and only used to personalize this report.
        </div>
      </SectionContainer>

      <div className="sticky bottom-0 z-10 -mx-6 border-t border-border bg-background/90 px-6 py-4 backdrop-blur-sm md:-mx-10 md:px-10">
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onPrev}
            disabled={isSubmitting || isValidating}
            className="gap-2 rounded-full"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            type="button"
            size="lg"
            onClick={handleSubmit}
            disabled={isSubmitting || isValidating}
            className="group gap-2 rounded-full bg-gradient-cta px-8 shadow-medium transition-all duration-300 hover:shadow-strong hover:brightness-105"
          >
            <LoadingScreen isValidating={isValidating} isSubmitting={isSubmitting} idleLabel="View Alignment Report" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ParentStep5;
