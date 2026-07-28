import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { submitAssessment, ValidationFailedError } from "../shared/submitAssessment";
import ReportGenerationLoader from "../shared/ReportGenerationLoader";
import SectionCard from "../shared/SectionCard";
import ReviewActionBar from "../shared/ReviewActionBar";
import ReviewSection from "../shared/ReviewSection";
import { prettify, targetGradeLabel, joinList, joinPrettyList, joinRecord } from "../shared/reviewFormatting";
import type { ParentFormData } from "./parentMapper";

// Step 5: Review. Submits through the same shared/submitAssessment.ts
// pipeline the Student flow uses (validate-student-data -> assessments
// insert -> analyze-curriculum fire-and-forget -> diagnostics-engine ->
// diagnostic_results insert -> /report-preview). ParentFormData's payload
// fields (schoolStage, snapshotGrade, academicPath, etc.) match
// AssessmentFormData's field-for-field, so the wire payload sent to
// validate-student-data / analyze-curriculum is unchanged; the full
// formData object — including Parent-only field names like `childName` —
// is still stored verbatim as `assessment_data`, exactly as before.

interface ParentStep5Props {
  formData: ParentFormData;
  prevReportId?: string;
  onPrev: () => void;
  onValidationErrors: (errors: Record<string, string>) => void;
  onEditStep: (index: number) => void;
}

const ParentStep5 = ({ formData, prevReportId, onPrev, onValidationErrors, onEditStep }: ParentStep5Props) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
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
        console.error("[ParentStep5] submission failed:", err);
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

  const sections = [
    {
      stepIndex: 0,
      title: "School Profile",
      rows: [
        { label: "Child's Name", value: formData.childName || "—" },
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
        { label: "Extracurriculars", value: joinList(formData.extracurriculars) },
        { label: "Math Course", value: prettify(formData.mathCourse) },
      ],
    },
    {
      stepIndex: 2,
      title: "Learning Profile",
      rows: [
        { label: "Learning Styles", value: joinPrettyList(formData.learningStyles) },
        { label: "Overall Performance", value: prettify(formData.overallPerformance) },
        { label: "Strongest Subjects", value: joinList(formData.strongestSubjects) },
        { label: "Challenging Subjects", value: joinList(formData.challengingSubjects) },
        { label: "Subject Confidences", value: joinRecord(formData.subjectConfidences) },
        { label: "Areas to Strengthen", value: joinList(formData.strengthenGoals) },
      ],
    },
    {
      stepIndex: 3,
      title: "Support",
      rows: [
        { label: "Biggest Concerns", value: joinList(formData.transitionConcerns) },
        { label: "Preferred Support", value: joinList(formData.supportNeeds) },
        { label: "Additional Notes", value: formData.additionalNotes || "—" },
      ],
    },
  ];

  return (
    <>
      <SectionCard icon={ClipboardCheck} title="Review" description="Check your answers, then generate the AI-powered readiness report.">
        <div className="space-y-4">
          {sections.map((section) => (
            <ReviewSection key={section.title} section={section} onEditStep={onEditStep} />
          ))}
        </div>
      </SectionCard>

      <ReviewActionBar
        onPrev={onPrev}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel={isSubmitting ? "Generating Report..." : "View Alignment Report"}
      />

      {isSubmitting && <ReportGenerationLoader persona="parent" />}
    </>
  );
};

export default ParentStep5;
