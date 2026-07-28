import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { submitAssessment, ValidationFailedError } from "../../shared/submitAssessment";
import ReportGenerationLoader from "../../shared/ReportGenerationLoader";
import type { AssessmentFormData } from "../../shared/types";
import SectionCard from "../../shared/SectionCard";
import ReviewActionBar from "../../shared/ReviewActionBar";
import ReviewSection from "../../shared/ReviewSection";
import { prettify, targetGradeLabel, joinList, joinPrettyList, joinRecord } from "../../shared/reviewFormatting";

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
  onPrev: () => void;
  onValidationErrors: (errors: Record<string, string>) => void;
  onEditStep: (index: number) => void;
}

const StudentReviewStep = ({ formData, prevReportId, onPrev, onValidationErrors, onEditStep }: StudentReviewStepProps) => {
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
        { label: "Target Grade", value: targetGradeLabel(formData.targetGrade, formData.snapshotGrade) },
        { label: "Transition Timeline", value: prettify(formData.timeline) },
      ],
    },
    {
      stepIndex: 1,
      title: "Academic Path",
      rows: [
        { label: "Current Subjects", value: joinList(formData.academicPath) },
        { label: "Language Exposure", value: joinList(formData.selectedLanguages) },
        { label: "Language Proficiencies", value: joinRecord(formData.languageProficiencies) },
        {
          label: "Foreign Language",
          value: formData.foreignLanguageName
            ? `${prettify(formData.foreignLanguageNameOther || formData.foreignLanguageName)}${
                formData.foreignLanguageLevel ? ` (${prettify(formData.foreignLanguageLevel)})` : ""
              }`
            : "—",
        },
        { label: "Other Language", value: formData.customLanguage || "—" },
      ],
    },
    {
      stepIndex: 2,
      title: "Almost Done",
      rows: [
        { label: "Learning Styles", value: joinPrettyList(formData.learningStyles) },
        { label: "What Makes You Nervous", value: joinList(formData.nervousness) },
        { label: "Additional Notes", value: formData.additionalNotes || "—" },
      ],
    },
  ];

  return (
    <>
      <SectionCard icon={ClipboardCheck} title="Review" description="Check your answers, then generate your AI-powered readiness report.">
        <div className="space-y-4">
          {sections.map((section) => (
            <ReviewSection key={section.title} section={section} onEditStep={onEditStep} />
          ))}
        </div>
      </SectionCard>

      <ReviewActionBar
        onPrev={onPrev}
        onSubmit={handleGenerate}
        isSubmitting={isSubmitting}
        submitLabel={isSubmitting ? "Generating Report..." : "Generate My Report"}
      />

      {isSubmitting && <ReportGenerationLoader persona="student" />}
    </>
  );
};

export default StudentReviewStep;
