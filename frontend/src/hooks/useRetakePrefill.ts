import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/**
 * Retake data (a saved report's answers) for the public assessment routes.
 *
 * Reports History passes it in router state, which lives in browser history
 * and survives sign-out: after signing out, Back would reopen the wizard
 * pre-filled with the child's answers. It is only handed over to a signed-in
 * user. `pending` is true while the session is still being checked, so the
 * wizard isn't mounted without its prefill on a real retake (it reads the
 * prefill once, on mount).
 */
export const useRetakePrefill = () => {
  const location = useLocation();
  const { session, loading } = useAuth();
  const state = location.state as { prefillFormData?: Record<string, unknown>; prevReportId?: string } | null;
  const hasPrefill = Boolean(state?.prefillFormData);
  const allowed = hasPrefill && !!session;

  return {
    pending: hasPrefill && loading,
    prefillFormData: allowed ? state?.prefillFormData : undefined,
    prevReportId: allowed ? state?.prevReportId : undefined,
  };
};
