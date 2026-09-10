import { BookOpen, ClipboardCheck, User, Wand2 } from "lucide-react";
import AssessmentLayout from "./ui/AssessmentLayout";
import type { AssessmentStepperStep as StepperStep } from "../shared/AssessmentStepper";
import { useStudentAssessmentState } from "./state/useStudentAssessmentState";
import { useStudentAssessmentNavigation } from "./navigation/useStudentAssessmentNavigation";
import { useScrollToFirstInvalidField } from "../shared/useScrollToFirstInvalidField";
import StudentProfileStep from "./steps/StudentProfileStep";
import AcademicProfileStep from "./steps/AcademicProfileStep";
import WrapUpStep from "./steps/WrapUpStep";
import StudentReviewStep from "./steps/StudentReviewStep";
import type { AssessmentFormData } from "../shared/types";

// Data-driven step controller — the Student flow's counterpart to
// AssessmentForm.tsx's hardcoded renderStep() switch, but scalable: adding,
// removing, or reordering a step means editing this one array. `id` values
// must stay in sync with STUDENT_ASSESSMENT_STEP_IDS in validation/.
// Student journey is 4 steps, ending in a Review step (mirrors Parent) whose
// own button triggers submission — no more immediate-generate step.
const STEPS: StepperStep[] = [
  { id: "profile", title: "Student Profile", icon: User },
  { id: "academic", title: "Academic Profile", icon: BookOpen },
  { id: "wrapup", title: "Almost Done", icon: Wand2 },
  { id: "review", title: "Review", icon: ClipboardCheck },
];

// Single source of truth for the Student flow's step count, so pages that
// reference it before this controller mounts (e.g. the persona-selection
// step indicator) don't duplicate the number.
export const STUDENT_TOTAL_STEPS = STEPS.length;

interface StudentAssessmentControllerProps {
  prefillData?: Partial<AssessmentFormData>;
  prevReportId?: string;
  onChangePersona: () => void;
}

const StudentAssessmentController = ({ prefillData, prevReportId, onChangePersona }: StudentAssessmentControllerProps) => {
  // Mirrors ParentAssessment.tsx's retake behavior: arriving with prefillData
  // (from the Reports History "Retake" button) means jump straight to the
  // Review step instead of Stage 1, since everything is already filled in.
  const isRetake = Boolean(prefillData);
  const { formData, setField, toggleArrayField, setRecordField } = useStudentAssessmentState(prefillData);
  const navigation = useStudentAssessmentNavigation(isRetake ? STEPS.length - 1 : 0);

  useScrollToFirstInvalidField(navigation.validationAttempt);

  // Clears a field's error the moment the user changes it (see
  // useStudentAssessmentNavigation's clearError), so a message doesn't
  // linger once it's no longer accurate.
  const handleSetField: typeof setField = (field, value) => {
    setField(field, value);
    navigation.clearError(field as string);
  };

  const handleToggleArrayField: typeof toggleArrayField = (field, value) => {
    toggleArrayField(field, value);
    navigation.clearError(field as string);
  };

  const handleSetRecordField: typeof setRecordField = (field, key, value) => {
    setRecordField(field, key, value);
    navigation.clearError(field);
  };

  const stepProps = {
    formData,
    setField: handleSetField,
    toggleArrayField: handleToggleArrayField,
    setRecordField: handleSetRecordField,
    errors: navigation.errors,
  };

  const renderStep = () => {
    switch (navigation.stepId) {
      case "profile":
        return <StudentProfileStep {...stepProps} />;
      case "academic":
        return <AcademicProfileStep {...stepProps} />;
      case "wrapup":
        return <WrapUpStep {...stepProps} />;
      case "review":
        return (
          <StudentReviewStep
            formData={formData}
            prevReportId={prevReportId}
            isRetake={isRetake}
            onPrev={navigation.goPrev}
            onValidationErrors={() => navigation.goToStep(0)}
            onEditStep={navigation.goToStep}
          />
        );
      default:
        return null;
    }
  };

  // Lets a retake user jump straight back to Review from any intermediate
  // step they opened to edit, instead of clicking Next through the rest.
  const handleSkipToReview = () => navigation.goToStep(STEPS.length - 1);

  return (
    <AssessmentLayout
      onChangePersona={onChangePersona}
      steps={STEPS}
      currentIndex={navigation.stepIndex}
      onBack={navigation.goPrev}
      onNext={() => navigation.goNext(formData)}
      isFirstStep={navigation.isFirstStep}
      isLastStep={navigation.isLastStep}
      isRetake={isRetake}
      onSkipToReview={isRetake && !navigation.isLastStep ? handleSkipToReview : undefined}
    >
      {renderStep()}
    </AssessmentLayout>
  );
};

export default StudentAssessmentController;
