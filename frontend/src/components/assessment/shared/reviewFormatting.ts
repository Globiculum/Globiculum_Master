// Formatting helpers shared by both Review steps (ParentStep5.tsx,
// StudentReviewStep.tsx) so the read-only summary renders identically
// across both flows.

export const prettify = (value: string) =>
  value ? value.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

export const targetGradeLabel = (targetGrade: string, snapshotGrade: string) => {
  const current = parseInt(snapshotGrade, 10);
  if (targetGrade === "same") return Number.isFinite(current) ? `Same Grade (Grade ${current})` : "Same Grade";
  if (targetGrade === "next") return Number.isFinite(current) ? `Next Grade (Grade ${current + 1})` : "Next Grade";
  return "—";
};

/** Array of raw values -> "A, B, C", or "—" when empty. */
export const joinList = (values: string[]) => (values.length > 0 ? values.join(", ") : "—");

/** Array of raw values, each passed through `prettify` -> "A, B, C", or "—" when empty. */
export const joinPrettyList = (values: string[]) => (values.length > 0 ? values.map(prettify).join(", ") : "—");

/** Record<string,string> -> "Key: Value, Key: Value", or "—" when empty. */
export const joinRecord = (record: Record<string, string>) => {
  const entries = Object.entries(record).filter(([, value]) => Boolean(value));
  return entries.length > 0 ? entries.map(([key, value]) => `${key}: ${prettify(value)}`).join(", ") : "—";
};

const US_STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "District of Columbia",
};

// Mirrors the option labels in ParentSchoolProfileWizard.tsx / StudentProfileWizard.tsx
// — kept here too since the Review step reads the raw stored value directly
// rather than through those wizards' own option lists.
const CURRICULUM_LABELS: Record<string, string> = {
  "regular-us": "Regular U.S. school curriculum",
  "ib-pyp": "IB Primary Years Programme",
  "ib-myp": "IB Middle Years Programme",
  "ib-dp": "IB DP",
  "cambridge-primary": "Cambridge Primary",
  "cambridge-lower": "Cambridge Lower Secondary",
  "cambridge-igcse": "Cambridge IGCSE",
  "honors-advanced": "Honors / Advanced Program",
  "montessori": "Montessori Curriculum",
  "ap": "AP Track (Advanced Placement)",
  "a-levels": "A-Levels",
};

/**
 * Resolves a stored currentCurriculum value to a parent/student-facing
 * label. Never shows the raw DB-facing value ("regular-us") — for a US
 * student with a known state it becomes "{State} State Curriculum" (matching
 * what the curriculum step itself displays); for anything else it falls back
 * to the known display name, then prettify().
 */
export const curriculumLabel = (value: string, usState?: string): string => {
  if (value === "regular-us" && usState && US_STATE_NAMES[usState.toUpperCase()]) {
    return `${US_STATE_NAMES[usState.toUpperCase()]} State Curriculum`;
  }
  return CURRICULUM_LABELS[value] || prettify(value);
};
