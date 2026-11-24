// The student form's "What makes you nervous?" answer (tracker T72), from the
// frontend's WrapUpStep. The student ticks any of the worries below, or "Not
// really nervous". The report answers the worries in a short reply to the
// student ("About what makes you nervous"); they don't change the gap analysis.

/** Labels exactly as the form shows them. "Not really nervous" is not a worry. */
export const WORRY_OPTIONS = ["New subjects", "Different tests", "New language", "Making friends", "Everything feels new"] as const;
export type Worry = typeof WORRY_OPTIONS[number];

/** Allow-listed worries in the form's order, or undefined when there are none. */
export function sanitizeWorries(raw: unknown): Worry[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const picked = WORRY_OPTIONS.filter((w) => raw.includes(w));
  return picked.length ? picked : undefined;
}

/** The prompt lines telling the model what the student is nervous about. */
export function worriesPromptSection(worries: Worry[] | undefined): string {
  if (!worries?.length) return "";
  return `
**WHAT THE STUDENT SAYS MAKES THEM NERVOUS ABOUT THE MOVE (ticked on the form):** ${worries.join(", ")}
Answer these only in "worriesResponse". Do not change the gap analysis, scores or plan because of them.
`;
}

/** The extra JSON field the model fills in when there are worries. */
export function worriesJsonField(worries: Worry[] | undefined): string {
  if (!worries?.length) return "";
  return `,
  "worriesResponse": "<3-4 short sentences, max 80 words, written to the student as 'you': say these feelings are normal for a move, then give one practical, specific tip for each worry ticked (for new subjects, tests or a new language, point to the plan in this report). Warm, calm and encouraging. No names, no clinical or medical words.>"`;
}

/** Keeps the model's reply only when the form had worries, as plain text of a sensible length. */
export function cleanWorriesResponse(reply: unknown, worries: Worry[] | undefined): string | undefined {
  if (!worries?.length || typeof reply !== "string") return undefined;
  const text = reply.trim();
  return text ? text.slice(0, 700) : undefined;
}
