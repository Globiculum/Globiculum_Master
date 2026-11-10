import { useEffect, useRef, useState } from "react";
import { BookOpen, ClipboardCheck, MapPin, User } from "lucide-react";
import type { AssessmentStepperStep } from "../shared/AssessmentStepper";
import { useScrollToFirstInvalidField } from "../shared/useScrollToFirstInvalidField";
import ParentAssessmentLayout from "./ui/ParentAssessmentLayout";
import ParentStep1 from "./ParentStep1";
import ParentStep2 from "./ParentStep2";
import ParentStep3 from "./ParentStep3";
import ParentStep5 from "./ParentStep5";
import { validateParentStep, parentStepShares, PARENT_TOTAL_STEPS } from "./parentValidation";
import type { ParentFormData } from "./parentMapper";
import RestoredDraftBanner from "../shared/RestoredDraftBanner";
import type { SubjectProgress } from "../shared/formProgress";
import { normalizeTargetStream } from "@/hooks/useCurriculumSubjects";
import { useLeaveWarning } from "@/hooks/useLeaveWarning";
import { saveDraft, type AssessmentDraft } from "@/lib/assessmentDraft";

// ParentAssessment.tsx — the dedicated Parent state owner and step
// controller. Fully isolated from the Student module: its own state
// instance, its own field set, its own step wiring. This is the direct
// replacement for the old AssessmentForm.tsx, ported field-for-field and
// behavior-for-behavior (see parentValidation.ts / parentMapper.ts for how
// the original 4-step gating and payload shape are preserved exactly).

interface ParentAssessmentProps {
  prefillData?: Record<string, any>;
  prevReportId?: string;
  onChangePersona: () => void;
  showChangePersona?: boolean;
  /** Answers saved earlier in this tab, restored in place of the defaults/prefill. */
  draft?: AssessmentDraft | null;
  /** Signed-in user, recorded on the saved draft; undefined before signing in. */
  userId?: string;
  /** Discards the restored answers and starts an empty form. */
  onStartOver?: () => void;
}

const STEPPER_STEPS: AssessmentStepperStep[] = [
  { id: "school-profile", title: "School Profile", icon: MapPin },
  { id: "academic-path", title: "Academic Path", icon: BookOpen },
  { id: "learning-profile", title: "Learning Profile", icon: User },
  { id: "review", title: "Review", icon: ClipboardCheck },
];

const createDefaultParentFormData = (): ParentFormData => ({
  childName: "",
  childLastName: "",
  schoolStage: "",
  snapshotGrade: "",
  snapshotLocation: "",
  snapshotLocationOther: "",
  usState: "",
  usStateOther: "",
  snapshotAge: "",
  currentCurriculum: [],
  currentCurriculumOther: "",
  curriculumType: "",
  reportCard: null,

  previousLocation: "",
  previousLocationOther: "",
  previouslyStudiedInIndia: "", // "yes" | "no" once answered — the question is optional
  targetGoal: "",
  targetGoalOther: "",
  targetGrade: "",
  targetStream: "",
  targetElectives: [],
  targetLanguage: "",
  timeline: "",
  educationHistory: [],

  academicPath: [],
  selectedLanguages: [],
  languageProficiencies: {},
  extracurriculars: [],
  languagesAtHome: [],
  foreignLanguageName: "",
  foreignLanguageNameOther: "",
  foreignLanguageLevel: "",
  mathCourse: "",
  mathProgramLevel: "",

  learningStyles: [],
  studyTime: "",
  previousGrades: "",
  overallPerformance: "",
  strongestSubjects: [],
  challengingSubjects: [],
  strengthenGoals: [],
  subjectConfidences: {},

  transitionConcerns: [],
  supportNeeds: [],
  additionalNotes: "",
});

// Ported verbatim from AssessmentForm.tsx's prefill-merge block.
const mergePrefillData = (defaults: ParentFormData, prefillData?: Record<string, any>): ParentFormData => {
  if (!prefillData) return defaults;

  // Older saved reports stored a single free-text "Other" language separately
  // (customLanguage) instead of as its own selectedLanguages entry — fold it
  // in here so editing an old report doesn't silently drop it.
  const baseLanguages = Array.isArray(prefillData.selectedLanguages) ? prefillData.selectedLanguages : defaults.selectedLanguages;
  const legacyCustomLanguage = typeof prefillData.customLanguage === "string" ? prefillData.customLanguage.trim() : "";
  const mergedLanguages =
    legacyCustomLanguage && !baseLanguages.includes(legacyCustomLanguage) ? [...baseLanguages, legacyCustomLanguage] : baseLanguages;

  return {
    ...defaults,
    // childName/childLastName: prefer the current Parent-flow keys; fall back
    // to the Student-flow keys (studentName/studentLastName) so retaking a
    // report that was generated via the Student path still populates names.
    childName: prefillData.childName || prefillData.studentName || defaults.childName,
    // childLastName was previously missing from this merge — that caused the
    // name wizard card to show as "unanswered", validation to fail on step 0,
    // and the wizard to jump to the empty name card (perceived as "start over").
    childLastName: prefillData.childLastName || prefillData.studentLastName || defaults.childLastName,
    schoolStage: prefillData.schoolStage || defaults.schoolStage,
    snapshotGrade: prefillData.snapshotGrade ? String(prefillData.snapshotGrade) : defaults.snapshotGrade,
    snapshotLocation: prefillData.snapshotLocation || defaults.snapshotLocation,
    snapshotLocationOther: prefillData.snapshotLocationOther || defaults.snapshotLocationOther,
    usState: prefillData.usState || defaults.usState,
    usStateOther: prefillData.usStateOther || defaults.usStateOther,
    snapshotAge: prefillData.snapshotAge ? String(prefillData.snapshotAge) : defaults.snapshotAge,
    // Older saved reports stored currentCurriculum as a single string —
    // normalize into the list shape this field now uses.
    currentCurriculum: Array.isArray(prefillData.currentCurriculum)
      ? prefillData.currentCurriculum
      : prefillData.currentCurriculum
        ? [prefillData.currentCurriculum]
        : defaults.currentCurriculum,
    currentCurriculumOther: prefillData.currentCurriculumOther || defaults.currentCurriculumOther,
    curriculumType: prefillData.curriculumType || defaults.curriculumType,
    previousLocation: prefillData.previousLocation || defaults.previousLocation,
    previousLocationOther: prefillData.previousLocationOther || defaults.previousLocationOther,
    previouslyStudiedInIndia: prefillData.previouslyStudiedInIndia || defaults.previouslyStudiedInIndia,
    targetGoal: prefillData.targetGoal || defaults.targetGoal,
    targetGoalOther: prefillData.targetGoalOther || defaults.targetGoalOther,
    targetGrade: prefillData.targetGrade || defaults.targetGrade,
    // Pre-split "science" is cleared so the stream question is asked again.
    targetStream: normalizeTargetStream(prefillData.targetStream) || defaults.targetStream,
    targetElectives: Array.isArray(prefillData.targetElectives) ? prefillData.targetElectives : defaults.targetElectives,
    targetLanguage: prefillData.targetLanguage || defaults.targetLanguage,
    timeline: prefillData.timeline || defaults.timeline,
    educationHistory: Array.isArray(prefillData.educationHistory) ? prefillData.educationHistory : defaults.educationHistory,
    academicPath: Array.isArray(prefillData.academicPath) ? prefillData.academicPath : defaults.academicPath,
    selectedLanguages: mergedLanguages,
    languageProficiencies: prefillData.languageProficiencies || defaults.languageProficiencies,
    extracurriculars: Array.isArray(prefillData.extracurriculars) ? prefillData.extracurriculars : defaults.extracurriculars,
    languagesAtHome: Array.isArray(prefillData.languagesAtHome) ? prefillData.languagesAtHome : defaults.languagesAtHome,
    foreignLanguageName: prefillData.foreignLanguageName || defaults.foreignLanguageName,
    foreignLanguageNameOther: prefillData.foreignLanguageNameOther || defaults.foreignLanguageNameOther,
    foreignLanguageLevel: prefillData.foreignLanguageLevel || defaults.foreignLanguageLevel,
    mathCourse: prefillData.mathCourse || defaults.mathCourse,
    mathProgramLevel: prefillData.mathProgramLevel || defaults.mathProgramLevel,
    learningStyles: Array.isArray(prefillData.learningStyles) ? prefillData.learningStyles : defaults.learningStyles,
    studyTime: prefillData.studyTime || defaults.studyTime,
    previousGrades: prefillData.previousGrades || defaults.previousGrades,
    overallPerformance: prefillData.overallPerformance || defaults.overallPerformance,
    strongestSubjects: Array.isArray(prefillData.strongestSubjects) ? prefillData.strongestSubjects : defaults.strongestSubjects,
    challengingSubjects: Array.isArray(prefillData.challengingSubjects) ? prefillData.challengingSubjects : defaults.challengingSubjects,
    transitionConcerns: Array.isArray(prefillData.transitionConcerns) ? prefillData.transitionConcerns : defaults.transitionConcerns,
    supportNeeds: Array.isArray(prefillData.supportNeeds) ? prefillData.supportNeeds : defaults.supportNeeds,
    strengthenGoals: Array.isArray(prefillData.strengthenGoals) ? prefillData.strengthenGoals : defaults.strengthenGoals,
    subjectConfidences:
      prefillData.subjectConfidences && typeof prefillData.subjectConfidences === "object"
        ? prefillData.subjectConfidences
        : defaults.subjectConfidences,
    // Saved with the report (form_data) and read by the AI, so a retake keeps it.
    additionalNotes: typeof prefillData.additionalNotes === "string" ? prefillData.additionalNotes : defaults.additionalNotes,
  };
};

const ParentAssessment = ({
  prefillData,
  prevReportId,
  onChangePersona,
  showChangePersona = true,
  draft,
  userId,
  onStartOver,
}: ParentAssessmentProps) => {
  const isRetake = Boolean(prefillData);
  // A restored draft wins over the defaults and the retake prefill: it holds the
  // newer answers. Otherwise retakes land directly on the Review step so the
  // user immediately sees all their pre-filled data and only needs to change
  // what they want.
  const [currentStep, setCurrentStep] = useState(() =>
    draft
      ? Math.max(0, Math.min(draft.step, PARENT_TOTAL_STEPS - 1))
      : isRetake ? PARENT_TOTAL_STEPS - 1 : 0
  );
  const [formData, setFormData] = useState<ParentFormData>(() =>
    draft
      ? { ...createDefaultParentFormData(), ...(draft.formData as Partial<ParentFormData>) }
      : mergePrefillData(createDefaultParentFormData(), prefillData)
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [validationAttempt, setValidationAttempt] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // "We kept your answers" shows until the user moves to another step.
  const [showRestored, setShowRestored] = useState(() => !!draft && !isRetake);

  useScrollToFirstInvalidField(validationAttempt);

  // Reported by the Academic Path step, which alone knows which subject cards it shows.
  const [subjectsComplete, setSubjectsComplete] = useState(false);
  const [subjectsProgress, setSubjectsProgress] = useState<SubjectProgress | null>(null);
  const stepContext = { subjectsComplete };
  // Continue stays dimmed until every required answer on the step is in.
  const canProceed = validateParentStep(currentStep, formData, stepContext).valid;
  // "Your Process": how much of each step is answered.
  const stepShares = parentStepShares(formData, subjectsProgress);

  // Closing the tab loses the answers (they are kept in this tab only), so the
  // browser asks first once anything has been entered.
  const [emptyForm] = useState(() => JSON.stringify(createDefaultParentFormData()));
  useLeaveWarning(JSON.stringify(formData) !== emptyForm);

  // Auto-save to this tab's draft (lib/assessmentDraft.ts), restored after a
  // refresh. Answers are debounced
  // so rapid typing doesn't hit storage on every keystroke; a step change is
  // saved at once. Both read the latest values from a ref, so a pending answer
  // save can't write back an older step. The mount-time run is skipped, so
  // opening a prefilled or restored form doesn't flash "Saved".
  const latest = useRef({ formData, currentStep, userId });
  latest.current = { formData, currentStep, userId };
  const writeDraft = () =>
    saveDraft({
      persona: "parent",
      ownerId: latest.current.userId ?? null,
      prevReportId: prevReportId ?? null,
      step: latest.current.currentStep,
      formData: latest.current.formData as unknown as Record<string, unknown>,
    });

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setSaveStatus("saving");
    const saveTimeout = setTimeout(() => {
      writeDraft();
      setSaveStatus("saved");
    }, 600);
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
  }, [currentStep]);

  useEffect(() => {
    if (saveStatus !== "saved") return;
    const resetTimeout = setTimeout(() => setSaveStatus("idle"), 2000);
    return () => clearTimeout(resetTimeout);
  }, [saveStatus]);

  // Clears a field's error the moment the user changes it, so a message
  // doesn't linger once it's no longer accurate — full re-validation still
  // runs on the next Continue click regardless.
  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const onFieldChange = <K extends keyof ParentFormData>(field: K, value: ParentFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field as string);
  };

  const onArrayToggle = (field: keyof ParentFormData, value: string) => {
    setFormData((prev) => {
      const current = prev[field] as string[];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [field]: next };
    });
    clearFieldError(field);
  };

  const onRecordFieldChange = (
    field: "languageProficiencies" | "subjectConfidences",
    key: string,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: { ...(prev[field] as Record<string, string>), [key]: value },
    }));
    clearFieldError(field);
  };

  const goNext = () => {
    const result = validateParentStep(currentStep, formData, stepContext);
    if (!result.valid) {
      setFieldErrors(result.errors);
      setValidationAttempt((n) => n + 1);
      return;
    }
    setFieldErrors({});
    if (currentStep < PARENT_TOTAL_STEPS - 1) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goPrev = () => {
    setFieldErrors({});
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goToStep = (index: number) => {
    setFieldErrors({});
    setCurrentStep(Math.max(0, Math.min(index, PARENT_TOTAL_STEPS - 1)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleValidationErrors = (errors: Record<string, string>) => {
    setFieldErrors(errors);
    setCurrentStep(0);
  };

  // onContinue: Next on a step's last card does what the page's Continue does.
  const stepProps = { formData, onFieldChange, onArrayToggle, onRecordFieldChange, fieldErrors, validationAttempt, onContinue: goNext };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <ParentStep1 {...stepProps} />;
      case 1:
        return <ParentStep2 {...stepProps} onSubjectsCompleteChange={setSubjectsComplete} onSubjectsProgressChange={setSubjectsProgress} />;
      case 2:
        return <ParentStep3 {...stepProps} />;
      case 3:
        return (
          <ParentStep5
            formData={formData}
            prevReportId={prevReportId}
            isRetake={isRetake}
            onPrev={goPrev}
            onValidationErrors={handleValidationErrors}
            onEditStep={goToStep}
          />
        );
      default:
        return null;
    }
  };

  // When the user edits a step during a retake, let them jump straight back to
  // the Review without clicking Next through every intermediate step.
  const handleSkipToReview = () => goToStep(PARENT_TOTAL_STEPS - 1);

  return (
    <ParentAssessmentLayout
      onChangePersona={onChangePersona}
      showChangePersona={showChangePersona}
      steps={STEPPER_STEPS}
      currentIndex={currentStep}
      stepShares={stepShares}
      onBack={goPrev}
      onNext={goNext}
      canProceed={canProceed}
      saveStatus={saveStatus}
      isFirstStep={currentStep === 0}
      isLastStep={currentStep === PARENT_TOTAL_STEPS - 1}
      isRetake={isRetake}
      onSkipToReview={isRetake && currentStep < PARENT_TOTAL_STEPS - 1 ? handleSkipToReview : undefined}
      banner={
        showRestored && onStartOver ? (
          <RestoredDraftBanner onStartOver={onStartOver} />
        ) : null
      }
    >
      <div key={currentStep} className="animate-in fade-in-0 slide-in-from-right-2 duration-300">
        {renderStep()}
      </div>
    </ParentAssessmentLayout>
  );
};

export default ParentAssessment;
