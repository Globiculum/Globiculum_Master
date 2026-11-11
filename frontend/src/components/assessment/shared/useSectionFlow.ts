import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

// One section at a time on the Academic Path step of both assessments (core
// subjects, electives, courses, languages, performance, activities): which
// section is open, and moving between them.

interface SectionFlowOptions<T extends string> {
  /** The sections this child gets, in order. */
  sections: T[];
  /** Whether a section's required answers are in (optional sections: always). */
  isComplete: (id: T) => boolean;
  /** True while the subject lists load: the opening section is chosen after. */
  loading: boolean;
  /** Bumped by each failed Continue. */
  validationAttempt: number;
  /** The section a failed Continue should open, read when the attempt changes. */
  sectionWithError: () => T | null;
  /** The page's Continue, for Next on the last section. */
  onContinue?: () => void;
}

export function useSectionFlow<T extends string>({ sections, isComplete, loading, validationAttempt, sectionWithError, onContinue }: SectionFlowOptions<T>) {
  const shouldReduceMotion = useReducedMotion() ?? false;

  // Opens where the user left off: the first section still missing a required
  // answer, or the first section when all are in. Chosen once the subject
  // lists have loaded, so it isn't decided on an empty list.
  const firstOpen = sections.find((id) => !isComplete(id)) ?? sections[0];
  const [chosen, setChosen] = useState<T | null>(() => (loading ? null : firstOpen));
  useEffect(() => {
    if (chosen === null && !loading) setChosen(firstOpen);
  }, [chosen, loading, firstOpen]);
  const active: T | null = chosen === null ? null : sections.includes(chosen) ? chosen : sections[0];
  const activeIndex = active ? sections.indexOf(active) : -1;

  // A failed Continue opens the first section with a missing answer.
  useLayoutEffect(() => {
    if (validationAttempt === 0) return;
    const target = sectionWithError();
    if (target) setChosen(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the attempt, not on every answer
  }, [validationAttempt]);

  // Keeps the section chips in view when a section changes further down the
  // page. The site header is sticky (64px), so "out of view" starts below it.
  const chipsRef = useRef<HTMLDivElement>(null);
  const goTo = (id: T) => {
    setChosen(id);
    const top = chipsRef.current?.getBoundingClientRect().top;
    if (top !== undefined && top < 80) {
      chipsRef.current?.scrollIntoView({ behavior: shouldReduceMotion ? "auto" : "smooth", block: "start" });
    }
  };
  // Next on a section's last card: the next section, or after the last one the
  // page's Continue (validates the step and moves on).
  const goNext = () => {
    if (activeIndex >= sections.length - 1) onContinue?.();
    else goTo(sections[activeIndex + 1]);
  };
  const goPrev = activeIndex > 0 ? () => goTo(sections[activeIndex - 1]) : undefined;

  return { active, activeIndex, goTo, goNext, goPrev, chipsRef };
}
