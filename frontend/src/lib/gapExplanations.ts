/**
 * Gap explanation + IB concept reference helpers (UI-only, no backend changes).
 *
 * Used by the Transition Readiness Report to explain WHY a topic appears as a
 * gap and to provide concept-based references for IB target curricula
 * (where NCERT chapter links are not appropriate).
 */

/**
 * Generate a short, parent-friendly reason explaining why a topic shows as a
 * gap when transitioning from the student's current curriculum to the
 * Indian-aligned target board.
 */
export function getGapReason(topic: string, subject: string): string {
  const t = topic.toLowerCase();
  const s = subject.toLowerCase();

  if (/hindi|sanskrit|regional/.test(t) || /hindi|sanskrit/.test(s)) {
    return "Indian boards introduce a second/third language from early grades — this is typically not part of US curricula.";
  }
  if (/civics|constitution|democracy|federalism|parliament|panchayat/.test(t)) {
    return "Indian civics emphasises the Indian Constitution, governance and democratic institutions, which differ from US social studies coverage.";
  }
  if (/history|freedom|colonial|mughal|maurya|ancient india/.test(t)) {
    return "Indian history modules focus on Indian civilisations and the freedom movement, which are not covered in US history.";
  }
  if (/geography|monsoon|himalaya|peninsular|river systems/.test(t)) {
    return "Indian geography covers India-specific physical and human geography in greater depth than US curricula.";
  }
  if (/trigonometry|quadratic|algebra|calculus|geometry|fractions|integers|rational/.test(t) || /math/.test(s)) {
    return "This topic appears earlier or is emphasized more in the Indian curriculum compared to the student's current curriculum.";
  }
  if (/chemistry|physics|biology|chemical|reaction|cell|tissue|electricity/.test(t) || /science/.test(s)) {
    return "Indian science introduces this concept earlier and with greater theoretical depth than typical US grade-level coverage.";
  }
  return "This topic appears earlier or is emphasized more in the Indian curriculum compared to the student's current curriculum.";
}

/** True when the user's transition pathway targets IB schools. */
export function isIBTarget(targetGoal?: string): boolean {
  if (!targetGoal) return false;
  return /\bib\b|international\s*baccalaureate/i.test(targetGoal);
}
