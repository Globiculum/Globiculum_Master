// Shared assessment data shape.
//
// Field names intentionally mirror the payload the backend already accepts
// (see AssessmentForm.tsx's formData + validate-student-data / analyze-curriculum
// edge functions). Reusing the same vocabulary here means the Student flow can
// submit through the existing backend pipeline without any backend changes.

import type { EducationHistoryEntry } from "./EducationHistoryList";

export interface AssessmentFormData {
  // ---- Student Profile ----
  studentName: string; // student's first name
  studentLastName: string; // student's last name
  schoolStage: string; // "elementary" | "middle" | "high"
  snapshotGrade: string;
  snapshotAge: string;
  snapshotLocation: string;
  snapshotLocationOther: string;
  usState: string;
  usStateOther: string;
  previousLocation: string;
  previousLocationOther: string;
  previouslyStudiedInIndia: string; // "yes" | "no" — gates whether Education History is shown
  educationHistory: EducationHistoryEntry[];

  // ---- Academic Profile ----
  currentCurriculum: string;
  currentCurriculumOther: string;
  curriculumType: string;
  academicPath: string[]; // current subjects
  otherSubject: string; // free-text value when "Other" is selected in academicPath
  selectedLanguages: string[];
  languageProficiencies: Record<string, string>;
  customLanguage: string;
  foreignLanguageName: string; // new: foreign-language studied (mirrors Parent flow)
  foreignLanguageNameOther: string;
  foreignLanguageLevel: string;

  // ---- Learning Profile ----
  learningStyles: string[];
  studyTime: string;
  previousGrades: string;
  strongestSubjects: string[];
  challengingSubjects: string[];
  subjectConfidences: Record<string, string>;
  nervousness: string[]; // new: "what makes you nervous" (student wrap-up step)

  // ---- Goals & Challenges ----
  targetGoal: string;
  targetGoalOther: string;
  targetGrade: string; // "same" | "next" — grade to enroll in relative to snapshotGrade
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
  studentName: "",
  studentLastName: "",
  schoolStage: "",
  snapshotGrade: "",
  snapshotAge: "",
  snapshotLocation: "",
  snapshotLocationOther: "",
  usState: "",
  usStateOther: "",
  previousLocation: "",
  previousLocationOther: "",
  previouslyStudiedInIndia: "no",
  educationHistory: [],

  currentCurriculum: "",
  currentCurriculumOther: "",
  curriculumType: "",
  academicPath: [],
  otherSubject: "",
  selectedLanguages: [],
  languageProficiencies: {},
  customLanguage: "",
  foreignLanguageName: "",
  foreignLanguageNameOther: "",
  foreignLanguageLevel: "",

  learningStyles: [],
  studyTime: "",
  previousGrades: "",
  strongestSubjects: [],
  challengingSubjects: [],
  subjectConfidences: {},
  nervousness: [],

  targetGoal: "",
  targetGoalOther: "",
  targetGrade: "",
  timeline: "",
  transitionConcerns: [],
  supportNeeds: [],
  strengthenGoals: [],

  additionalNotes: "",
});
