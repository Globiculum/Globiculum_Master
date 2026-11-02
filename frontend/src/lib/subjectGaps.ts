/**
 * Gap items in a saved analysis and the per-subject lists built from them.
 * Used by SubjectGapList (the subject cards in ReportPreview and ReportView).
 */

export type GapSeverity = "CRITICAL" | "MAJOR" | "MODERATE";
export type GapItem =
  | string
  | { topic: string; resourceUrl?: string; subject?: string; reason?: string; grade?: number; severity?: GapSeverity };

const norm = (s: string | undefined) => (s ?? "").toLowerCase().trim();
export const topicOf = (g: GapItem) => (typeof g === "string" ? g : g.topic);

/** keyGaps plus, for older reports, this subject's CRITICAL gaps that keyGaps didn't hold. */
export function subjectGapItems(subject: string, keyGaps: GapItem[], criticalGaps: GapItem[]): GapItem[] {
  const seen = new Set(keyGaps.map((g) => norm(topicOf(g))));
  const extra: GapItem[] = [];
  for (const g of criticalGaps) {
    if (typeof g === "string" || norm(g.subject) !== norm(subject)) continue;
    // A language's one-line summary uses the subject as its topic (see languageStartNote).
    if (norm(g.topic) === norm(subject) || seen.has(norm(g.topic))) continue;
    seen.add(norm(g.topic));
    extra.push({ ...g, severity: g.severity ?? "CRITICAL" });
  }
  return [...keyGaps, ...extra];
}

/** Where to start, for a language the student has never studied (Hindi, Sanskrit). */
export function languageStartNote(subject: string, criticalGaps: GapItem[]): string | undefined {
  const g = criticalGaps.find((c) => typeof c !== "string" && norm(c.topic) === norm(subject));
  return g && typeof g !== "string" ? g.reason : undefined;
}
