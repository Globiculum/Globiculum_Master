/**
 * Syllabus reference utilities (no hardcoded links).
 * All resource URLs come from AI-generated report content only.
 */

/**
 * Returns the recommendation text as plain parts with no URL injection.
 * Previously this performed keyword-to-URL matching; that logic has been removed.
 */
export function parseRecommendationWithLinks(
  text: string
): Array<{ type: "text" | "link"; content: string; url?: string }> {
  return [{ type: "text", content: text }];
}
