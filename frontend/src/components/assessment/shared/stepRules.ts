import { z } from "zod";
import type { EducationHistoryEntry } from "./EducationHistoryList";
import { NEW_TO_LANGUAGE, newSchoolLanguageGrade, schoolLanguages } from "./newSchoolLanguage";

// Required-answer rules shared by parentValidation.ts and
// student/validation/studentAssessmentValidation.ts.

export interface StepContext {
  /** False while the Academic Path step shows a subject card with no answer
   * (a level, or "doesn't take this"), or while its subject list is loading.
   * The step reports it, since only the step knows which subjects it lists. */
  subjectsComplete?: boolean;
}

export const LANGUAGE_LEVEL_MESSAGE = "Pick a level for each language";

/** The Indian language at the new school is required wherever it is asked
 * (Classes 6-10 of an Indian board); "Not decided yet" counts as an answer.
 * Hindi or Sanskrit chosen there also needs a level ("New to it" counts), the
 * same as a language marked as known: without it the report can't tell where
 * the child starts. */
export function newSchoolLanguageError(data: {
  targetGoal: string;
  snapshotGrade: string;
  targetGrade: string;
  targetLanguage?: string;
  languageProficiencies?: Record<string, string>;
}): string | undefined {
  if (!newSchoolLanguageGrade(data.targetGoal, data.snapshotGrade, data.targetGrade)) return undefined;
  if (!data.targetLanguage) return "Choose the Indian language at the new school, or Not decided yet";
  return missingSchoolLanguageLevels(data.targetLanguage, data.languageProficiencies).length > 0 ? LANGUAGE_LEVEL_MESSAGE : undefined;
}

/** Languages chosen for the new school that have no level yet. */
export function missingSchoolLanguageLevels(targetLanguage: string | undefined, levels: Record<string, string> | undefined): string[] {
  return schoolLanguages(targetLanguage).filter((lang) => !levels?.[lang]);
}

/** A known language's level: "New to it" belongs to the new-school question only. */
export const hasKnownLanguageLevel = (level: string | undefined) => !!level && level !== NEW_TO_LANGUAGE;

/** Each Indian language marked as known needs a familiarity level: without it
 * the report can't tell a beginner from a fluent speaker and starts the child
 * at beginner material (T48 c). */
export function languageLevelError(data: {
  selectedLanguages: string[];
  languageProficiencies: Record<string, string>;
}): string | undefined {
  return data.selectedLanguages.some((lang) => !hasKnownLanguageLevel(data.languageProficiencies?.[lang])) ? LANGUAGE_LEVEL_MESSAGE : undefined;
}

export const SUBJECTS_INCOMPLETE_MESSAGE = "Answer every subject: pick a level, or mark it as not taken";

export const previousSchoolingFields = {
  previouslyStudiedInIndia: z.string(),
  educationHistory: z.array(z.custom<EducationHistoryEntry>()),
};

/** "Attended an Indian school before?" is optional; a Yes needs at least one
 * prior school with every field filled. */
export function checkPreviousSchooling(
  data: { previouslyStudiedInIndia?: string; educationHistory?: EducationHistoryEntry[] },
  ctx: z.RefinementCtx
) {
  if (data.previouslyStudiedInIndia !== "yes") return;
  const complete = (e: EducationHistoryEntry) => !!(e?.fromGrade && e?.toGrade && e?.country && e?.curriculum);
  const entries = data.educationHistory ?? [];
  if (entries.length === 0 || !entries.every(complete)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Add each prior school with its grades and curriculum",
      path: ["educationHistory"],
    });
  }
}
