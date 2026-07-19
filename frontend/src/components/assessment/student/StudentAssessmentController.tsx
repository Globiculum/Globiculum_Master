import { Button } from "@/components/ui/button";
import StepProgress from "../shared/StepProgress";
import { useStudentAssessmentState } from "./state/useStudentAssessmentState";
import { useStudentAssessmentNavigation } from "./navigation/useStudentAssessmentNavigation";
import StudentProfileStep from "./steps/StudentProfileStep";
import AcademicProfileStep from "./steps/AcademicProfileStep";
import LearningProfileStep from "./steps/LearningProfileStep";
import GoalsChallengesStep from "./steps/GoalsChallengesStep";
import GenerateReportStep from "./steps/GenerateReportStep";
import type { AssessmentFormData } from "../shared/types";

// Data-driven step controller — the Student flow's counterpart to
// AssessmentForm.tsx's hardcoded renderStep() switch, but scalable: adding,
// removing, or reordering a step means editing this one array.
const STEPS: Array<{ id: string; title: string }> = [
  { id: "profile", title: "Student Profile" },
  { id: "academic", title: "Academic Profile" },
  { id: "learning", title: "Learning Profile" },
  { id: "goals", title: "Goals & Challenges" },
  { id: "generate", title: "Generate Report" },
];

interface StudentAssessmentControllerProps {
  prefillData?: Partial<AssessmentFormData>;
  prevReportId?: string;
}

const StudentAssessmentController = ({ prefillData, prevReportId }: StudentAssessmentControllerProps) => {
  const { formData, setField, toggleArrayField, setRecordField } = useStudentAssessmentState(prefillData);
  const navigation = useStudentAssessmentNavigation();

  const stepProps = { formData, setField, toggleArrayField, setRecordField, errors: navigation.errors };

  const renderStep = () => {
    switch (navigation.stepId) {
      case "profile":
        return <StudentProfileStep {...stepProps} />;
      case "academic":
        return <AcademicProfileStep {...stepProps} />;
      case "learning":
        return <LearningProfileStep {...stepProps} />;
      case "goals":
        return <GoalsChallengesStep {...stepProps} />;
      case "generate":
        return (
          <GenerateReportStep
            formData={formData}
            prevReportId={prevReportId}
            onValidationErrors={() => navigation.goToStep(0)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <StepProgress steps={STEPS.map((s) => s.title)} currentStep={navigation.stepIndex} />

      {renderStep()}

      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={navigation.goPrev} disabled={navigation.isFirstStep}>
          Back
        </Button>
        {!navigation.isLastStep && (
          <Button onClick={() => navigation.goNext(formData)}>Next</Button>
        )}
      </div>
    </div>
  );
};

export default StudentAssessmentController;
