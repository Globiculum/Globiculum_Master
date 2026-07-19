/**
 * Grade baseline topics helper.
 * Hardcoded topic lists have been removed; mergeWithBaseline now returns
 * the AI-generated key gaps unchanged.
 */

export type Board = "cbse" | "icse" | "ib" | "igcse";

export interface BaselineTopic {
  topic: string;
  subjectKey: "math" | "science" | "english" | "social_studies" | "hindi";
}

export interface MergeOptions {
  maxTopics?: number;
}

/**
 * Returns the provided keyGaps as-is (no baseline injection).
 */
export function mergeWithBaseline(
  _grade: number,
  _subject: string,
  keyGaps: string[],
  options: MergeOptions = {}
): string[] {
  const max = options.maxTopics ?? keyGaps.length;
  return keyGaps.slice(0, max);
}
