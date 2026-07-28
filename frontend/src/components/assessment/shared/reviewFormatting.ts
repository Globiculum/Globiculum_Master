// Formatting helpers shared by both Review steps (ParentStep5.tsx,
// StudentReviewStep.tsx) so the read-only summary renders identically
// across both flows.

export const prettify = (value: string) =>
  value ? value.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

export const targetGradeLabel = (targetGrade: string, snapshotGrade: string) => {
  const current = parseInt(snapshotGrade, 10);
  if (targetGrade === "same") return Number.isFinite(current) ? `Same Grade (Grade ${current})` : "Same Grade";
  if (targetGrade === "next") return Number.isFinite(current) ? `Next Grade (Grade ${current + 1})` : "Next Grade";
  return "—";
};

/** Array of raw values -> "A, B, C", or "—" when empty. */
export const joinList = (values: string[]) => (values.length > 0 ? values.join(", ") : "—");

/** Array of raw values, each passed through `prettify` -> "A, B, C", or "—" when empty. */
export const joinPrettyList = (values: string[]) => (values.length > 0 ? values.map(prettify).join(", ") : "—");

/** Record<string,string> -> "Key: Value, Key: Value", or "—" when empty. */
export const joinRecord = (record: Record<string, string>) => {
  const entries = Object.entries(record).filter(([, value]) => Boolean(value));
  return entries.length > 0 ? entries.map(([key, value]) => `${key}: ${prettify(value)}`).join(", ") : "—";
};
