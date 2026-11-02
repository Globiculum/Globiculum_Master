/**
 * Visual language of the Report Preview page (Globiculum product layer:
 * Academic Teal base, calm and credible). Shared by the components in
 * components/report/.
 *
 * Colour roles, from the Arna Intelligence palette:
 *   Deep Navy (primary)        headings, body text, the report header band
 *   Academic Teal (secondary)  the one accent: progress, links, active states;
 *                              small teal text uses secondary-contrast (AA)
 *   Warm Amber (accent)        subjects below 70% aligned, a plan longer than
 *                              the time before the move
 *   Indigo (violet), Mint      supporting tints for cards and plan phases;
 *                              indigo also marks AI-generated content
 *   Slate (muted-foreground)   secondary text, dividers
 */

export type AlignmentLevel = "strong" | "moderate" | "high_gap";

export interface StatusStyle {
  label: string;
  /** One-line meaning, shown in the subject's details. */
  meaning: string;
  badge: string;
  dot: string;
  bar: string;
}

export const SUBJECT_STATUS: Record<AlignmentLevel, StatusStyle> = {
  high_gap: {
    label: "Needs most work",
    meaning: "Most topics are new to your child. Start early and work through them in order.",
    badge: "bg-accent/10 text-accent-contrast ring-accent/30",
    dot: "bg-accent",
    bar: "bg-accent",
  },
  moderate: {
    label: "Moderate prep",
    meaning: "The core ideas carry over, but some content and the exam style will be new.",
    badge: "bg-muted text-foreground/80 ring-border",
    dot: "bg-muted-foreground",
    bar: "bg-secondary",
  },
  strong: {
    label: "Light review",
    meaning: "Concepts transfer well. Close the few gaps with light, regular practice.",
    badge: "bg-secondary/10 text-secondary-contrast ring-secondary/25",
    dot: "bg-secondary",
    bar: "bg-secondary",
  },
};

/**
 * Subject card badges, as in the earlier report design: "77% Align" (solid,
 * teal from 70%, amber below), then coverage and pace. Both relabel the
 * existing alignmentLevel; "Coverage" because it's computed from topics
 * covered, not the confidence the parent reported.
 */
export const alignBadgeClass = (percentage: number) => (percentage >= 70 ? "bg-secondary text-white" : "bg-accent text-white");

export const SUBJECT_COVERAGE: Record<AlignmentLevel, { label: string; badge: string }> = {
  strong: { label: "High Coverage", badge: "bg-secondary/10 text-secondary-contrast border border-secondary/25" },
  moderate: { label: "Medium Coverage", badge: "bg-accent/10 text-accent-contrast border border-accent/25" },
  high_gap: { label: "Low Coverage", badge: "bg-accent/10 text-accent-contrast border border-accent/25" },
};

export const SUBJECT_PACE: Record<AlignmentLevel, { label: string; badge: string }> = {
  strong: { label: "Quick Review", badge: "bg-violet/10 text-primary border border-violet/25" },
  moderate: { label: "Moderate Prep", badge: "bg-accent/10 text-accent-contrast border border-accent/25" },
  high_gap: { label: "Extended Prep", badge: "bg-accent/10 text-accent-contrast border border-accent/25" },
};

/** Dot colours for the Alignment by Subject chart, in brand order. */
export const SUBJECT_DOT = ["bg-secondary", "bg-accent", "bg-mint", "bg-violet", "bg-primary", "bg-destructive"];

/** One-line headline for the overall readiness score. */
export function readinessVerdict(percentage: number): string {
  if (percentage >= 75) return "Mostly ready, with a few gaps to close";
  if (percentage >= 50) return "Moderate gaps to bridge before the move";
  return "Significant gaps to bridge before the move";
}

/** In-page sections, in order; ids are the scroll targets. */
export const REPORT_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "subjects", label: "Subjects" },
  { id: "plan", label: "Plan" },
  { id: "this-week", label: "This week" },
  { id: "questions", label: "Questions" },
] as const;
