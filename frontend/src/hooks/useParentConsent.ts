import { useCallback, useEffect, useState } from "react";
import { getParentConsent, recordParentConsent } from "@/lib/parentConsent";

export type ParentConsentState = "checking" | "needed" | "given";

/**
 * Whether the signed-in parent still has to agree on the "Before we begin"
 * card. Checked again when the account changes (same-tab user switch). When
 * the check fails, the card shows: agreeing then saves the record, so nobody
 * starts the form without one on file.
 */
export function useParentConsent(userId: string | undefined) {
  const [state, setState] = useState<{ userId: string | undefined; value: ParentConsentState }>({ userId, value: "checking" });

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setState({ userId, value: "checking" });
    getParentConsent()
      .then((s) => active && setState({ userId, value: s.granted ? "given" : "needed" }))
      .catch(() => active && setState({ userId, value: "needed" }));
    return () => {
      active = false;
    };
  }, [userId]);

  /** Saves the agreement; false when it couldn't be saved (the card says so). */
  const agree = useCallback(async () => {
    try {
      const s = await recordParentConsent();
      if (!s.granted) return false;
      setState({ userId, value: "given" });
      return true;
    } catch {
      return false;
    }
  }, [userId]);

  // A result for another account (or none yet) still counts as checking.
  const value: ParentConsentState = !userId || state.userId !== userId ? "checking" : state.value;
  return { state: value, agree };
}
