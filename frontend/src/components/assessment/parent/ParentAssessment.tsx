import { useState } from "react";
import { CardContent } from "@/components/ui/card";
import AssessmentLayout from "../shared/AssessmentLayout";
import AssessmentHeader from "../shared/AssessmentHeader";
import ProgressBar from "../shared/ProgressBar";
import StepNavigation from "../shared/StepNavigation";
import ParentStep1 from "./ParentStep1";
import ParentStep2 from "./ParentStep2";
import ParentStep3 from "./ParentStep3";
import ParentStep4 from "./ParentStep4";
import ParentStep5 from "./ParentStep5";
import { canProceedFromStep, PARENT_TOTAL_STEPS } from "./parentValidation";
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
}

const createDefaultParentFormData = (): ParentFormData => ({
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
  targetGoal: "",
  targetGoalOther: "",
  timeline: "",

  academicPath: [],
  selectedLanguages: [],
  languageProficiencies: {},
  customLanguage: "",
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

  return {
    ...defaults,
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
    targetGoal: prefillData.targetGoal || defaults.targetGoal,
    targetGoalOther: prefillData.targetGoalOther || defaults.targetGoalOther,
    timeline: prefillData.timeline || defaults.timeline,
    academicPath: Array.isArray(prefillData.academicPath) ? prefillData.academicPath : defaults.academicPath,
    selectedLanguages: Array.isArray(prefillData.selectedLanguages) ? prefillData.selectedLanguages : defaults.selectedLanguages,
    languageProficiencies: prefillData.languageProficiencies || defaults.languageProficiencies,
    customLanguage: prefillData.customLanguage || defaults.customLanguage,
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

const ParentAssessment = ({ prefillData, prevReportId }: ParentAssessmentProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<ParentFormData>(() => mergePrefillData(createDefaultParentFormData(), prefillData));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const onFieldChange = <K extends keyof ParentFormData>(field: K, value: ParentFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const onArrayToggle = (field: keyof ParentFormData, value: string) => {
    setFormData((prev) => {
      const current = prev[field] as string[];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [field]: next };
    });
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
  };

  const goNext = () => {
    if (currentStep < PARENT_TOTAL_STEPS - 1) setCurrentStep((prev) => prev + 1);
  };

  const goPrev = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
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
        return <ParentStep5 formData={formData} prevReportId={prevReportId} onPrev={goPrev} onValidationErrors={handleValidationErrors} />;
      default:
        return null;
    }
  };

  return (
    <AssessmentLayout
      title={
        <>
          Begin Your <span className="text-primary">Personalized Curriculum Mapping</span>
        </>
      }
      subtitle="Answer a few questions to unlock your AI-generated alignment report"
    >
      <AssessmentHeader
        stepNumber={currentStep + 1}
        totalSteps={PARENT_TOTAL_STEPS}
        title="Educational Assessment"
        description="Comprehensive assessment for personalized curriculum alignment"
      />

      <CardContent className="space-y-8">
        <ProgressBar totalSteps={PARENT_TOTAL_STEPS} currentStep={currentStep} />

        {renderStep()}

        {currentStep < PARENT_TOTAL_STEPS - 1 && (
          <StepNavigation onPrev={goPrev} onNext={goNext} isFirstStep={currentStep === 0} canProceed={canProceedFromStep(currentStep, formData)} />
        )}
      </CardContent>
    </AssessmentLayout>
  );
};

export default ParentAssessment;
