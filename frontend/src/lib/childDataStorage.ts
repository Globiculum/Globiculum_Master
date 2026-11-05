import { supabase } from "@/integrations/supabase/client";

/**
 * Browser storage keys that hold a child's assessment answers or report.
 * Kept in sessionStorage only, so they disappear when the tab closes; they are
 * also cleared on sign-out (see installChildDataCleanup). Add any new key that
 * stores child data here.
 */
export const CHILD_DATA_SESSION_KEYS = [
  "assessment-form-data",   // submitAssessment.ts, ReportPreview.tsx
  "assessment-draft",       // lib/assessmentDraft.ts: answers saved while the form is filled
  "saved-report-analysis",  // ReportPreview.tsx
  "saved-report-id",        // ReportPreview.tsx
  "globiculum-selected-persona", // BeginJourney.tsx, ReportPreview.tsx
] as const;

// Earlier versions also wrote the full form to localStorage, where it outlived
// the tab and the sign-out.
const LEGACY_LOCAL_KEYS = ["assessment-form-data"];

export function clearChildData(): void {
  try {
    CHILD_DATA_SESSION_KEYS.forEach((key) => sessionStorage.removeItem(key));
    LEGACY_LOCAL_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage can be unavailable (private mode, blocked site data); nothing to clear then.
  }
}

/**
 * Router state that carries a child's answers or report (report-preview,
 * retake) lives in browser history, which sign-out cannot clear: after parent
 * A signs out and parent B signs in in the same tab, Back would reopen A's
 * child. Such state is tagged with the user it was created for and is only
 * used by that user.
 */
export function withOwner<T extends object>(state: T, ownerId: string | undefined): T & { ownerId?: string } {
  return { ...state, ownerId };
}

export function isOwnedBy(state: unknown, userId: string | undefined): boolean {
  return !!userId && typeof state === "object" && state !== null && (state as { ownerId?: unknown }).ownerId === userId;
}

/**
 * Called once at startup. Removes child data left in localStorage by older
 * versions, and clears child data on every sign-out: the Header button,
 * password reset, an expired session, or a refresh token that failed.
 */
export function installChildDataCleanup(): void {
  try {
    LEGACY_LOCAL_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    // See clearChildData.
  }
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") clearChildData();
  });
}
