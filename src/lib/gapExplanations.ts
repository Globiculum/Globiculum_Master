/**
 * Gap explanation + IB concept reference helpers (UI-only, no backend changes).
 *
 * Used by the Transition Readiness Report to explain WHY a topic appears as a
 * gap and to provide concept-based references for IB target curricula
 * (where NCERT chapter links are not appropriate).
 */

export interface ConceptReference {
  url: string;
  label: string;
}

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

// ──────────────────────────────────────────────────────────────
// IB concept-based references (no NCERT links for IB targets)
// ──────────────────────────────────────────────────────────────

const IB_CONCEPT_MAP: Array<{ pattern: RegExp; ref: ConceptReference }> = [
  // Math
  { pattern: /algebra|equation|polynomial/i, ref: { url: "https://www.ibo.org/programmes/middle-years-programme/curriculum/mathematics/", label: "IB MYP Mathematics – Algebra (concept-based)" } },
  { pattern: /geometry|trigonometry|triangle|circle/i, ref: { url: "https://www.ibo.org/programmes/middle-years-programme/curriculum/mathematics/", label: "IB MYP Mathematics – Geometry & Trigonometry" } },
  { pattern: /calculus|derivative|integral|limit/i, ref: { url: "https://www.ibo.org/programmes/diploma-programme/curriculum/mathematics/", label: "IB DP Mathematics – Calculus (concept-based)" } },
  { pattern: /statistic|probability|data/i, ref: { url: "https://www.ibo.org/programmes/diploma-programme/curriculum/mathematics/", label: "IB DP Mathematics – Statistics & Probability" } },
  { pattern: /math|number|fraction|decimal|integer/i, ref: { url: "https://www.ibo.org/programmes/middle-years-programme/curriculum/mathematics/", label: "IB MYP Mathematics – Conceptual Understanding" } },
  // Sciences
  { pattern: /physics|motion|force|energy|electric|magnet/i, ref: { url: "https://www.ibo.org/programmes/diploma-programme/curriculum/sciences/physics/", label: "IB Sciences – Physics (concept-based)" } },
  { pattern: /chemistry|chemical|atom|molecule|acid|reaction/i, ref: { url: "https://www.ibo.org/programmes/diploma-programme/curriculum/sciences/chemistry/", label: "IB Sciences – Chemistry (concept-based)" } },
  { pattern: /biology|cell|tissue|organism|gene|ecosystem/i, ref: { url: "https://www.ibo.org/programmes/diploma-programme/curriculum/sciences/biology/", label: "IB Sciences – Biology (concept-based)" } },
  { pattern: /science/i, ref: { url: "https://www.ibo.org/programmes/middle-years-programme/curriculum/sciences/", label: "IB MYP Sciences – Inquiry & Concepts" } },
  // Language & Humanities
  { pattern: /english|language|literature|reading|writing|grammar/i, ref: { url: "https://www.ibo.org/programmes/middle-years-programme/curriculum/language-and-literature/", label: "IB Language & Literature – Concept-based Approach" } },
  { pattern: /history|civics|geography|social|economics|political/i, ref: { url: "https://www.ibo.org/programmes/middle-years-programme/curriculum/individuals-and-societies/", label: "IB Individuals & Societies – Inquiry-based Learning" } },
];

export function getIBConceptReference(topic: string, subject: string): ConceptReference {
  const text = `${topic} ${subject}`;
  for (const entry of IB_CONCEPT_MAP) {
    if (entry.pattern.test(text)) return entry.ref;
  }
  return {
    url: "https://www.ibo.org/programmes/",
    label: "IB Programmes – Concept-based Learning",
  };
}

/** True when the user's transition pathway targets IB schools. */
export function isIBTarget(targetGoal?: string): boolean {
  if (!targetGoal) return false;
  return /\bib\b|international\s*baccalaureate/i.test(targetGoal);
}
