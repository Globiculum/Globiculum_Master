import { useEffect, useRef } from "react";

// After a failed Continue click, scrolls to and focuses the first invalid
// field on the page (QuestionCard/SectionContainer mark themselves with
// data-field-invalid="true" when given an error). Query order follows DOM
// order, which matches visual/reading order regardless of which field the
// validation schema happened to flag first.
//
// Keyed off a monotonically increasing "attempt" counter (bumped only when
// a Continue click actually fails), not off the errors object itself —
// clearing individual field errors as the user fixes them must not
// re-trigger a scroll/focus jump.
export function useScrollToFirstInvalidField(attempt: number) {
  const lastHandled = useRef(0);

  useEffect(() => {
    if (attempt === 0 || attempt === lastHandled.current) return;
    lastHandled.current = attempt;

    const el = document.querySelector<HTMLElement>('[data-field-invalid="true"]');
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.focus({ preventScroll: true });
  }, [attempt]);
}
