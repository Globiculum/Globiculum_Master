import { z } from "zod";
import type { EducationHistoryEntry } from "./EducationHistoryList";
import { newSchoolLanguageGrade } from "./newSchoolLanguage";

// Required-answer rules shared by parentValidation.ts and
// student/validation/studentAssessmentValidation.ts.

export interface StepContext {
  /** False while the Academic Path step shows a subject card with no answer
   * (a level, or "doesn't take this"), or while its subject list is loading.
   * The step reports it, since only the step knows which subjects it lists. */
  subjectsComplete?: boolean;
}

/** The Indian language at the new school is required wherever it is asked
 * (Classes 6-10 of an Indian board); "Not decided yet" counts as an answer. */
export function newSchoolLanguageError(data: {
  targetGoal: string;
  snapshotGrade: string;
  targetGrade: string;
  targetLanguage?: string;
}): string | undefined {
  if (!newSchoolLanguageGrade(data.targetGoal, data.snapshotGrade, data.targetGrade) || data.targetLanguage) return undefined;
  return "Choose the Indian language at the new school, or Not decided yet";
}

export const SUBJECTS_INCOMPLETE_MESSAGE = "Answer every subject: pick a level, or mark it as not taken";

export const previousSchoolingFields = {
  previouslyStudiedInIndia: z.string(),
  educationHistory: z.array(z.custom<EducationHistoryEntry>()),
};

/** "Attended an Indian school before?" must be answered; a Yes needs at least
 * one prior school with every field filled. */
export function checkPreviousSchooling(
  data: { previouslyStudiedInIndia?: string; educationHistory?: EducationHistoryEntry[] },
  ctx: z.RefinementCtx
) {
  if (data.previouslyStudiedInIndia !== "yes" && data.previouslyStudiedInIndia !== "no") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please answer Yes or No", path: ["previouslyStudiedInIndia"] });
    return;
  }
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
