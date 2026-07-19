import { BookOpen, Brain, Sparkles, Target, User } from "lucide-react";
import AssessmentLayout from "./ui/AssessmentLayout";
import type { StepperStep } from "./ui/ProgressStepper";
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
// removing, or reordering a step means editing this one array. `id` values
// must stay in sync with STUDENT_ASSESSMENT_STEP_IDS in validation/.
const STEPS: StepperStep[] = [
  { id: "profile", title: "Student Profile", icon: User },
  { id: "academic", title: "Academic Profile", icon: BookOpen },
  { id: "learning", title: "Learning Profile", icon: Brain },
  { id: "goals", title: "Goals & Challenges", icon: Target },
  { id: "generate", title: "Generate Report", icon: Sparkles },
];

interface StudentAssessmentControllerProps {
  prefillData?: Partial<AssessmentFormData>;
  prevReportId?: string;
  onChangePersona: () => void;
}

const StudentAssessmentController = ({ prefillData, prevReportId, onChangePersona }: StudentAssessmentControllerProps) => {
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
    <AssessmentLayout
      onChangePersona={onChangePersona}
      steps={STEPS}
      currentIndex={navigation.stepIndex}
      onBack={navigation.goPrev}
      onNext={() => navigation.goNext(formData)}
      isFirstStep={navigation.isFirstStep}
      isLastStep={navigation.isLastStep}
    >
      {renderStep()}
    </AssessmentLayout>
  );
};

export default StudentAssessmentController;
