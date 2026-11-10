import { useEffect } from "react";

/**
 * While `active`, closing the tab (or reloading it) shows the browser's own
 * "Leave site? Changes you made may not be saved." question. The assessment
 * answers live in this tab's sessionStorage only, so closing the tab loses
 * them; a reload brings them back (see lib/assessmentDraft.ts), but browsers
 * can't tell the two apart, so both ask. Browsers show their own wording.
 */
export function useLeaveWarning(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Still needed by some browsers to show the question.
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);
}
