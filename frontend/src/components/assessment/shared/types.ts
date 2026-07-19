// Shared assessment data shape.
//
// Field names intentionally mirror the payload the backend already accepts
// (see AssessmentForm.tsx's formData + validate-student-data / analyze-curriculum
// edge functions). Reusing the same vocabulary here means the Student flow can
// submit through the existing backend pipeline without any backend changes.

export interface AssessmentFormData {
  // ---- Student Profile ----
  schoolStage: string; // "elementary" | "middle" | "high"
  snapshotGrade: string;
  snapshotAge: string;
  snapshotLocation: string;
  snapshotLocationOther: string;
  usState: string;
  usStateOther: string;
  previousLocation: string;
  previousLocationOther: string;

  // ---- Academic Profile ----
  currentCurriculum: string;
  currentCurriculumOther: string;
  curriculumType: string;
  academicPath: string[]; // current subjects
  selectedLanguages: string[];
  languageProficiencies: Record<string, string>;
  customLanguage: string;

  // ---- Learning Profile ----
  learningStyles: string[];
  studyTime: string;
  previousGrades: string;
  strongestSubjects: string[];
  challengingSubjects: string[];
  subjectConfidences: Record<string, string>;

  // ---- Goals & Challenges ----
  targetGoal: string;
  targetGoalOther: string;
  timeline: string;
  transitionConcerns: string[];
  supportNeeds: string[];
  strengthenGoals: string[];

  // Frontend-only placeholder field. Not part of the current backend
  // payload contract — kept here so the UI can capture it now and a future
  // sprint can decide whether/how to send it once the backend supports it.
  additionalNotes: string;
}

export const createDefaultAssessmentFormData = (): AssessmentFormData => ({
  schoolStage: "",
  snapshotGrade: "",
  snapshotAge: "",
  snapshotLocation: "",
  snapshotLocationOther: "",
  usState: "",
  usStateOther: "",
  previousLocation: "",
  previousLocationOther: "",

  currentCurriculum: "",
  currentCurriculumOther: "",
  curriculumType: "",
  academicPath: [],
  selectedLanguages: [],
  languageProficiencies: {},
  customLanguage: "",

  learningStyles: [],
  studyTime: "",
  previousGrades: "",
  strongestSubjects: [],
  challengingSubjects: [],
  subjectConfidences: {},

  targetGoal: "",
  targetGoalOther: "",
  timeline: "",
  transitionConcerns: [],
  supportNeeds: [],
  strengthenGoals: [],

  additionalNotes: "",
});
