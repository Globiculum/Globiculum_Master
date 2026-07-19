import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { submitAssessment, ValidationFailedError } from "../../shared/submitAssessment";
import type { AssessmentFormData } from "../../shared/types";

// Step 5: Generate Report.
// Reuses the exact submission pipeline (validate-student-data ->
// assessments insert -> analyze-curriculum -> diagnostics-engine ->
// diagnostic_results insert -> /report-preview) via shared/submitAssessment,
// which is the same API/payload contract AssessmentForm.tsx already submits
// through. No backend or Parent code involved.

interface GenerateReportStepProps {
  formData: AssessmentFormData;
  prevReportId?: string;
  onValidationErrors: (errors: Record<string, string>) => void;
}

const GenerateReportStep = ({ formData, prevReportId, onValidationErrors }: GenerateReportStepProps) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGenerate = async () => {
    setIsSubmitting(true);
    try {
      const result = await submitAssessment({ formData, prevReportId });

      for (const warning of result.warnings) {
        toast({ title: warning.message, description: warning.suggestion || "" });
      }

      navigate(result.path, { state: result.state });
    } catch (err) {
      if (err instanceof ValidationFailedError) {
        const fieldErrors: Record<string, string> = {};
        for (const e of err.errors) fieldErrors[e.field] = e.message;
        onValidationErrors(fieldErrors);
        toast({
          title: "Please correct the highlighted fields",
          description: `${err.errors.length} issue(s) found.`,
          variant: "destructive",
        });
      } else {
        console.error("[GenerateReportStep] submission failed:", err);
        toast({
          title: "Something went wrong",
          description: err instanceof Error ? err.message : "Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Generate Report</h2>
      <p className="text-sm text-muted-foreground">
        Review your answers in the previous steps, then generate your AI-powered readiness report.
      </p>

      <Button onClick={handleGenerate} disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating Report...
          </>
        ) : (
          "Generate Report"
        )}
      </Button>
    </div>
  );
};

export default GenerateReportStep;
