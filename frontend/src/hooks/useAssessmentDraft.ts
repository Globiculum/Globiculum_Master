import { useAuth } from "@/hooks/useAuth";
import { clearDraft, draftMatches, readDraft, type DraftPersona } from "@/lib/assessmentDraft";

/**
 * The saved answers to restore into an assessment form after a refresh (see
 * lib/assessmentDraft.ts).
 *
 * Read on every render rather than once, so a form opened again in the same
 * visit (e.g. after "Change persona") gets the latest save; the form itself
 * only reads it when it mounts. `pending` is true while the session is still
 * being checked and a draft exists, so the form isn't mounted empty and then
 * left that way. `startOver` discards the draft.
 */
export const useAssessmentDraft = (persona: DraftPersona, prevReportId: string | undefined) => {
  const { session, loading } = useAuth();
  const userId = session?.user.id;
  const stored = readDraft();

  return {
    pending: loading && stored?.persona === persona,
    draft: !loading && draftMatches(stored, persona, userId, prevReportId) ? stored : null,
    userId,
    startOver: clearDraft,
  };
};
