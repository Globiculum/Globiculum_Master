import { useEffect, useRef, useState } from "react";
import { BookOpen, ClipboardCheck, MapPin, User } from "lucide-react";
import type { AssessmentStepperStep } from "../shared/AssessmentStepper";
import { useScrollToFirstInvalidField } from "../shared/useScrollToFirstInvalidField";
import ParentAssessmentLayout from "./ui/ParentAssessmentLayout";
import ParentStep1 from "./ParentStep1";
import ParentStep2 from "./ParentStep2";
import ParentStep3 from "./ParentStep3";
import ParentStep5 from "./ParentStep5";
import { validateParentStep, PARENT_TOTAL_STEPS } from "./parentValidation";
import type { ParentFormData } from "./parentMapper";

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
  previouslyStudiedInIndia: "no",
  targetGoal: "",
  targetGoalOther: "",
  targetGrade: "",
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
    // additionalNotes has no backend-persisted equivalent, so it is never prefilled from a saved report.
  };
};

const ParentAssessment = ({ prefillData, prevReportId, onChangePersona, showChangePersona = true }: ParentAssessmentProps) => {
  const isRetake = Boolean(prefillData);
  // Retakes land directly on the Review step so the user immediately sees all
  // their pre-filled data and only needs to change what they want.
  const [currentStep, setCurrentStep] = useState(() => isRetake ? PARENT_TOTAL_STEPS - 1 : 0);
  const [formData, setFormData] = useState<ParentFormData>(() => mergePrefillData(createDefaultParentFormData(), prefillData));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [validationAttempt, setValidationAttempt] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  useScrollToFirstInvalidField(validationAttempt);

  // Auto-save (sessionStorage, same key/shape submitAssessment already persists on
  // submit — no Supabase call, no payload/validation change). Debounced so rapid
  // typing doesn't hit storage on every keystroke; skips the mount-time run so
  // loading a prefilled/draft report doesn't flash "Saved" before the user touches it.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setSaveStatus("saving");
    const saveTimeout = setTimeout(() => {
      sessionStorage.setItem("assessment-form-data", JSON.stringify(formData));
      setSaveStatus("saved");
    }, 600);
    return () => clearTimeout(saveTimeout);
  }, [formData]);

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
    const result = validateParentStep(currentStep, formData);
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

  const stepProps = { formData, onFieldChange, onArrayToggle, onRecordFieldChange, fieldErrors };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <ParentStep1 {...stepProps} />;
      case 1:
        return <ParentStep2 {...stepProps} />;
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
      onBack={goPrev}
      onNext={goNext}
      saveStatus={saveStatus}
      isFirstStep={currentStep === 0}
      isLastStep={currentStep === PARENT_TOTAL_STEPS - 1}
      isRetake={isRetake}
      onSkipToReview={isRetake && currentStep < PARENT_TOTAL_STEPS - 1 ? handleSkipToReview : undefined}
    >
      <div key={currentStep} className="animate-in fade-in-0 slide-in-from-right-2 duration-300">
        {renderStep()}
      </div>
    </ParentAssessmentLayout>
  );
};

export default ParentAssessment;
