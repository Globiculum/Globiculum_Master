import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck, Pencil, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { submitAssessment, ValidationFailedError } from "../../shared/submitAssessment";
import ReportGenerationLoader from "../../shared/ReportGenerationLoader";
import type { AssessmentFormData } from "../../shared/types";
import SectionCard from "../ui/SectionCard";
import PremiumButton from "../ui/PremiumButton";

// Step 4: Review.
// Mirrors ParentStep5's Review pattern (editable summary + per-section Edit
// links + a single final submit button) instead of generating immediately.
// Submission itself is unchanged — still the same shared/submitAssessment.ts
// pipeline (validate-student-data -> assessments insert -> analyze-curriculum
// -> diagnostics-engine -> diagnostic_results insert -> /report-preview) that
// GenerateReportStep used to call directly; it now only fires from here,
// after the student has had a chance to review and edit their answers.

interface StudentReviewStepProps {
  formData: AssessmentFormData;
  prevReportId?: string;
  onValidationErrors: (errors: Record<string, string>) => void;
  onEditStep: (index: number) => void;
}

const prettify = (value: string) =>
  value ? value.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

const StudentReviewStep = ({ formData, prevReportId, onValidationErrors, onEditStep }: StudentReviewStepProps) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGenerate = async () => {
    if (isSubmitting) return; // guard against double-click / duplicate submission
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
        console.error("[StudentReviewStep] submission failed:", err);
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

  const fullName = [formData.studentName, formData.studentLastName].filter(Boolean).join(" ") || "—";

  const sections = [
    {
      stepIndex: 0,
      title: "Student Profile",
      rows: [
        { label: "Name", value: fullName },
        { label: "School Stage", value: prettify(formData.schoolStage) },
        { label: "Current Grade", value: formData.snapshotGrade ? `Grade ${formData.snapshotGrade}` : "—" },
        {
          label: "Current School Country",
          value:
            formData.snapshotLocation === "us"
              ? `United States${formData.usState ? ` (${formData.usState})` : ""}`
              : formData.snapshotLocationOther || prettify(formData.snapshotLocation),
        },
        { label: "Current Curriculum", value: prettify(formData.currentCurriculumOther || formData.currentCurriculum) },
        { label: "Target Indian Board", value: prettify(formData.targetGoal) },
        { label: "Transition Timeline", value: prettify(formData.timeline) },
      ],
    },
    {
      stepIndex: 1,
      title: "Academic Path",
      rows: [
        { label: "Current Subjects", value: String(formData.academicPath.length) },
        { label: "Language Exposure", value: String(formData.selectedLanguages.length) },
      ],
    },
    {
      stepIndex: 2,
      title: "Almost Done",
      rows: [
        { label: "Learning Styles", value: String(formData.learningStyles.length) },
        { label: "What Makes You Nervous", value: String(formData.nervousness.length) },
      ],
    },
  ];

  return (
    <>
      <SectionCard icon={ClipboardCheck} title="Review" description="Check your answers, then generate your AI-powered readiness report.">
        <div className="space-y-4">
          {sections.map((section) => (
            <div key={section.title} className="rounded-xl border border-border bg-muted/40 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">{section.title}</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditStep(section.stepIndex)}
                  className="h-auto gap-1 px-2 py-1 text-xs text-secondary hover:text-secondary"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {section.rows.map((row) => (
                  <div key={row.label}>
                    <p className="text-xs text-muted-foreground">{row.label}</p>
                    <p className="text-sm font-medium text-foreground">{row.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <PremiumButton onClick={handleGenerate} loading={isSubmitting} size="lg" className="w-full sm:w-auto">
          {isSubmitting ? "Generating Report..." : "Generate My Report"}
          <Sparkles className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
        </PremiumButton>
      </SectionCard>

      {isSubmitting && <ReportGenerationLoader persona="student" />}
    </>
  );
};

export default StudentReviewStep;
