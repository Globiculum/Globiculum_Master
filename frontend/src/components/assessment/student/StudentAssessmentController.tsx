import { useEffect, useRef, useState } from "react";
import { BookOpen, ClipboardCheck, User, Wand2 } from "lucide-react";
import AssessmentLayout from "./ui/AssessmentLayout";
import type { AssessmentStepperStep as StepperStep } from "../shared/AssessmentStepper";
import { useStudentAssessmentState } from "./state/useStudentAssessmentState";
import { useStudentAssessmentNavigation } from "./navigation/useStudentAssessmentNavigation";
import { studentStepShares, validateStudentAssessmentStep } from "./validation/studentAssessmentValidation";
import { useScrollToFirstInvalidField } from "../shared/useScrollToFirstInvalidField";
import StudentProfileStep from "./steps/StudentProfileStep";
import AcademicProfileStep from "./steps/AcademicProfileStep";
import WrapUpStep from "./steps/WrapUpStep";
import StudentReviewStep from "./steps/StudentReviewStep";
import { createDefaultAssessmentFormData, type AssessmentFormData } from "../shared/types";
import type { SubjectProgress } from "../shared/formProgress";
import { useLeaveWarning } from "@/hooks/useLeaveWarning";
import RestoredDraftBanner from "../shared/RestoredDraftBanner";
import { saveDraft, type AssessmentDraft } from "@/lib/assessmentDraft";

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
  /** Answers saved earlier in this tab, restored in place of the prefill. */
  draft?: AssessmentDraft | null;
  /** Signed-in user, recorded on the saved draft; undefined before signing in. */
  userId?: string;
  /** Discards the restored answers and starts an empty form. */
  onStartOver?: () => void;
}

const StudentAssessmentController = ({
  prefillData,
  prevReportId,
  onChangePersona,
  draft,
  userId,
  onStartOver,
}: StudentAssessmentControllerProps) => {
  // Mirrors ParentAssessment.tsx's retake behavior: arriving with prefillData
  // (from the Reports History "Retake" button) means jump straight to the
  // Review step instead of Stage 1, since everything is already filled in.
  // A restored draft wins over both (see ParentAssessment).
  const isRetake = Boolean(prefillData);
  const { formData, setField, toggleArrayField, setRecordField } = useStudentAssessmentState(
    prefillData,
    draft ? (draft.formData as Partial<AssessmentFormData>) : undefined
  );
  const navigation = useStudentAssessmentNavigation(draft ? draft.step : isRetake ? STEPS.length - 1 : 0);

  // "We kept your answers" shows until the user moves to another step.
  const [showRestored, setShowRestored] = useState(() => !!draft && !isRetake);

  // Saves the answers to this tab's draft (see ParentAssessment): answers
  // debounced, step changes at once, both from the latest values.
  const latest = useRef({ formData, stepIndex: navigation.stepIndex, userId });
  latest.current = { formData, stepIndex: navigation.stepIndex, userId };
  const writeDraft = () =>
    saveDraft({
      persona: "student",
      ownerId: latest.current.userId ?? null,
      prevReportId: prevReportId ?? null,
      step: latest.current.stepIndex,
      formData: latest.current.formData as unknown as Record<string, unknown>,
    });

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const saveTimeout = setTimeout(writeDraft, 600);
    return () => clearTimeout(saveTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- writeDraft reads the latest values from a ref
  }, [formData]);

  const isFirstStepRender = useRef(true);
  useEffect(() => {
    if (isFirstStepRender.current) {
      isFirstStepRender.current = false;
      return;
    }
    setShowRestored(false);
    writeDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [navigation.stepIndex]);

  useScrollToFirstInvalidField(navigation.validationAttempt);

  // Reported by the Academic step, which alone knows which subject cards it shows.
  const [subjectsComplete, setSubjectsComplete] = useState(false);
  const [subjectsProgress, setSubjectsProgress] = useState<SubjectProgress | null>(null);
  const stepContext = { subjectsComplete };
  // Continue stays dimmed until every required answer on the step is in.
  const canProceed = validateStudentAssessmentStep(navigation.stepId, formData, stepContext).valid;

  // Closing the tab loses the answers (kept in this tab only), so the browser
  // asks first once anything has been entered.
  const [emptyForm] = useState(() => JSON.stringify(createDefaultAssessmentFormData()));
  useLeaveWarning(JSON.stringify(formData) !== emptyForm);

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
    validationAttempt: navigation.validationAttempt,
  };

  const renderStep = () => {
    switch (navigation.stepId) {
      case "profile":
        return <StudentProfileStep {...stepProps} />;
      case "academic":
        return <AcademicProfileStep {...stepProps} onSubjectsCompleteChange={setSubjectsComplete} onSubjectsProgressChange={setSubjectsProgress} />;
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
      stepShares={studentStepShares(formData, subjectsProgress)}
      onBack={navigation.goPrev}
      onNext={() => navigation.goNext(formData, stepContext)}
      canProceed={canProceed}
      isFirstStep={navigation.isFirstStep}
      isLastStep={navigation.isLastStep}
      isRetake={isRetake}
      onSkipToReview={isRetake && !navigation.isLastStep ? handleSkipToReview : undefined}
      banner={showRestored && onStartOver ? <RestoredDraftBanner onStartOver={onStartOver} /> : null}
    >
      {renderStep()}
    </AssessmentLayout>
  );
};

export default StudentAssessmentController;
