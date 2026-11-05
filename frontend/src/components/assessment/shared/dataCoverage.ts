import { entryGrade } from "@/hooks/useCurriculumSubjects";

// Which School Profile choices the report has curriculum data for. Choices
// without data are shown faded and can't be picked (the same way the country
// card shows "Coming Soon"), so no report is built on AI guesswork alone.
// Checked against the live curriculum_nodes table on 5 Nov 2026; update it when
// a curriculum or class is loaded. The backend side is CURRICULUM_DB_REGISTRY,
// mapToDBEntry and resolveSourceCurriculum in
// supabase/functions/_shared/curriculumGaps.ts.

// Current curriculum: "Regular U.S." is compared with the state's own standards
// (51 states loaded); "Honors / Advanced" uses the same standards, taught
// faster. IB, Cambridge, Montessori, A-Levels, AP Track and Other match no data
// (AP courses are picked in the Academic Path step, on top of the state's).
const CURRENT_CURRICULA_WITH_DATA = new Set(["regular-us", "honors-advanced"]);

export const currentCurriculumHasData = (value: string): boolean => CURRENT_CURRICULA_WITH_DATA.has(value);

// Target board -> classes with data. CBSE: NCERT Classes 1-12. ICSE: the CISCE
// ICSE syllabus for Classes 9-10 and ISC for 11-12; there is no CISCE syllabus
// for Classes 1-8 in the data. IB and Cambridge aren't loaded yet.
const BOARD_CLASSES: Record<string, { from: number; to: number }> = {
  cbse: { from: 1, to: 12 },
  icse: { from: 9, to: 12 },
};

/** Whether the board has data for this class. */
export function boardHasDataForClass(board: string, cls: number | undefined): boolean {
  const range = BOARD_CLASSES[(board || "").toLowerCase()];
  return !!range && cls !== undefined && cls >= range.from && cls <= range.to;
}

/** Whether "Same Grade" / "Next Grade" lands on a class the board has data for. */
export function targetGradeHasData(board: string, snapshotGrade: string, targetGrade: string): boolean {
  return boardHasDataForClass(board, entryGrade(snapshotGrade, targetGrade));
}

/**
 * Whether the board can be picked: it has data for the current class or the
 * next one (same / next is asked after the board). Before a grade is known,
 * any loaded board counts.
 */
export function boardHasData(board: string, snapshotGrade: string): boolean {
  if (entryGrade(snapshotGrade, "same") === undefined) return !!BOARD_CLASSES[(board || "").toLowerCase()];
  return targetGradeHasData(board, snapshotGrade, "same") || targetGradeHasData(board, snapshotGrade, "next");
}

/** Short line under a board: "Available", "Classes 9-12" (partly covered), or "Coming Soon". */
export function boardCoverageNote(board: string, snapshotGrade: string): string {
  const range = BOARD_CLASSES[(board || "").toLowerCase()];
  if (!range) return "Coming Soon";
  const full =
    entryGrade(snapshotGrade, "same") === undefined ||
    (targetGradeHasData(board, snapshotGrade, "same") && targetGradeHasData(board, snapshotGrade, "next"));
  return full ? "Available" : `Classes ${range.from}-${range.to}`;
}

/**
 * After the grade or board is edited from the summary: the card whose saved
 * answer now has no data (Grade 9 -> 7 on ICSE: the board; Grade 9 -> 8: same /
 * next), so the wizard can ask it again instead of failing on Continue.
 */
export function coverageCardToFix(snapshotGrade: string, board: string, targetGrade: string): "targetBoard" | "targetGrade" | null {
  if (!board) return null;
  if (!boardHasData(board, snapshotGrade)) return "targetBoard";
  if (targetGrade && !targetGradeHasData(board, snapshotGrade, targetGrade)) return "targetGrade";
  return null;
}

const BOARD_NAMES: Record<string, string> = { cbse: "CBSE", icse: "ICSE", ib: "IB", "cambridge-igcse": "Cambridge" };

/**
 * Errors for saved choices that have no data (a draft or a retake can carry
 * one from before these options were faded); empty when every choice is fine.
 */
export function dataCoverageErrors(data: {
  currentCurriculum?: string[];
  snapshotGrade?: string;
  targetGoal?: string;
  targetGrade?: string;
}): { field: "currentCurriculum" | "targetGoal" | "targetGrade"; message: string }[] {
  const errors: { field: "currentCurriculum" | "targetGoal" | "targetGrade"; message: string }[] = [];
  const curriculum = data.currentCurriculum?.[0];
  if (curriculum && !currentCurriculumHasData(curriculum)) {
    errors.push({ field: "currentCurriculum", message: "We don't have data for this curriculum yet. Choose one that isn't faded." });
  }
  const board = (data.targetGoal || "").toLowerCase();
  const grade = data.snapshotGrade || "";
  if (!board) return errors;
  const name = BOARD_NAMES[board] ?? data.targetGoal;
  const range = BOARD_CLASSES[board];
  if (!boardHasData(board, grade)) {
    errors.push({
      field: "targetGoal",
      message: range ? `${name} is available for Classes ${range.from}-${range.to}. Choose another board.` : `${name} isn't available yet. Choose another board.`,
    });
  } else if (data.targetGrade && !targetGradeHasData(board, grade, data.targetGrade)) {
    const cls = entryGrade(grade, data.targetGrade);
    const other = data.targetGrade === "same" ? "Next Grade" : "Same Grade";
    errors.push({ field: "targetGrade", message: `${name} isn't available for Class ${cls}. Choose ${other}.` });
  }
  return errors;
}
