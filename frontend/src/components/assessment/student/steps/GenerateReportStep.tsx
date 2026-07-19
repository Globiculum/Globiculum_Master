import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { submitAssessment, ValidationFailedError } from "../../shared/submitAssessment";
import type { AssessmentFormData } from "../../shared/types";
import SectionCard from "../ui/SectionCard";

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

// Display-only formatting for the review summary below — never touches formData.
const prettify = (value: string) =>
  value ? value.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

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

  const summary = [
    { label: "School Stage", value: prettify(formData.schoolStage) },
    { label: "Current Grade", value: formData.snapshotGrade ? `Grade ${formData.snapshotGrade}` : "—" },
    {
      label: "Location",
      value:
        formData.snapshotLocation === "us"
          ? `United States${formData.usState ? ` (${formData.usState})` : ""}`
          : formData.snapshotLocationOther || prettify(formData.snapshotLocation),
    },
    { label: "Current Curriculum", value: prettify(formData.currentCurriculumOther || formData.currentCurriculum) },
    { label: "Subjects Selected", value: String(formData.academicPath.length) },
    { label: "Learning Styles", value: String(formData.learningStyles.length) },
    { label: "Target Goal", value: prettify(formData.targetGoal) },
    { label: "Preparation Timeline", value: prettify(formData.timeline) },
  ];

  return (
    <SectionCard
      icon={Sparkles}
      title="Generate Report"
      description="Review your answers, then generate your AI-powered readiness report."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {summary.map((item) => (
          <div key={item.label} className="rounded-xl border border-border bg-muted/40 p-3">
            <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-border bg-mint/10 p-3 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 shrink-0 text-secondary" />
        Your answers are private and only used to personalize your readiness report.
      </div>

      <Button
        onClick={handleGenerate}
        disabled={isSubmitting}
        size="lg"
        className="group w-full gap-2 rounded-full bg-gradient-cta shadow-medium transition-all duration-300 hover:shadow-strong hover:brightness-105 sm:w-auto"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating Report...
          </>
        ) : (
          <>
            Generate Report
            <Sparkles className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
          </>
        )}
      </Button>
    </SectionCard>
  );
};

export default GenerateReportStep;
