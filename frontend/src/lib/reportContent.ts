import type { GapItem } from "./subjectGaps";

/**
 * Report text built from the analysis: summary, takeaways, why-start-now,
 * the Action Plan and the parent Q&A. Used by ReportBody, which both the
 * report page and shared links render, so both say the same thing.
 *
 * One priority order is used everywhere (prioritySubjects): before it, the
 * summary named the lowest-% subject, "Why Start Now" the first critical gap
 * and the tutor answer the first high-gap subject, and they disagreed.
 */

type AlignmentLevel = "strong" | "moderate" | "high_gap";

export interface ReportSubject {
  subject: string;
  topicsCovered: number;
  totalTopics: number;
  alignmentLevel: AlignmentLevel;
  keyGaps: GapItem[];
  /** NCERT book codes behind this subject's chapters (analyze-curriculum). */
  textbooks?: string[];
}

export interface ReportAnalysis {
  overallAlignment: { percentage: number; subjectsNeedingBridge?: string[]; estimatedDuration: string };
  subjectAnalysis: ReportSubject[];
  criticalGaps: GapItem[];
  bridgeTimeline: Record<"phase1" | "phase2" | "phase3", { name: string; duration: string; bullets: string[] }>;
  recommendations: { study: string[]; skillStrategy: string[]; culturalLanguage: string[] };
  /** Subjects left out of scoring (a Hindi/Sanskrit not chosen), with the reason. */
  excludedSubjects?: { subject: string; reason: string }[];
}

export interface RankedSubject extends ReportSubject {
  percentage: number;
}

export const subjectPercent = (s: ReportSubject): number =>
  s.totalTopics > 0 ? Math.round((s.topicsCovered / s.totalTopics) * 100) : 0;

const withPercent = (s: ReportSubject): RankedSubject => ({ ...s, percentage: subjectPercent(s) });

/** A card the backend adds when a subject couldn't be assessed (no data), not a finding. */
const isUnassessed = (s: ReportSubject) =>
  s.keyGaps.some((g) => typeof g !== "string" && g.topic === "Assessment unavailable");

/** A language the student has never studied (nothing of it covered). */
export const isNewLanguage = (s: ReportSubject): boolean =>
  /hindi|sanskrit/i.test(s.subject) && s.totalTopics > 0 && s.topicsCovered === 0;

/**
 * Subjects needing work, most urgent first: lowest alignment, then most
 * topics missing. Strongly aligned and unassessed subjects are left out.
 */
export function prioritySubjects(a: ReportAnalysis): RankedSubject[] {
  return a.subjectAnalysis
    .filter((s) => s.alignmentLevel !== "strong" && s.totalTopics > 0 && !isUnassessed(s))
    .map(withPercent)
    .sort((x, y) => x.percentage - y.percentage || (y.totalTopics - y.topicsCovered) - (x.totalTopics - x.topicsCovered));
}

export const joinAnd = (items: string[]): string =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

const subjectNames = (list: ReportSubject[]) => joinAnd(list.map((s) => s.subject));
const withPct = (list: RankedSubject[]) => joinAnd(list.map((s) => `${s.subject} (${s.percentage}%)`));

/** Topics with nothing related in the current coursework; older reports fall back to the critical-gap count. */
export function newContentCount(a: ReportAnalysis): number {
  const gaps = a.subjectAnalysis.flatMap((s) => s.keyGaps);
  const graded = gaps.length > 0 && gaps.every((g) => typeof g !== "string" && g.severity);
  return graded
    ? gaps.filter((g) => typeof g !== "string" && g.severity === "CRITICAL").length
    : a.criticalGaps.length;
}

export const deriveRiskLevel = (percentage?: number): string => {
  if (typeof percentage !== "number" || Number.isNaN(percentage)) return "—";
  if (percentage >= 75) return "Low";
  if (percentage >= 50) return "Medium";
  return "High";
};

// ---------------------------------------------------------------------------
// Planned move vs estimated preparation
// ---------------------------------------------------------------------------

const MOVES: Record<string, { label: string; min: number; max: number }> = {
  "within-3-months": { label: "within 3 months", min: 0, max: 3 },
  "3-6-months": { label: "in 3–6 months", min: 3, max: 6 },
  "6-12-months": { label: "in 6–12 months", min: 6, max: 12 },
  "1-2-years": { label: "in 1–2 years", min: 12, max: 24 },
};

/** Upper end of the estimated preparation ("6-8 months" -> 8); 0 if unknown. */
export const planMonths = (a: ReportAnalysis): number =>
  Math.max(0, ...((a.overallAlignment.estimatedDuration || "").match(/\d+/g) ?? []).map(Number));

export type TimeFit = "enough" | "tight" | "short";

/** How the estimated preparation compares with the planned move; null when either is unknown. */
export function timeFit(a: ReportAnalysis, timeline?: string): { moveLabel: string; fit: TimeFit } | null {
  const move = MOVES[timeline ?? ""];
  const months = planMonths(a);
  if (!move || !months) return null;
  return { moveLabel: move.label, fit: months <= move.min ? "enough" : months <= move.max ? "tight" : "short" };
}

// ---------------------------------------------------------------------------
// Summary, takeaways, why start now
// ---------------------------------------------------------------------------

export function buildExecutiveSummary(
  a: ReportAnalysis,
  targetLabel: string,
  timeline?: string,
  /** false where the timing is shown on its own (the report page's overview facts). */
  includeTiming = true
): string {
  const pct = a.overallAlignment.percentage;
  const duration = a.overallAlignment.estimatedDuration;
  let text = `This assessment shows a ${pct}% readiness score (${deriveRiskLevel(pct)} risk) for ${targetLabel}.`;
  const fit = timeFit(a, timeline);
  if (includeTiming) {
    if (!fit) text += ` Estimated preparation: ${duration}.`;
    else if (fit.fit === "enough") text += ` The estimated ${duration} of preparation fits before the planned move (${fit.moveLabel}).`;
    else if (fit.fit === "tight") text += ` The estimated ${duration} of preparation takes up most of the time before the planned move (${fit.moveLabel}), so starting now matters.`;
    else text += ` The estimated ${duration} of preparation is longer than the time before the planned move (${fit.moveLabel}): start now, and expect to continue after the move.`;
  }
  const top = prioritySubjects(a).slice(0, 2);
  if (top.length > 0) text += ` Start with ${withPct(top)}, the least aligned ${top.length === 1 ? "subject" : "subjects"}.`;
  return text;
}

export function buildKeyTakeaways(a: ReportAnalysis): string[] {
  const subjects = a.subjectAnalysis.filter((s) => s.totalTopics > 0 && !isUnassessed(s));
  const strong = subjects.filter((s) => s.alignmentLevel === "strong");
  const moderate = subjects.filter((s) => s.alignmentLevel === "moderate");
  const newLanguages = subjects.filter(isNewLanguage);
  const highGap = subjects.filter((s) => s.alignmentLevel === "high_gap" && !isNewLanguage(s));
  const bullets: string[] = [];
  const verb = (list: unknown[], one: string, many: string) => (list.length === 1 ? one : many);
  if (strong.length) bullets.push(`${subjectNames(strong)} ${verb(strong, "needs", "need")} only light bridging — already strongly aligned.`);
  if (moderate.length) bullets.push(`${subjectNames(moderate)} ${verb(moderate, "requires", "require")} targeted, moderate preparation.`);
  if (highGap.length) bullets.push(`${subjectNames(highGap)} ${verb(highGap, "needs", "need")} extended preparation — most of ${verb(highGap, "its", "their")} topics are new.`);
  if (newLanguages.length) bullets.push(`${subjectNames(newLanguages)} ${verb(newLanguages, "is", "are")} not taught in the current curriculum, so ${verb(newLanguages, "it starts", "they start")} from the basics.`);
  const n = newContentCount(a);
  if (n > 0) bullets.push(`${n} topic${n === 1 ? " is" : "s are"} entirely new content — start these early.`);
  return bullets;
}

export function buildWhyStartNow(a: ReportAnalysis, timeline?: string): string[] {
  const duration = a.overallAlignment.estimatedDuration;
  const top = prioritySubjects(a).slice(0, 2);
  const points: string[] = [];
  if (top.length > 0) {
    points.push(`${withPct(top)} ${top.length === 1 ? "has" : "have"} the largest gaps — starting there first gives them the most time.`);
  }
  const fit = timeFit(a, timeline);
  if (fit?.fit === "short") points.push(`Preparation (${duration}) is longer than the time before the move (${fit.moveLabel}), so every week of an earlier start counts.`);
  else if (fit?.fit === "tight") points.push(`Preparation (${duration}) takes up most of the time before the move (${fit.moveLabel}).`);
  else points.push(`Starting now keeps the ${duration} plan on track.`);
  points.push("Waiting risks compressing everything into the final weeks.");
  return points;
}

// ---------------------------------------------------------------------------
// Action Plan (T07): each AI recommendation appears once
// ---------------------------------------------------------------------------

export interface ActionItem {
  label: string;
  url?: string;
}

export interface ActionPlan {
  thisWeek: ActionItem[];
  student: string[];
  teacher: string[];
  culture: string[];
}

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

/**
 * "This week": one concrete first step for each of the top three priority
 * subjects, with where to study it. The AI's study, teaching and culture tips
 * follow, each list cleared of repeats and of items already used above
 * (they used to appear in four places).
 */
export function buildActionPlan(
  a: ReportAnalysis,
  firstResource: (subject: string) => { title: string; url: string } | undefined,
  /** The first study link for a gap topic (its chapter, lesson...); without it the link saved in the report is used. */
  topicUrl?: (subject: string, gap: Exclude<GapItem, string>) => string | undefined
): ActionPlan {
  const ranked = prioritySubjects(a);
  // A report where everything is strongly aligned still gets first steps from its remaining gaps.
  const pool = ranked.length > 0 ? ranked : a.subjectAnalysis.filter((s) => s.keyGaps.length > 0).map(withPercent);
  const thisWeek: ActionItem[] = pool.slice(0, 3).map((s) => {
    const resource = firstResource(s.subject);
    if (isNewLanguage(s)) {
      // "(free PDF)" inside brackets read as "...first letters (free PDF))".
      const title = resource?.title.replace(/\s*\(free PDF\)\s*$/i, "");
      return {
        label: `${s.subject}: start with the script and everyday words${title ? ` — ${title}` : ""}`,
        url: resource?.url,
      };
    }
    const gap = s.keyGaps[0];
    const topic = gap ? (typeof gap === "string" ? gap : gap.topic) : undefined;
    const gapUrl = gap && typeof gap !== "string" ? (topicUrl ? topicUrl(s.subject, gap) : gap.resourceUrl) : undefined;
    return {
      label: topic ? `${s.subject}: begin with "${topic}"` : `${s.subject}: review the Class material`,
      url: gapUrl ?? resource?.url,
    };
  });

  const seen = new Set<string>();
  const fresh = (items: string[]) =>
    items.filter((item) => {
      const key = normalise(item);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return {
    thisWeek,
    student: fresh(a.recommendations.study ?? []),
    teacher: fresh(a.recommendations.skillStrategy ?? []),
    culture: fresh(a.recommendations.culturalLanguage ?? []),
  };
}

// ---------------------------------------------------------------------------
// Parent Q&A (T08): answers follow this student's gaps and plan
// ---------------------------------------------------------------------------

export interface FaqContext {
  timeline?: string;
  supportNeeds?: string[];
  /** Self-rated confidence per current subject: "strong" | "moderate" | "needs-help". */
  subjectConfidences?: Record<string, string>;
  entryGrade?: number;
  /** "CBSE", "ICSE" or "ISC". */
  board?: string;
  streamLabel?: string;
}

type Domain = "math" | "english" | "science" | "social" | "cs" | null;
const domainOf = (label: string): Domain => {
  const s = label.toLowerCase();
  if (/math|algebra|geometr|calculus/.test(s)) return "math";
  if (/english|language arts|\bela\b/.test(s)) return "english";
  if (/social|history|geograph|civics|econom|political/.test(s)) return "social";
  if (/computer/.test(s)) return "cs";
  if (/science|physics|chemistry|biology|evs/.test(s)) return "science";
  return null;
};

const CONFIDENCE_RANK: Record<string, number> = { "needs-help": 0, moderate: 1, strong: 2 };

/**
 * Subject card order: what the parent marked "Needs help" first, then
 * "Moderate", then "Strong", each in the form's subject order; subjects new to
 * the child (Hindi, Sanskrit: nothing on the form matches) last. The model's
 * own order varied between runs for the same answers, so it isn't used. Ties
 * (several report subjects for one form subject) keep the analysis order.
 */
export function orderSubjectsByNeed<T extends { subject: string }>(
  subjects: T[],
  subjectConfidences?: Record<string, string>,
  academicPath?: string[]
): T[] {
  const formOrder = academicPath?.length ? academicPath : Object.keys(subjectConfidences ?? {});
  const rankOf = (s: T): [number, number] => {
    const d = domainOf(s.subject);
    const i = d ? formOrder.findIndex((label) => domainOf(label) === d) : -1;
    const level = i >= 0 ? subjectConfidences?.[formOrder[i]] : undefined;
    return i >= 0 && level && level in CONFIDENCE_RANK ? [CONFIDENCE_RANK[level], i] : [3, 0];
  };
  return subjects
    .map((s) => ({ s, r: rankOf(s) }))
    .sort((a, b) => a.r[0] - b.r[0] || a.r[1] - b.r[1])
    .map((x) => x.s);
}

export function buildParentFAQ(a: ReportAnalysis, ctx: FaqContext): { question: string; answer: string }[] {
  const faq: { question: string; answer: string }[] = [];
  const ranked = prioritySubjects(a);
  const top = ranked.slice(0, 2);
  const board = ctx.board || "the new board";
  const newLanguages = a.subjectAnalysis.filter(isNewLanguage);
  const hard = ranked.filter((s) => s.alignmentLevel === "high_gap" && !isNewLanguage(s));
  const wantsTutor = (ctx.supportNeeds ?? []).some((s) => /tutor/i.test(s));

  // Tutor
  let tutor: string;
  if (newLanguages.length > 0) {
    tutor = `Yes, for ${subjectNames(newLanguages)}: ${newLanguages.length === 1 ? "it is" : "they are"} new to your child, and a tutor makes learning the script and grammar much faster.`;
    if (hard.length > 0) tutor += ` A tutor would also help with ${subjectNames(hard)}.`;
  } else if (hard.length > 0) {
    tutor = `Recommended for ${subjectNames(hard)} — most of ${hard.length === 1 ? "its" : "their"} topics are new.`;
  } else {
    tutor = "Not required — the gaps are narrow enough for self-study with the resources listed under each subject.";
  }
  if (wantsTutor && (newLanguages.length > 0 || hard.length > 0)) tutor += " This fits the 1-on-1 tutoring you asked about.";
  faq.push({ question: "Do we need a tutor?", answer: tutor });

  // Time before the move
  const duration = a.overallAlignment.estimatedDuration;
  const startWith = top.length > 0 ? subjectNames(top) : "the subjects with gaps";
  const fit = timeFit(a, ctx.timeline);
  if (fit) {
    const answers: Record<TimeFit, string> = {
      enough: `Yes: preparation is estimated at ${duration}, which fits before the move (${fit.moveLabel}). Start with ${startWith}.`,
      tight: `Just about: preparation (${duration}) takes up most of the time before the move (${fit.moveLabel}). Start now with ${startWith}, and keep a steady weekly routine.`,
      short: `Not at a normal pace: the move is ${fit.moveLabel}, but preparation is estimated at ${duration}. Start now with ${startWith}, consider tutoring, and plan to finish the remaining topics alongside school after the move.`,
    };
    faq.push({ question: "Is there enough time before the move?", answer: answers[fit.fit] });
  } else if (duration) {
    faq.push({ question: "How long will preparation take?", answer: `About ${duration} at a steady pace, starting with ${startWith}.` });
  }

  // Late start
  const strong = a.subjectAnalysis.filter((s) => s.alignmentLevel === "strong");
  faq.push({
    question: "What if we start late?",
    answer: `Focus on ${startWith} first — ${top.length === 1 ? "it has" : "they have"} the most new content.${strong.length > 0 ? ` ${subjectNames(strong)} can be revised closer to the move.` : ""} Remaining topics can be caught up alongside school.`,
  });

  // Board exam year
  const g = ctx.entryGrade;
  if (g === 10 || g === 12) {
    faq.push({
      question: `Is Class ${g} a board exam year?`,
      answer: `Yes: Class ${g} ends with the ${board} board exams, so the gaps should be closed early in the year. Practise with past ${board} papers from the start.`,
    });
  } else if (g === 9 || g === 11) {
    faq.push({
      question: "When are the board exams?",
      answer: `At the end of Class ${g + 1}. Class ${g} builds the foundation for them, so closing the gaps this year matters.`,
    });
  }

  // Stream fit (Classes 11-12)
  if (ctx.streamLabel && g && g >= 11) {
    const strongInStream = a.subjectAnalysis.filter((s) => s.alignmentLevel === "strong");
    const weak = ranked;
    faq.push({
      question: `Is the ${ctx.streamLabel} stream a good fit?`,
      answer: weak.length === 0
        ? "Yes: every subject of this stream is already well aligned."
        : `It's workable: ${strongInStream.length > 0 ? `${subjectNames(strongInStream)} ${strongInStream.length === 1 ? "is" : "are"} already well aligned; ` : ""}${subjectNames(weak)} ${weak.length === 1 ? "needs" : "need"} the most work before the year starts.`,
    });
  }

  // Self-rated confidence vs measured coverage (one of each kind at most)
  const confidences = Object.entries(ctx.subjectConfidences ?? {});
  const targetFor = (label: string) => {
    const d = domainOf(label);
    return d ? a.subjectAnalysis.find((s) => domainOf(s.subject) === d && !isUnassessed(s)) : undefined;
  };
  const hardButAligned = confidences
    .map(([label, level]) => ({ level, target: targetFor(label) }))
    .find((c) => c.level === "needs-help" && c.target?.alignmentLevel === "strong");
  if (hardButAligned?.target) {
    const t = hardButAligned.target;
    faq.push({
      question: `Why does ${t.subject} show ${subjectPercent(t)}% when it feels hard?`,
      answer: `The ${board} topics match what your child has studied, so the difficulty is practice and speed rather than missing content. Timed practice with past papers will help most.`,
    });
  }
  const strongButGaps = confidences
    .map(([label, level]) => ({ label, level, target: targetFor(label) }))
    .find((c) => c.level === "strong" && c.target?.alignmentLevel === "high_gap");
  if (strongButGaps?.target) {
    const t = strongButGaps.target;
    faq.push({
      question: `${strongButGaps.label} is a strength — why so many gaps in ${t.subject}?`,
      answer: `${board} teaches different topics in ${t.subject} (${t.totalTopics - t.topicsCovered} new to your child), not harder ones. A strong base should make them quicker to learn.`,
    });
  }

  return faq;
}

// ---------------------------------------------------------------------------
// Subject card "Coverage" bullets
// ---------------------------------------------------------------------------

/** What is known about a subject's coverage: counts only, no invented topic names. */
export function buildSubjectCoverage(s: ReportSubject): string[] {
  // Headed "Strengths" before, which read oddly as "0 of 6 covered" for a new language.
  if (s.totalTopics > 0 && s.topicsCovered === 0) {
    return [`None of the ${s.totalTopics} target topics is covered yet — this subject starts from the basics.`];
  }
  const bullets = [`${s.topicsCovered} of ${s.totalTopics} target topics already covered.`];
  // "Strong" subjects can still list missing topics; saying "no gaps" above that list contradicted it.
  if (s.alignmentLevel === "strong") {
    bullets.push(s.keyGaps.length === 0 ? "No significant gaps identified in this subject." : "Only a few narrow gaps remain, listed below.");
  } else if (s.keyGaps.length === 0) {
    bullets.push("No specific gap topics flagged for this subject yet.");
  }
  // Coverage is measured by topic, not depth: 100% means every topic appears
  // in the current curriculum, not that the student is exam-ready for it.
  if (s.totalTopics > 0 && s.topicsCovered / s.totalTopics >= 0.9) {
    bullets.push("Topics match, but the Indian board may cover them in more depth — practise with past board papers.");
  }
  return bullets;
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

/** "CBSE", "ICSE" or "ISC" for the target board at the entry grade. */
export function boardLabel(targetGoal?: string, entryGrade?: number): string | undefined {
  const t = (targetGoal || "").toLowerCase();
  if (t === "cbse" || t === "ncert") return "CBSE";
  if (t === "icse" || t === "isc" || t === "cisce") return entryGrade && entryGrade >= 11 ? "ISC" : "ICSE";
  return undefined;
}

/**
 * ICSE Classes 1-8 aren't in the curriculum data; the backend compares them
 * with CBSE/NCERT (mapToDBEntry), and the report says so. Classes 9-10 use
 * ICSE's own syllabus, except reports saved before it was loaded: those have
 * NCERT's combined "Science" / "Social Science" subjects instead of ICSE's
 * Physics, Chemistry, Biology, History & Civics and Geography.
 */
export function boardComparisonNote(targetGoal?: string, entryGrade?: number, subjects: string[] = []): string | undefined {
  if ((targetGoal || "").toLowerCase() !== "icse" || !entryGrade || entryGrade > 10) return undefined;
  if (entryGrade >= 9 && !subjects.some((s) => /^(science|social science)$/i.test(s.trim()))) return undefined;
  const reason = entryGrade >= 9 ? "ICSE's own syllabus wasn't in our data when this report was made" : "ICSE's own Classes 1–8 syllabus isn't in our data";
  return `ICSE Class ${entryGrade} is compared with the CBSE (NCERT) syllabus, because ${reason}. Most subjects match closely, but topic names, textbooks and some content differ from ICSE's.`;
}
