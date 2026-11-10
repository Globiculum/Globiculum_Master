import { gradeHasStream, normalizeTargetStream } from "@/hooks/useCurriculumSubjects";
import { newSchoolLanguageGrade } from "./newSchoolLanguage";
import { languageLevelError, newSchoolLanguageError, previousSchoolsComplete } from "./stepRules";
import type { EducationHistoryEntry } from "./EducationHistoryList";

// "Your Process" percentage for both assessments, counted from the answers
// given rather than from the step the user is on (which showed 25% on an empty
// first page). Only required questions count, plus an optional question's
// follow-up once it is answered (a Yes to "attended an Indian school" needs
// its schools).

/** One question: answered or not, or a share of a group (5 of 8 subjects). */
export type Answer = boolean | number;

/** How much of a step is answered, from 0 to 1. */
export function stepShare(answers: Answer[]): number {
  if (answers.length === 0) return 1;
  const sum = answers.reduce<number>((acc, a) => acc + (typeof a === "number" ? Math.min(1, Math.max(0, a)) : a ? 1 : 0), 0);
  return sum / answers.length;
}

/** Whole-form percentage. Each question step weighs the same, so the number
 * never jumps when a later step gains or loses a question. Rounded down: 100
 * only when everything is answered. */
export function percentAnswered(stepShares: number[]): number {
  if (stepShares.length === 0) return 0;
  const mean = stepShares.reduce((a, b) => a + b, 0) / stepShares.length;
  return Math.floor(mean * 100 + 1e-9);
}

/** Subject cards answered on the Academic step, reported by the step itself
 * (only it knows the subject list). Null until the step has been opened. */
export interface SubjectProgress {
  answered: number;
  total: number;
}

/** The fields both forms share, under their common names. */
export interface ProgressFields {
  schoolStage: string;
  snapshotGrade: string;
  snapshotLocation: string;
  snapshotLocationOther?: string;
  usState: string;
  usStateOther?: string;
  currentCurriculum: string[];
  currentCurriculumOther?: string;
  targetGoal: string;
  targetGrade: string;
  targetStream: string;
  timeline: string;
  previouslyStudiedInIndia: string;
  educationHistory: EducationHistoryEntry[];
  academicPath: string[];
  subjectConfidences: Record<string, string>;
  overallPerformance: string;
  selectedLanguages: string[];
  languageProficiencies: Record<string, string>;
  targetLanguage?: string;
}

const filled = (value: string | undefined) => !!value && value.trim() !== "";

/** The School / Profile step after the name. `askOtherText`: only the Parent
 * form asks for a typed state, country or curriculum. */
export function schoolAnswers(d: ProgressFields, askOtherText: boolean): Answer[] {
  return [
    filled(d.schoolStage),
    filled(d.snapshotGrade),
    filled(d.snapshotLocation),
    ...(d.snapshotLocation === "us" ? [filled(d.usState)] : []),
    ...(askOtherText && d.snapshotLocation === "us" && d.usState === "other" ? [filled(d.usStateOther)] : []),
    ...(askOtherText && d.snapshotLocation === "other" ? [filled(d.snapshotLocationOther)] : []),
    d.currentCurriculum.length > 0,
    ...(askOtherText && d.currentCurriculum.includes("other") ? [filled(d.currentCurriculumOther)] : []),
    filled(d.targetGoal),
    filled(d.targetGrade),
    ...(gradeHasStream(d.snapshotGrade, d.targetGoal, d.targetGrade) ? [!!normalizeTargetStream(d.targetStream)] : []),
    filled(d.timeline),
    ...(d.previouslyStudiedInIndia === "yes" ? [previousSchoolsComplete(d.educationHistory)] : []),
  ];
}

/** The Academic step. Before the step reports its subject count (not opened
 * yet in this visit), any subject answer counts the group as done: answers
 * only exist that early when they were saved or pre-filled. */
export function academicAnswers(d: ProgressFields, subjects: SubjectProgress | null): Answer[] {
  const subjectShare = subjects
    ? subjects.total > 0 ? subjects.answered / subjects.total : 0
    : Object.keys(d.subjectConfidences).length > 0 || d.academicPath.length > 0;
  return [
    subjectShare,
    filled(d.overallPerformance),
    ...(newSchoolLanguageGrade(d.targetGoal, d.snapshotGrade, d.targetGrade) ? [!newSchoolLanguageError(d)] : []),
    ...(d.selectedLanguages.length > 0 ? [!languageLevelError(d)] : []),
  ];
}
