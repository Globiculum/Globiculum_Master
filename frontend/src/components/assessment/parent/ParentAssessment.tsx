import { useEffect, useRef, useState } from "react";
import { BookOpen, ClipboardCheck, HeartHandshake, MapPin, User } from "lucide-react";
import AssessmentContainer from "../shared/AssessmentContainer";
import AssessmentHeader from "../shared/AssessmentHeader";
import AssessmentStepper, { type AssessmentStepperStep } from "../shared/AssessmentStepper";
import ProgressSidebar from "../shared/ProgressSidebar";
import AssessmentFooter from "../shared/AssessmentFooter";
import { useScrollToFirstInvalidField } from "../shared/useScrollToFirstInvalidField";
import ParentStep1 from "./ParentStep1";
import ParentStep2 from "./ParentStep2";
import ParentStep3 from "./ParentStep3";
import ParentStep4 from "./ParentStep4";
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
  { id: "support", title: "Support", icon: HeartHandshake },
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
  currentCurriculum: "",
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
  elementaryConfidences: {},
  mathCourse: "",
  mathProgramLevel: "",
  academicSignals: [],

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
    childName: prefillData.childName || defaults.childName,
    schoolStage: prefillData.schoolStage || defaults.schoolStage,
    snapshotGrade: prefillData.snapshotGrade ? String(prefillData.snapshotGrade) : defaults.snapshotGrade,
    snapshotLocation: prefillData.snapshotLocation || defaults.snapshotLocation,
    snapshotLocationOther: prefillData.snapshotLocationOther || defaults.snapshotLocationOther,
    usState: prefillData.usState || defaults.usState,
    usStateOther: prefillData.usStateOther || defaults.usStateOther,
    snapshotAge: prefillData.snapshotAge ? String(prefillData.snapshotAge) : defaults.snapshotAge,
    currentCurriculum: prefillData.currentCurriculum || defaults.currentCurriculum,
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
    elementaryConfidences: prefillData.elementaryConfidences || defaults.elementaryConfidences,
    mathCourse: prefillData.mathCourse || defaults.mathCourse,
    mathProgramLevel: prefillData.mathProgramLevel || defaults.mathProgramLevel,
    academicSignals: Array.isArray(prefillData.academicSignals) ? prefillData.academicSignals : defaults.academicSignals,
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
  const [currentStep, setCurrentStep] = useState(0);
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
    field: "languageProficiencies" | "subjectConfidences" | "elementaryConfidences",
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
    if (currentStep < PARENT_TOTAL_STEPS - 1) setCurrentStep((prev) => prev + 1);
  };

  const goPrev = () => {
    setFieldErrors({});
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };

  const goToStep = (index: number) => {
    setFieldErrors({});
    setCurrentStep(Math.max(0, Math.min(index, PARENT_TOTAL_STEPS - 1)));
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
        return <ParentStep4 {...stepProps} />;
      case 4:
        return (
          <ParentStep5
            formData={formData}
            prevReportId={prevReportId}
            onPrev={goPrev}
            onValidationErrors={handleValidationErrors}
            onEditStep={goToStep}
          />
        );
      default:
        return null;
    }
  };

  return (
    <AssessmentContainer sidebar={<ProgressSidebar steps={STEPPER_STEPS} currentIndex={currentStep} />}>
      <AssessmentHeader
        onChangePersona={onChangePersona}
        title="Parent Assessment"
        subtitle="Answer a few questions to generate your child's personalized curriculum transition report."
        showChangePersona={showChangePersona}
        currentIndex={currentStep}
        totalSteps={PARENT_TOTAL_STEPS}
      />
      <AssessmentStepper steps={STEPPER_STEPS} currentIndex={currentStep} />

      <div key={currentStep} className="animate-in fade-in-0 slide-in-from-right-2 duration-300">
        {renderStep()}
      </div>

      {currentStep < PARENT_TOTAL_STEPS - 1 && (
        <AssessmentFooter
          onPrev={goPrev}
          onNext={goNext}
          saveStatus={saveStatus}
          isFirstStep={currentStep === 0}
          canProceed
        />
      )}
    </AssessmentContainer>
  );
};

export default ParentAssessment;
