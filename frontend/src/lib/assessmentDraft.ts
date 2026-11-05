/**
 * The assessment answers saved while a form is being filled, so a refresh
 * brings the user back to the same step with the same answers.
 *
 * Kept in sessionStorage like all child data (see childDataStorage.ts): it
 * lives only in this tab and is cleared on sign-out. A draft comes back only
 * for whoever saved it: the same signed-in account, or, for a draft saved
 * while signed out, only while the tab is still signed out (signing in starts
 * a new form).
 */

export type DraftPersona = "parent" | "student";

export const ASSESSMENT_DRAFT_KEY = "assessment-draft";

export interface AssessmentDraft {
  persona: DraftPersona;
  /** Signed-in user who saved it; null when saved while signed out. */
  ownerId: string | null;
  /** Set when the draft belongs to a retake of this saved report. */
  prevReportId: string | null;
  step: number;
  formData: Record<string, unknown>;
  savedAt: number;
}

export function saveDraft(draft: Omit<AssessmentDraft, "savedAt">): void {
  try {
    sessionStorage.setItem(ASSESSMENT_DRAFT_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    // Storage full or blocked (private mode): the form still works, it just isn't kept.
  }
}

export function readDraft(): AssessmentDraft | null {
  try {
    const raw = sessionStorage.getItem(ASSESSMENT_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AssessmentDraft>;
    const valid =
      (parsed.persona === "parent" || parsed.persona === "student") &&
      typeof parsed.step === "number" &&
      !!parsed.formData &&
      typeof parsed.formData === "object";
    if (!valid) return null;
    return {
      persona: parsed.persona!,
      ownerId: typeof parsed.ownerId === "string" ? parsed.ownerId : null,
      prevReportId: typeof parsed.prevReportId === "string" ? parsed.prevReportId : null,
      step: parsed.step!,
      formData: parsed.formData as Record<string, unknown>,
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : 0,
    };
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    sessionStorage.removeItem(ASSESSMENT_DRAFT_KEY);
  } catch {
    // See saveDraft.
  }
}

/**
 * Whether this draft may be restored into the given form: same form, same
 * person (see the file comment), and a retake only takes the draft saved for
 * the same report, a new assessment only one that isn't a retake.
 */
export function draftMatches(
  draft: AssessmentDraft | null,
  persona: DraftPersona,
  userId: string | undefined,
  prevReportId: string | undefined
): draft is AssessmentDraft {
  if (!draft || draft.persona !== persona) return false;
  if (draft.prevReportId !== (prevReportId ?? null)) return false;
  return draft.ownerId === (userId ?? null);
}
