import { entryGrade } from "@/hooks/useCurriculumSubjects";

// "Which Indian language at the new school?" — asked inside Language Exposure
// for Classes 6-10 of an Indian board. The report scores only the chosen
// language (filterIndianLanguages in supabase/functions/_shared/curriculumGaps.ts);
// "Not decided yet" scores Hindi and notes that Sanskrit was left out.
// Below Class 6 NCERT teaches Hindi only, and our data has no Hindi or
// Sanskrit for Classes 11-12, so it isn't asked there.

export type NewSchoolLanguage = "hindi" | "sanskrit" | "both" | "undecided";

export const NEW_SCHOOL_LANGUAGE_OPTIONS: { value: NewSchoolLanguage; label: string }[] = [
  { value: "hindi", label: "Hindi" },
  { value: "sanskrit", label: "Sanskrit" },
  { value: "both", label: "Both" },
  { value: "undecided", label: "Not decided yet" },
];

const INDIAN_BOARDS = new Set(["cbse", "icse", "ncert", "state-board"]);

/** The class the student enters when the question applies, otherwise null. */
export function newSchoolLanguageGrade(targetGoal: string, snapshotGrade: string, targetGrade: string): number | null {
  const grade = entryGrade(snapshotGrade, targetGrade);
  if (!INDIAN_BOARDS.has((targetGoal || "").toLowerCase()) || !grade || grade < 6 || grade > 10) return null;
  return grade;
}

/** Pre-selected from the Indian languages the student already knows. */
export function suggestedNewSchoolLanguage(knownLanguages: string[]): NewSchoolLanguage | "" {
  const hindi = knownLanguages.includes("Hindi");
  const sanskrit = knownLanguages.includes("Sanskrit");
  return hindi && sanskrit ? "both" : sanskrit ? "sanskrit" : hindi ? "hindi" : "";
}

/** The languages a choice covers ("Not decided yet": none asked). Names match the Indian Languages chips. */
export function schoolLanguages(value: string | undefined): string[] {
  return value === "both" ? ["Hindi", "Sanskrit"] : value === "hindi" ? ["Hindi"] : value === "sanskrit" ? ["Sanskrit"] : [];
}

/**
 * Level for a new-school language the student has never studied. Stored in
 * languageProficiencies like the other levels, but the language stays out of
 * selectedLanguages (the languages the student knows).
 */
export const NEW_TO_LANGUAGE = "new";

/** Levels asked for each language chosen for the new school. */
export const SCHOOL_LANGUAGE_LEVELS = [
  { value: NEW_TO_LANGUAGE, label: "New to it" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "fluent", label: "Fluent" },
];

export function newSchoolLanguageLabel(value: string): string | undefined {
  return NEW_SCHOOL_LANGUAGE_OPTIONS.find((o) => o.value === value)?.label;
}

/** Help text under the question; CBSE is phasing in a third language for Classes 6-10. */
export function newSchoolLanguageHint(targetGoal: string): string {
  const board =
    (targetGoal || "").toLowerCase() === "cbse"
      ? "CBSE is bringing in a third language for Classes 6-10, and many schools choose Sanskrit, so a lot of students now take both."
      : "Schools teach Hindi or Sanskrit, and many teach both.";
  return `${board} The report assesses only what is chosen here.`;
}
