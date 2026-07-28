// parentMapper.ts
//
// The Parent flow's formData shape. Field names (schoolStage, snapshotGrade,
// academicPath, etc.) intentionally match shared/submitAssessment.ts's
// SubmittableFormData subset field-for-field, so ParentStep5.tsx can submit
// through the same shared pipeline Student uses without any payload
// transformation — the validate-student-data / analyze-curriculum JSON is
// unchanged from before this refactor.

import type { EducationHistoryEntry } from "../shared/EducationHistoryList";

export interface ParentFormData {
  // Step 1: School Profile
  childName: string;
  childLastName: string;
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
  previouslyStudiedInIndia: string; // "yes" | "no" — gates whether Education History is shown
  targetGoal: string;
  targetGoalOther: string;
  targetGrade: string; // "same" | "next" — grade to enroll in relative to snapshotGrade
  timeline: string;
  educationHistory: EducationHistoryEntry[];

  // Step 2: Academic Profile
  academicPath: string[];
  otherSubject: string; // free-text value when "Other" is selected in academicPath
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
  overallPerformance: string;
  strongestSubjects: string[];
  challengingSubjects: string[];
  strengthenGoals: string[];
  subjectConfidences: Record<string, string>;

  // Step 4: Concerns & Support
  transitionConcerns: string[];
  supportNeeds: string[];
  // Frontend-only — see Step 4 for details. Never included in the submission payload.
  additionalNotes: string;
}
