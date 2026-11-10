import type { EducationHistoryEntry } from "./EducationHistoryList";

// Grades for the prior schools a child attended in India (EducationHistoryList).

const KG = "KG";

/** Orders KG before Grade 1. */
export const gradeRank = (grade: string) => (grade === KG ? 0 : parseInt(grade, 10) || 0);

/** The grades a prior school can cover: those before the current grade, from
 * KG (so a Grade 1 child who went to KG in India can still answer). Grades
 * 1-12 when the current grade isn't known yet. */
export const priorGradeOptions = (currentGrade?: string): { value: string; label: string }[] => {
  const current = parseInt(currentGrade || "", 10);
  const last = current >= 1 ? Math.min(current - 1, 12) : 12;
  return [
    { value: KG, label: "KG" },
    ...Array.from({ length: last }, (_, i) => ({ value: String(i + 1), label: `Grade ${i + 1}` })),
  ];
};

export const EMPTY_EDUCATION_ENTRY: EducationHistoryEntry = { fromGrade: "", toGrade: "", country: "India", curriculum: "" };
