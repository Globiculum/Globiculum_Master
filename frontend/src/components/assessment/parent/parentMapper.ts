// parentMapper.ts
//
// Single responsibility: convert Parent assessment state into the payload
// shapes the existing backend already expects. Both functions below are
// copied FIELD-FOR-FIELD from the original AssessmentForm.tsx's
// handleSubmit() — no renames, no additions, no removals, so the JSON sent
// to validate-student-data / analyze-curriculum is byte-identical to
// before this refactor.

export interface ParentFormData {
  // Step 1: School Profile
  schoolStage: string;
  snapshotGrade: string;
  snapshotLocation: string;
  snapshotLocationOther: string;
  usState: string;
  usStateOther: string;
  snapshotAge: string;
  currentCurriculum: string;
  currentCurriculumOther: string;
  curriculumType: string;
  reportCard: File | null;
  previousLocation: string;
  previousLocationOther: string;
  targetGoal: string;
  targetGoalOther: string;
  timeline: string;

  // Step 2: Academic Profile
  academicPath: string[];
  selectedLanguages: string[];
  languageProficiencies: Record<string, string>;
  customLanguage: string;
  extracurriculars: string[];
  languagesAtHome: string[];
  foreignLanguageName: string;
  foreignLanguageNameOther: string;
  foreignLanguageLevel: string;
  elementaryConfidences: Record<string, string>;
  mathCourse: string;
  mathProgramLevel: string;
  academicSignals: string[];

  // Step 3: Learning Profile
  learningStyles: string[];
  studyTime: string;
  previousGrades: string;
  strongestSubjects: string[];
  challengingSubjects: string[];
  strengthenGoals: string[];
  subjectConfidences: Record<string, string>;

  // Step 4: Concerns & Support
  transitionConcerns: string[];
  supportNeeds: string[];
  // Frontend-only — see Step 4 for details. Never included in the payloads below.
  additionalNotes: string;
}

/** Verbatim copy of handleSubmit's `validationPayload` object. */
export function buildValidationPayload(formData: ParentFormData) {
  return {
    schoolStage: formData.schoolStage,
    snapshotGrade: parseInt(formData.snapshotGrade, 10) || 0,
    snapshotAge: formData.snapshotAge ? parseInt(formData.snapshotAge, 10) : undefined,
    currentCurriculum: formData.currentCurriculum,
    timeline: formData.timeline || undefined,
    snapshotLocation: formData.snapshotLocation || undefined,
    usState: formData.usState || undefined,
  };
}

/** Verbatim copy of handleSubmit's analyze-curriculum `body.formData` object. */
export function buildAnalyzeCurriculumPayload(formData: ParentFormData) {
  return {
    schoolStage: formData.schoolStage,
    snapshotGrade: parseInt(formData.snapshotGrade, 10) || undefined,
    snapshotLocation: formData.snapshotLocation || undefined,
    usState: formData.usState || undefined,
    previousCountry: formData.previousLocation || undefined,
    currentCurriculum: formData.currentCurriculum || undefined,
    targetCurriculum: formData.targetGoal || formData.curriculumType || undefined,
    targetGoal: formData.targetGoal || undefined,
    academicPath: formData.academicPath.length > 0 ? formData.academicPath : undefined,
    strongestSubjects: formData.strongestSubjects.length > 0 ? formData.strongestSubjects : undefined,
    challengingAreas: formData.challengingSubjects.length > 0 ? formData.challengingSubjects : undefined,
    languagesSpoken: formData.selectedLanguages.length > 0 ? formData.selectedLanguages : undefined,
    transitionTimeline: formData.timeline || undefined,
  };
}
