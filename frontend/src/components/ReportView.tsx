/**
 * ReportView — shared read-only report renderer used by both ReportPreview
 * (after analysis completes) and SharedReportPage (public shared links).
 *
 * All helper functions and types here are copied from ReportPreview.tsx so
 * both pages render identical output without duplicating JSX inline.
 */
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Target, AlertTriangle, GitCompareArrows, Layers, GraduationCap, School,
  BookOpen, Youtube, FileQuestion, Sparkles, TrendingUp, Clock, Gauge,
  Globe2, MessageCircleQuestion, ChevronDown,
} from "lucide-react";
import { mergeWithBaseline } from "@/lib/gradeBaselineTopics";
import { getGapReason } from "@/lib/gapExplanations";
import globiculumLogo from "@/assets/globiculum-logo.png";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type GapItem = string | { topic: string; resourceUrl?: string; subject?: string; reason?: string };
export type ResourceItem = string | { name: string; url?: string };

export interface SubjectAnalysis {
  subject: string;
  topicsCovered: number;
  totalTopics: number;
  alignmentLevel: "strong" | "moderate" | "high_gap";
  keyGaps: GapItem[];
}

export interface TimelinePhase {
  name: string;
  duration: string;
  bullets: string[];
}

export interface AnalysisData {
  overallAlignment: {
    percentage: number;
    subjectsNeedingBridge: string[];
    estimatedDuration: string;
  };
  subjectAnalysis: SubjectAnalysis[];
  criticalGaps: GapItem[];
  bridgeTimeline: {
    phase1: TimelinePhase;
    phase2: TimelinePhase;
    phase3: TimelinePhase;
  };
  recommendations: {
    study: string[];
    skillStrategy: string[];
    resources: ResourceItem[];
    culturalLanguage: string[];
  };
}

// ---------------------------------------------------------------------------
// Utilities (mirrored from ReportPreview.tsx)
// ---------------------------------------------------------------------------
const SLUG_ACRONYMS = new Set(["cbse", "icse", "ib", "igcse", "us", "uk", "uae", "ncert", "teks", "pyp", "ap", "dp", "myp"]);
const humanizeSlug = (value?: string): string => {
  if (!value) return "";
  return value
    .replace(/(\d+)-(\d+)/g, "$1–$2")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => SLUG_ACRONYMS.has(word.toLowerCase()) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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
const humanizeUSState = (code?: string): string =>
  !code ? "" : US_STATE_NAMES[code.toUpperCase()] || humanizeSlug(code);

const humanizeCurriculumList = (value: unknown): string => {
  const list = Array.isArray(value) ? value : typeof value === "string" && value ? [value] : [];
  return list.map((v) => humanizeSlug(v)).filter(Boolean).join(", ");
};

const computeTargetGradeLabel = (snapshotGrade?: string | number, targetGrade?: string): string => {
  const base = typeof snapshotGrade === "number" ? snapshotGrade : parseInt(String(snapshotGrade ?? ""), 10);
  if (!Number.isFinite(base)) return targetGrade ? humanizeSlug(targetGrade) : "";
  return `Grade ${targetGrade === "next" ? base + 1 : base}`;
};

const deriveRiskLevel = (percentage?: number): string => {
  if (typeof percentage !== "number" || Number.isNaN(percentage)) return "—";
  if (percentage >= 75) return "Low";
  if (percentage >= 50) return "Medium";
  return "High";
};

const isIndiaReadinessGoal = (targetGoal?: string): boolean => {
  if (!targetGoal) return true;
  return /india|cbse|icse|state[\s-]?board|ncert/i.test(targetGoal);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const buildTransitionSummary = (formData: any): string => {
  const currentCountry = formData.snapshotLocation === "us" ? "US" : humanizeSlug(formData.snapshotLocation) || "Current Location";
  const currentState = formData.snapshotLocation === "us" && formData.usState
    ? (formData.usState === "other" ? (formData.usStateOther || "") : humanizeUSState(formData.usState)) : "";
  const currentCurriculum = humanizeCurriculumList(formData.currentCurriculum);
  const currentGrade = formData.snapshotGrade ? `Grade ${formData.snapshotGrade}` : "";
  const currentDetail = [currentState, currentCurriculum, currentGrade].filter(Boolean).join(", ");
  const currentLabel = currentDetail ? `${currentCountry} (${currentDetail})` : currentCountry;
  const targetGradeLabel = computeTargetGradeLabel(formData.snapshotGrade, formData.targetGrade);
  const targetCurriculum = humanizeSlug(formData.targetGoal);
  const targetDetail = [targetCurriculum, targetGradeLabel].filter(Boolean).join(", ");
  const targetLabel = isIndiaReadinessGoal(formData.targetGoal)
    ? `India${targetDetail ? ` (${targetDetail})` : ""}` : targetDetail || "Target Curriculum";
  return `${currentLabel} → ${targetLabel}`;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const buildProfileGrid = (formData: any): { label: string; value: string }[] => {
  const firstName = formData.childName || formData.studentName;
  const lastName = formData.childLastName || formData.studentLastName;
  const name = [firstName, lastName].filter(Boolean).join(" ") || "—";
  const age = formData.snapshotAge ? ` (Age ${formData.snapshotAge})` : "";
  const originGrade = formData.snapshotGrade ? `Grade ${formData.snapshotGrade}` : "";
  const originCurriculum = humanizeCurriculumList(formData.currentCurriculum);
  const originLabel = [originCurriculum, originGrade].filter(Boolean).join(" – ") || "—";
  const targetGradeLabel = computeTargetGradeLabel(formData.snapshotGrade, formData.targetGrade);
  const targetCurriculum = humanizeSlug(formData.targetGoal);
  const targetLabel = [targetCurriculum, targetGradeLabel].filter(Boolean).join(" – ") || "—";
  const schoolStageLabel = formData.schoolStage ? `${humanizeSlug(formData.schoolStage)} School` : "—";
  const timelineLabel = humanizeSlug(formData.timeline) || "—";
  const languages = Array.isArray(formData.selectedLanguages) && formData.selectedLanguages.length > 0
    ? formData.selectedLanguages.map((l: string) => humanizeSlug(l)).join(", ") : "—";
  return [
    { label: "Student Name", value: `${name}${age}` },
    { label: "Target Board", value: targetLabel },
    { label: "School Stage", value: schoolStageLabel },
    { label: "Transition Timeline", value: timelineLabel },
    { label: "Origin Curriculum", value: originLabel },
    { label: "Language(s)", value: languages },
  ];
};

const summarizeSubjects = (analysis: AnalysisData) => {
  const withPercentage = analysis.subjectAnalysis.map((s) => ({
    ...s, percentage: s.totalTopics > 0 ? Math.round((s.topicsCovered / s.totalTopics) * 100) : 0,
  }));
  const strong = withPercentage.filter((s) => s.alignmentLevel === "strong");
  const moderate = withPercentage.filter((s) => s.alignmentLevel === "moderate");
  const critical = withPercentage.filter((s) => s.alignmentLevel === "high_gap");
  const weakest = [...withPercentage].sort((a, b) => a.percentage - b.percentage)[0];
  return { withPercentage, strong, moderate, critical, weakest };
};

const joinNames = (items: { subject: string }[]): string => items.map((s) => s.subject).join(", ");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const buildExecutiveSummary = (formData: any, analysis: AnalysisData): string[] => {
  const { weakest } = summarizeSubjects(analysis);
  const percentage = analysis.overallAlignment.percentage;
  const risk = deriveRiskLevel(percentage);
  const duration = analysis.overallAlignment.estimatedDuration;
  const targetCurriculum = humanizeSlug(formData.targetGoal) || "the target curriculum";
  const targetGradeLabel = computeTargetGradeLabel(formData.snapshotGrade, formData.targetGrade) || "the target grade";
  let summary = `This assessment shows a ${percentage}% readiness score (${risk} risk) for the transition to ${targetCurriculum} ${targetGradeLabel}, achievable within the estimated ${duration} preparation window.`;
  if (weakest) summary += ` ${weakest.subject}, currently at ${weakest.percentage}% alignment, should be the first focus area.`;
  return [summary];
};

const buildKeyTakeaways = (analysis: AnalysisData): string[] => {
  const { strong, moderate, weakest } = summarizeSubjects(analysis);
  const bullets: string[] = [];
  if (strong.length > 0) bullets.push(`${joinNames(strong)} need${strong.length === 1 ? "s" : ""} only light bridging — already strongly aligned with target expectations.`);
  if (moderate.length > 0) bullets.push(`${joinNames(moderate)} require${moderate.length === 1 ? "s" : ""} targeted, moderate preparation.`);
  if (weakest) bullets.push(`${weakest.subject} is the single most important prep area, currently at ${weakest.percentage}% alignment.`);
  bullets.push(`Estimated preparation window: ${analysis.overallAlignment.estimatedDuration}.`);
  if (analysis.criticalGaps.length > 0)
    bullets.push(`${analysis.criticalGaps.length} critical gap${analysis.criticalGaps.length === 1 ? "" : "s"} identified and should be front-loaded before the transition starts.`);
  return bullets;
};

const SUBJECT_COVERAGE_LABEL: Record<SubjectAnalysis["alignmentLevel"], string> = {
  strong: "High Coverage", moderate: "Medium Coverage", high_gap: "Low Coverage",
};
const SUBJECT_PACE_LABEL: Record<SubjectAnalysis["alignmentLevel"], string> = {
  strong: "Quick Review", moderate: "Moderate Prep", high_gap: "Extended Prep",
};
const SOFT_TEAL_BADGE = "bg-secondary/10 text-secondary border border-secondary/25";
const SOFT_AMBER_BADGE = "bg-accent/10 text-accent-contrast border border-accent/25";
const SOFT_VIOLET_BADGE = "bg-violet/10 text-primary border border-violet/25";
const SUBJECT_COVERAGE_BADGE_STYLE: Record<SubjectAnalysis["alignmentLevel"], string> = {
  strong: SOFT_TEAL_BADGE, moderate: SOFT_AMBER_BADGE, high_gap: SOFT_AMBER_BADGE,
};
const SUBJECT_PACE_BADGE_STYLE: Record<SubjectAnalysis["alignmentLevel"], string> = {
  strong: SOFT_VIOLET_BADGE, moderate: SOFT_AMBER_BADGE, high_gap: SOFT_AMBER_BADGE,
};
const SUBJECT_ACCENT_BORDER = ["border-secondary", "border-accent", "border-violet", "border-mint", "border-primary", "border-destructive"];
const SUBJECT_DIFFICULTY: Record<SubjectAnalysis["alignmentLevel"], { level: string; explanation: string }> = {
  strong: { level: "Low", explanation: "Underlying concepts transfer well — remaining gaps are narrow and should close quickly with light, focused practice." },
  moderate: { level: "Medium", explanation: "Core concepts are learnable, but some content and assessment style will be new — steady, regular practice is recommended." },
  high_gap: { level: "High", explanation: "This subject needs structured, front-loaded preparation across multiple topics to reach grade-level readiness." },
};
const SUBJECT_CHIP_PALETTE: { bg: string; fg: string }[] = [
  { bg: "bg-secondary", fg: "text-secondary-foreground" },
  { bg: "bg-accent", fg: "text-accent-foreground" },
  { bg: "bg-mint", fg: "text-mint-foreground" },
  { bg: "bg-violet", fg: "text-violet-foreground" },
  { bg: "bg-primary", fg: "text-primary-foreground" },
  { bg: "bg-destructive", fg: "text-destructive-foreground" },
];

const getGapTopic = (g: GapItem): string => typeof g === "string" ? g : g.topic;
const getGapUrl = (g: GapItem): string | undefined => typeof g === "string" ? undefined : g.resourceUrl;
const getGapSubject = (g: GapItem): string | undefined => typeof g === "string" ? undefined : g.subject;
const getGapDescription = (g: GapItem, subjectHint?: string): string => {
  if (typeof g !== "string" && g.reason) return g.reason;
  return getGapReason(getGapTopic(g), getGapSubject(g) ?? subjectHint ?? "");
};
const getResName = (r: ResourceItem): string => typeof r === "string" ? r : r.name;
const getResUrl = (r: ResourceItem): string | undefined => typeof r === "string" ? undefined : r.url;

const buildSubjectStrengths = (subject: SubjectAnalysis): string[] => {
  const bullets: string[] = [`${subject.topicsCovered} of ${subject.totalTopics} target topics already covered.`];
  if (subject.alignmentLevel === "strong") bullets.push("No significant gaps identified in this subject.");
  else if (subject.keyGaps.length === 0) bullets.push("No specific gap topics flagged for this subject yet.");
  return bullets;
};

const buildSubjectResources = (subject: SubjectAnalysis): { label: string; url: string }[] =>
  subject.keyGaps.map((gap) => ({ label: getGapTopic(gap), url: getGapUrl(gap) }))
    .filter((r): r is { label: string; url: string } => !!r.url);

const deriveRiskMetrics = (analysis: AnalysisData) => {
  const readiness = Math.max(0, Math.min(100, analysis.overallAlignment.percentage));
  const academicRisk = 100 - readiness;
  const totalSubjects = analysis.subjectAnalysis.length;
  const needingBridge = analysis.overallAlignment.subjectsNeedingBridge?.length ?? 0;
  const transitionRisk = totalSubjects > 0 ? Math.min(100, Math.round((needingBridge / totalSubjects) * 100)) : academicRisk;
  return [
    { label: "Academic Risk", percentage: academicRisk, tone: "risk" as const },
    { label: "Transition Risk", percentage: transitionRisk, tone: "risk" as const },
    { label: "Exam Readiness", percentage: readiness, tone: "positive" as const },
  ];
};

const extractMonthCount = (analysis: AnalysisData): number => {
  const candidates = [analysis.bridgeTimeline?.phase3?.duration, analysis.overallAlignment?.estimatedDuration].filter((v): v is string => !!v);
  for (const text of candidates) {
    const numbers = (text.match(/\d+/g) ?? []).map(Number);
    if (numbers.length > 0) return Math.max(1, ...numbers);
  }
  return 3;
};

const distributeAcrossMonths = <T,>(items: T[], monthCount: number): T[][] => {
  if (monthCount <= 0) return [];
  if (items.length === 0) return Array.from({ length: monthCount }, () => [] as T[]);
  if (items.length >= monthCount) {
    const result: T[][] = Array.from({ length: monthCount }, () => [] as T[]);
    items.forEach((item, i) => { result[Math.min(monthCount - 1, Math.floor((i * monthCount) / items.length))].push(item); });
    return result;
  }
  return Array.from({ length: monthCount }, () => items);
};

const buildMonthlyBridgePlan = (analysis: AnalysisData) => {
  const monthCount = extractMonthCount(analysis);
  const phases = [analysis.bridgeTimeline.phase1, analysis.bridgeTimeline.phase2, analysis.bridgeTimeline.phase3];
  const parsedRanges = phases.map((p): [number, number] | null => {
    const nums = (p.duration.match(/\d+/g) ?? []).map(Number);
    if (nums.length >= 2) return [nums[0], nums[nums.length - 1]];
    if (nums.length === 1) return [nums[0], nums[0]];
    return null;
  });
  const phaseSpans: [number, number][] = parsedRanges.every((r): r is [number, number] => r !== null)
    ? (parsedRanges as [number, number][])
    : (() => {
        const base = Math.floor(monthCount / 3); const remainder = monthCount % 3; let cursor = 1;
        return [0, 1, 2].map((i) => { const span = base + (i < remainder ? 1 : 0); const start = cursor; const end = Math.max(start, cursor + span - 1); cursor += span; return [start, end] as [number, number]; });
      })();
  const bulletsPerPhaseMonth = phaseSpans.map(([start, end], i) => distributeAcrossMonths(phases[i].bullets, Math.max(1, end - start + 1)));
  return Array.from({ length: monthCount }, (_, idx) => {
    const month = idx + 1;
    const percentage = month === monthCount ? 100 : Math.round((month / monthCount) * 100);
    let phaseIndex = phaseSpans.findIndex(([start, end]) => month >= start && month <= end);
    if (phaseIndex === -1) phaseIndex = phaseSpans.length - 1;
    const [start] = phaseSpans[phaseIndex];
    const offsetInPhase = Math.min(month - start, bulletsPerPhaseMonth[phaseIndex].length - 1);
    const bullets = bulletsPerPhaseMonth[phaseIndex][Math.max(0, offsetInPhase)] ?? [];
    return { phase: phases[phaseIndex].name, month, focusAreas: bullets.length > 0 ? bullets : [phases[phaseIndex].name], percentage };
  });
};

const buildWhyStartNow = (analysis: AnalysisData): string[] => {
  const topGaps = analysis.criticalGaps.slice(0, 2).map(getGapTopic);
  const duration = analysis.overallAlignment.estimatedDuration;
  if (topGaps.length === 0) return [`Beginning preparation now keeps the plan on track for the estimated ${duration} timeline.`, "Waiting risks compressing everything into the final weeks."];
  const gapPhrase = topGaps.join(" and ");
  const plural = analysis.criticalGaps.length > 1;
  return [
    `The highest-priority gap${plural ? "s" : ""} — ${gapPhrase} — carr${plural ? "y" : "ies"} the greatest academic impact and should be addressed first.`,
    `Starting preparation now keeps the overall plan on track for the estimated ${duration} timeline.`,
    "Waiting risks compressing everything into the final weeks.",
  ];
};

const CRITICAL_GAP_PRIORITY_WEIGHT: Record<"High" | "Medium" | "Low", number> = { High: 3, Medium: 2, Low: 1 };

const buildTopicSubjectMap = (analysis: AnalysisData): Map<string, string> => {
  const map = new Map<string, string>();
  for (const subject of analysis.subjectAnalysis ?? [])
    for (const gap of subject.keyGaps ?? []) { const topic = getGapTopic(gap).toLowerCase().trim(); if (topic) map.set(topic, subject.subject); }
  return map;
};

const buildCriticalGapsTable = (analysis: AnalysisData) => {
  const gaps = analysis.criticalGaps; const total = gaps.length;
  if (total === 0) return [];
  const topicSubjectMap = buildTopicSubjectMap(analysis);
  const highCount = Math.max(1, Math.round(total * 0.4));
  const mediumCount = Math.min(total - highCount, Math.round(total * 0.4));
  const tiered = gaps.map((gap, i) => ({ gap, priority: (i < highCount ? "High" : i < highCount + mediumCount ? "Medium" : "Low") as "High" | "Medium" | "Low" }));
  const totalWeeks = extractMonthCount(analysis) * 4;
  const weightSum = tiered.reduce((sum, t) => sum + CRITICAL_GAP_PRIORITY_WEIGHT[t.priority], 0);
  return tiered.map(({ gap, priority }) => {
    const topic = getGapTopic(gap);
    const subject = getGapSubject(gap) ?? topicSubjectMap.get(topic.toLowerCase().trim()) ?? "";
    const weeks = Math.max(1, Math.round((CRITICAL_GAP_PRIORITY_WEIGHT[priority] / weightSum) * totalWeeks));
    return { priority, topic, url: getGapUrl(gap), description: getGapDescription(gap, subject), weeks };
  });
};

const buildImmediateActions = (analysis: AnalysisData) => {
  const actions: { label: string; url?: string }[] = [];
  analysis.recommendations.resources.slice(0, 2).forEach((r) => actions.push({ label: getResName(r), url: getResUrl(r) }));
  analysis.recommendations.study.slice(0, 2).forEach((s) => actions.push({ label: s }));
  analysis.recommendations.skillStrategy.slice(0, 2).forEach((s) => actions.push({ label: s }));
  return actions.slice(0, 5);
};

const buildStudentChecklist = (analysis: AnalysisData): string[] => {
  const items = [...analysis.recommendations.study];
  analysis.criticalGaps.slice(0, 2).forEach((gap) => items.push(`Review ${getGapTopic(gap)}.`));
  return items.slice(0, 3);
};

const buildTeacherRecommendations = (analysis: AnalysisData): string[] =>
  [...analysis.recommendations.skillStrategy, ...analysis.recommendations.culturalLanguage].slice(0, 3);

const buildParentFAQ = (analysis: AnalysisData) => {
  const { critical } = summarizeSubjects(analysis);
  const duration = analysis.overallAlignment.estimatedDuration;
  const risk = deriveRiskLevel(analysis.overallAlignment.percentage);
  const phase1Name = analysis.bridgeTimeline.phase1.name;
  return [
    { question: "Do we need a tutor?", answer: critical.length > 0 ? `Not required, but recommended for ${critical[0].subject} specifically.` : "Not required based on the current assessment — self-guided study should be sufficient." },
    { question: "What if we start late?", answer: `Still workable — compress the ${phase1Name} phase and consider a tutor if the timeline shortens further.` },
    { question: `Is ${duration} really enough?`, answer: risk === "High" ? "It will be tight — prioritizing the highest-impact gaps early is recommended." : "Yes, at the pace in this plan, with room to spare." },
  ];
};

// ---------------------------------------------------------------------------
// ReadinessDonut component
// ---------------------------------------------------------------------------
const ReadinessDonut = ({ percentage }: { percentage: number }) => {
  const size = 116; const strokeWidth = 10; const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, Number.isFinite(percentage) ? percentage : 0));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--secondary))" strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - clamped / 100)}
          style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-foreground">{Math.round(clamped)}%</span>
        <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Readiness</span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface ReportViewProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formData: any;
  analysisData: AnalysisData;
  /** Optional banner shown at top of the card (e.g. "Shared report for Aarav") */
  sharedBanner?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const ReportView = ({ formData, analysisData: analysis, sharedBanner }: ReportViewProps) => {
  const gradeNum = parseInt(formData.snapshotGrade) || 0;
  const isFoundation = gradeNum >= 2 && gradeNum <= 10;

  const subjectsToRender = analysis.subjectAnalysis.filter((s) => s.totalTopics > 0 || s.keyGaps.length > 0);

  const renderSubjectCard = (subject: SubjectAnalysis, subjectIndex: number) => {
    const percentage = subject.totalTopics > 0 ? Math.round((subject.topicsCovered / subject.totalTopics) * 100) : 0;
    const rawGaps = isFoundation
      ? mergeWithBaseline(gradeNum, subject.subject, subject.keyGaps.map(getGapTopic), { maxTopics: 6 }).map(t => subject.keyGaps.find(g => getGapTopic(g) === t) ?? t)
      : subject.keyGaps;
    const gapRows = rawGaps.slice(0, 4).map((gap) => ({ topic: getGapTopic(gap), url: getGapUrl(gap), reason: getGapDescription(gap, subject.subject) }));
    const strengths = buildSubjectStrengths(subject);
    const resources = buildSubjectResources(subject);
    const difficulty = SUBJECT_DIFFICULTY[subject.alignmentLevel];
    const accentBorder = SUBJECT_ACCENT_BORDER[subjectIndex % SUBJECT_ACCENT_BORDER.length];

    return (
      <Collapsible key={subject.subject} className={`overflow-hidden rounded-lg border-l-4 bg-muted/50 ${accentBorder}`}>
        <CollapsibleTrigger className="group flex w-full cursor-pointer items-center justify-between gap-2 p-4 text-left sm:p-5">
          <h4 className="text-base font-bold text-foreground">{subject.subject}</h4>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white ${percentage >= 70 ? "bg-secondary" : "bg-accent"}`}>{percentage}% Align</span>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${SUBJECT_COVERAGE_BADGE_STYLE[subject.alignmentLevel]}`}>{SUBJECT_COVERAGE_LABEL[subject.alignmentLevel]}</span>
            <span className={`hidden rounded-full px-2.5 py-0.5 text-[11px] font-semibold sm:inline-block ${SUBJECT_PACE_BADGE_STYLE[subject.alignmentLevel]}`}>{SUBJECT_PACE_LABEL[subject.alignmentLevel]}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden="true" />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4 sm:px-5 sm:pb-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <div>
                <h5 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-secondary">Strengths</h5>
                <ul className="space-y-1 text-xs text-foreground/90">
                  {strengths.map((s, i) => <li key={i} className="flex gap-1.5"><span className="text-secondary" aria-hidden="true">•</span><span>{s}</span></li>)}
                </ul>
              </div>
              <div>
                <h5 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-secondary">Missing Topics</h5>
                {gapRows.length > 0 ? (
                  <div className="overflow-x-auto rounded-md border border-border bg-background">
                    <table className="w-full border-collapse text-[11px]">
                      <thead><tr className="bg-primary text-primary-foreground"><th scope="col" className="px-2 py-1 text-left font-semibold">Topic</th><th scope="col" className="px-2 py-1 text-left font-semibold">Gap</th></tr></thead>
                      <tbody>
                        {gapRows.map((g, i) => (
                          <tr key={i} className={i % 2 === 1 ? "bg-muted/40" : undefined}>
                            <td className="border-t border-border px-2 py-1 align-top font-medium">{g.url ? <a href={g.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-secondary">{g.topic}</a> : g.topic}</td>
                            <td className="border-t border-border px-2 py-1 align-top text-muted-foreground">{g.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-xs text-muted-foreground">No specific gap topics flagged for this subject.</p>}
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <h5 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-secondary">Difficulty &amp; Catch-up</h5>
                <p className="text-xs text-foreground/90"><span className="font-semibold">{difficulty.level} — </span>{difficulty.explanation}</p>
              </div>
              <div>
                <h5 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-secondary">Resources</h5>
                {resources.length > 0 ? (
                  <ul className="space-y-1 text-xs text-foreground/90">
                    {resources.map((r, i) => <li key={i} className="flex gap-1.5"><span className="text-secondary" aria-hidden="true">•</span><a href={r.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-secondary">{r.label}</a></li>)}
                  </ul>
                ) : <p className="text-xs text-muted-foreground">No resources available yet for this subject.</p>}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const riskMetrics = deriveRiskMetrics(analysis);
  const monthlyPlan = buildMonthlyBridgePlan(analysis);
  const whyStartNow = buildWhyStartNow(analysis);
  const immediateActions = buildImmediateActions(analysis);
  const criticalGapsTable = buildCriticalGapsTable(analysis);
  const studentChecklist = buildStudentChecklist(analysis);
  const teacherRecommendations = buildTeacherRecommendations(analysis);
  const culturalTips = analysis.recommendations.culturalLanguage;
  const faq = buildParentFAQ(analysis);
  const { withPercentage: subjectsWithPct } = summarizeSubjects(analysis);

  const currentCurrList: string[] = Array.isArray(formData.currentCurriculum) ? formData.currentCurriculum
    : typeof formData.currentCurriculum === "string" && formData.currentCurriculum ? [formData.currentCurriculum] : [];
  const targetGoal = (formData.targetGoal || "").toLowerCase();
  const matchedCurriculum = currentCurrList.map((c) => c.toLowerCase()).find((c) =>
    (c.includes("ib") && targetGoal.includes("ib")) || (c.includes("igcse") && targetGoal.includes("igcse")) || (c.includes("cambridge") && targetGoal.includes("igcse"))
  );

  const priorityStyle: Record<"High" | "Medium" | "Low", string> = {
    High: "bg-destructive/10 text-destructive", Medium: "bg-accent/10 text-accent-contrast", Low: "bg-muted text-muted-foreground",
  };
  const priorityGroups = (["High", "Medium", "Low"] as const)
    .map((priority) => ({ priority, gaps: criticalGapsTable.filter((g) => g.priority === priority) }))
    .filter((group) => group.gaps.length > 0);

  return (
    <Card className="border border-border overflow-hidden">
      {/* A. Report Header */}
      <div className="relative overflow-hidden bg-[linear-gradient(120deg,hsl(var(--primary))_0%,hsl(var(--primary))_72%,hsl(var(--violet)/0.4)_130%)] px-5 py-4 sm:px-7 sm:py-5">
        <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-mint/20 blur-2xl" aria-hidden="true" />
        <div className="relative">
          <img src={globiculumLogo} alt="Globiculum" className="h-8 w-auto brightness-0 invert mb-2.5" />
          <h1 className="text-lg font-bold uppercase tracking-tight text-primary-foreground sm:text-xl">Curriculum Gap Analysis Report</h1>
          <p className="mt-1 text-xs font-medium text-mint sm:text-sm">{buildTransitionSummary(formData)}</p>
        </div>
      </div>

      <CardContent className="space-y-5 pt-5">
        {/* Shared link banner */}
        {sharedBanner}

        {/* B. Student & Transition Profile + Overall Readiness */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="mb-1.5 flex items-center gap-1.5 text-lg font-bold text-primary">
              <Target className="h-4 w-4 text-secondary" aria-hidden="true" />Student &amp; Transition Profile
            </h2>
            <div className="mb-2 flex items-center gap-1.5"><div className="h-0.5 w-10 rounded-full bg-secondary" /><div className="h-1.5 w-1.5 rounded-full bg-mint" /></div>
            <div className="rounded-md border border-border bg-muted/20">
              <div className="grid grid-cols-1 sm:grid-cols-2">
                {buildProfileGrid(formData).map((field, i) => {
                  const isLastRow = i >= 4; const isLeftCol = i % 2 === 0;
                  return (
                    <div key={field.label} className={`px-3.5 py-2.5 border-border ${isLastRow ? "" : "border-b"} ${isLeftCol ? "sm:border-r" : ""}`}>
                      <div className="text-[9px] font-semibold uppercase tracking-wide text-secondary">{field.label}</div>
                      <div className="mt-0.5 text-xs font-semibold text-foreground">{field.value}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="relative flex flex-col items-center justify-center gap-1.5 overflow-hidden rounded-md border border-mint/40 bg-mint/15 py-4">
            <Sparkles className="pointer-events-none absolute right-3 top-3 h-3.5 w-3.5 text-secondary/50" aria-hidden="true" />
            <h2 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Overall Readiness</h2>
            <ReadinessDonut percentage={analysis.overallAlignment.percentage} />
          </div>
        </div>

        {/* C. Readiness Summary Strip */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <div className="flex items-center gap-2.5 rounded-md border-t-2 border-secondary bg-secondary/10 px-4 py-2.5">
            <TrendingUp className="h-4 w-4 shrink-0 text-secondary" />
            <div><div className="text-lg font-bold leading-none text-secondary">{analysis.overallAlignment.percentage}%</div><div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Ready Now</div></div>
          </div>
          <div className="flex items-center gap-2.5 rounded-md border-t-2 border-accent bg-accent/10 px-4 py-2.5">
            <Gauge className="h-4 w-4 shrink-0 text-accent-contrast" />
            <div><div className="text-lg font-bold leading-none text-accent-contrast">{deriveRiskLevel(analysis.overallAlignment.percentage)}</div><div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Risk Level</div></div>
          </div>
          <div className="flex items-center gap-2.5 rounded-md border-t-2 border-violet bg-violet/10 px-4 py-2.5">
            <Clock className="h-4 w-4 shrink-0 text-primary" />
            <div><div className="text-lg font-bold leading-none text-primary">{analysis.overallAlignment.estimatedDuration}</div><div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Time to Prepare</div></div>
          </div>
        </div>

        {/* C2. Executive Summary */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold uppercase tracking-tight text-primary">Executive Summary</h2>
            <div className="mt-1 mb-2.5 flex items-center gap-1.5"><div className="h-0.5 w-10 rounded-full bg-secondary" /><div className="h-1.5 w-1.5 rounded-full bg-mint" /></div>
            <div className="space-y-2 text-[13px] leading-relaxed text-foreground/90">
              {buildExecutiveSummary(formData, analysis).map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div>
              <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Alignment by Subject</h2>
              <div className="space-y-2">
                {subjectsWithPct.map((s, i) => (
                  <div key={s.subject} className="flex items-center gap-2.5">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${SUBJECT_CHIP_PALETTE[i % SUBJECT_CHIP_PALETTE.length].bg}`} aria-hidden="true" />
                    <div className="w-24 shrink-0 truncate text-xs font-medium text-foreground">{s.subject}</div>
                    <div className="h-2 flex-1 rounded-full bg-muted"><div className={`h-full rounded-full ${s.percentage >= 70 ? "bg-secondary" : "bg-accent"}`} style={{ width: `${Math.max(s.percentage, 2)}%` }} /></div>
                    <div className="w-8 shrink-0 text-right text-xs font-semibold text-foreground">{s.percentage}%</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Key Takeaways</h2>
              <ul className="space-y-1.5 text-xs text-foreground/90">
                {buildKeyTakeaways(analysis).map((bullet, i) => (
                  <li key={i} className="flex gap-1.5"><span className={i % 2 === 0 ? "text-secondary" : "text-violet"} aria-hidden="true">•</span><span>{bullet}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* D. Subject-wise Gap Analysis */}
        <div className="space-y-3">
          <div>
            <h3 className="text-lg font-bold text-primary">Subject-wise Gap Analysis</h3>
            <div className="mt-1 mb-2 flex items-center gap-1.5"><div className="h-0.5 w-10 rounded-full bg-secondary" /><div className="h-1.5 w-1.5 rounded-full bg-mint" /></div>
            <p className="text-xs italic text-muted-foreground">Click on a subject to view detailed analysis.</p>
          </div>
          <div className="space-y-3">{subjectsToRender.map((subject, i) => renderSubjectCard(subject, i))}</div>
        </div>

        {/* D2. Stream Readiness for Grade 11-12 */}
        {formData.schoolStage === "high" && gradeNum >= 11 && (() => {
          const subjects = formData.academicPath || [];
          const subjectAnalysis = analysis.subjectAnalysis || [];
          const getReadiness = (keywords: RegExp): "strong" | "moderate" | "preparation" => {
            const matched = subjectAnalysis.find(s => keywords.test(s.subject));
            if (!matched) return "preparation";
            return matched.alignmentLevel === "strong" ? "strong" : matched.alignmentLevel === "moderate" ? "moderate" : "preparation";
          };
          const hasSubject = (keywords: RegExp) => subjects.some((s: string) => keywords.test(s));
          const streamSubjects = [
            { name: "Mathematics", check: /math|algebra|calculus|geometry/i, readiness: getReadiness(/math/i) },
            { name: "Physics", check: /physics/i, readiness: hasSubject(/physics/i) ? getReadiness(/physics/i) : "preparation" as const },
            { name: "Chemistry", check: /chemistry/i, readiness: hasSubject(/chemistry/i) ? getReadiness(/chemistry/i) : "preparation" as const },
            { name: "Biology", check: /biology/i, readiness: hasSubject(/biology/i) ? getReadiness(/biology/i) : "preparation" as const },
            { name: "Economics / Commerce", check: /economics|commerce|business/i, readiness: hasSubject(/economics|commerce/i) ? getReadiness(/economics/i) : "preparation" as const },
            { name: "Computer Science", check: /computer|cs|coding/i, readiness: hasSubject(/computer|cs|coding/i) ? getReadiness(/computer/i) : "preparation" as const },
          ].filter(s => hasSubject(s.check) || s.name === "Mathematics");
          const readinessColors = {
            strong: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200",
            moderate: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200",
            preparation: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200",
          };
          const readinessLabels = { strong: "Strong Readiness", moderate: "Moderate Readiness", preparation: "Preparation Required" };
          const pcmReady = streamSubjects.filter(s => /math|physics|chemistry/i.test(s.name)).every(s => s.readiness !== "preparation");
          const pcbReady = streamSubjects.filter(s => /math|physics|chemistry|biology/i.test(s.name) && !/computer/i.test(s.name)).some(s => /biology/i.test(s.name) && s.readiness !== "preparation");
          return (
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5"><Layers className="h-4 w-4 text-primary" /><h3 className="text-base font-semibold">Recommended Stream Readiness</h3></div>
              <p className="text-xs text-muted-foreground">Based on your US coursework, here's how your child aligns with Indian Grade 11–12 streams.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                {streamSubjects.map((s) => (<div key={s.name} className={`p-2.5 rounded-lg border text-center ${readinessColors[s.readiness]}`}><div className="text-xs font-semibold">{s.name}</div><div className="text-[11px] mt-0.5">{readinessLabels[s.readiness]}</div></div>))}
              </div>
              <div className="p-2.5 bg-muted/30 rounded-lg border border-border">
                <div className="text-xs font-medium mb-1">Suggested Stream Alignment</div>
                <div className="flex flex-wrap gap-2">
                  {pcmReady && <Badge className="bg-emerald-100 text-emerald-700 border-0">PCM (Science – Math)</Badge>}
                  {pcbReady && <Badge className="bg-emerald-100 text-emerald-700 border-0">PCB (Science – Bio)</Badge>}
                  {hasSubject(/economics|commerce|business/i) && <Badge className="bg-amber-100 text-amber-700 border-0">Commerce</Badge>}
                  {!pcmReady && !pcbReady && <Badge variant="secondary">Needs further assessment</Badge>}
                </div>
              </div>
            </div>
          );
        })()}

        {/* E2. Critical Gaps */}
        {criticalGapsTable.length > 0 && (
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-primary">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" aria-hidden="true" />Critical Gaps Prioritised by Academic Impact
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wide text-secondary">{criticalGapsTable.length} Gap{criticalGapsTable.length === 1 ? "" : "s"} Total · {criticalGapsTable.filter(g => g.priority === "High").length} High Priority</span>
            </div>
            <div className="space-y-2.5">
              {priorityGroups.map(({ priority, gaps }) => (
                <Collapsible key={priority} defaultOpen={priority === "High"} className="overflow-hidden rounded-lg border border-border bg-background">
                  <CollapsibleTrigger className="group flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-left">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${priorityStyle[priority]}`}>{priority}</span>
                      <span className="text-xs font-semibold text-foreground">{gaps.length} Gap{gaps.length === 1 ? "" : "s"}</span>
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="divide-y divide-border border-t border-border">
                    {gaps.map((g, i) => (
                      <div key={i} className="px-3 py-2.5 text-xs">
                        <div className="flex items-start justify-between gap-3">
                          <span className="font-semibold text-foreground">{g.url ? <a href={g.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-secondary">{g.topic}</a> : g.topic}</span>
                          <span className="shrink-0 rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-semibold text-secondary">{g.weeks} Week{g.weeks === 1 ? "" : "s"}</span>
                        </div>
                        <p className="mt-1 text-muted-foreground">{g.description}</p>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </div>
        )}

        {/* F. Bridge Timeline & Recommendations */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-primary">Bridge Timeline &amp; Recommendations</h3>
            <div className="mt-1 flex items-center gap-1.5"><div className="h-0.5 w-10 rounded-full bg-secondary" /><div className="h-1.5 w-1.5 rounded-full bg-mint" /></div>
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div>
              <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-secondary">Risk at a Glance</h4>
              <div className="space-y-2">
                {riskMetrics.map((m) => (
                  <div key={m.label} className="flex items-center gap-2.5">
                    <div className="w-24 shrink-0 text-xs font-medium text-foreground">{m.label}</div>
                    <div className="h-2 flex-1 rounded-sm bg-muted"><div className={`h-full rounded-sm ${m.tone === "positive" ? "bg-secondary" : "bg-accent"}`} style={{ width: `${Math.max(m.percentage, 2)}%` }} /></div>
                    <div className="w-8 shrink-0 text-right text-xs font-semibold text-foreground">{m.percentage}%</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-secondary">Why Start Now</h4>
              <ul className="space-y-1.5 text-[13px] leading-relaxed text-foreground/90">
                {whyStartNow.map((point, i) => <li key={i} className="flex gap-1.5"><span className="text-secondary" aria-hidden="true">•</span><span>{point}</span></li>)}
              </ul>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3.5">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-[10px] font-semibold uppercase tracking-wide text-secondary">Readiness Stepper — Step-by-Step Transition</h4>
              <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-accent-contrast">Front-Loaded Execution</span>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {monthlyPlan.map((row, i) => {
                const isFinalStep = i === monthlyPlan.length - 1;
                const milestoneDot = isFinalStep ? "bg-mint" : i < monthlyPlan.length / 2 ? "bg-secondary" : "bg-violet";
                return (
                  <div key={row.month} className={`rounded-md border p-2.5 ${isFinalStep ? "border-secondary bg-secondary/10" : "border-border bg-background"}`}>
                    <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide text-secondary">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${milestoneDot}`} aria-hidden="true" />Step {i + 1} · Month {row.month}
                    </div>
                    <div className="mt-0.5 text-xs font-bold text-foreground">{row.phase}</div>
                    <ul className="mt-1.5 space-y-0.5 text-[11px] text-muted-foreground">
                      {row.focusAreas.map((area, j) => <li key={j} className="flex gap-1"><span className="text-secondary" aria-hidden="true">•</span><span>{area}</span></li>)}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-secondary">Immediate Actions</h4>
            {immediateActions.length > 0 ? (
              <ul className="space-y-1 text-xs text-foreground/90">
                {immediateActions.map((action, i) => (
                  <li key={i} className="flex gap-1.5"><span className="text-secondary" aria-hidden="true">•</span>
                    {action.url ? <a href={action.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-secondary">{action.label}</a> : <span>{action.label}</span>}
                  </li>
                ))}
              </ul>
            ) : <p className="text-xs text-muted-foreground">No immediate actions identified yet.</p>}
          </div>
        </div>

        {/* G. Personalized Recommendations */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-primary">Personalized Recommendations</h3>
            <div className="mt-1 flex items-center gap-1.5"><div className="h-0.5 w-10 rounded-full bg-secondary" /><div className="h-1.5 w-1.5 rounded-full bg-mint" /></div>
          </div>
          {matchedCurriculum && (
            <div className="rounded-md border border-border bg-muted/30 p-2.5">
              <div className="mb-0.5 text-xs font-medium text-foreground">Same Curriculum Detected</div>
              <p className="text-xs text-muted-foreground">Your child is already studying in a {matchedCurriculum.includes("ib") ? "IB" : "IGCSE/Cambridge"} curriculum. Recommendations focus on continuation within the same framework rather than cross-curriculum bridging.</p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div className="rounded-md border border-mint/40 bg-mint/10 p-2.5">
              <h4 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-secondary"><GraduationCap className="h-3.5 w-3.5" />Student Checklist</h4>
              {studentChecklist.length > 0 ? (
                <ul className="space-y-0.5 text-xs text-foreground/90">{studentChecklist.map((item, i) => <li key={i} className="flex gap-1.5"><span className="text-secondary" aria-hidden="true">▪</span><span>{item}</span></li>)}</ul>
              ) : <p className="text-xs text-muted-foreground">No specific student actions identified yet.</p>}
            </div>
            <div className="rounded-md border border-violet/30 bg-violet/10 p-2.5">
              <h4 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary"><School className="h-3.5 w-3.5" />Teacher Recommendations</h4>
              {teacherRecommendations.length > 0 ? (
                <ul className="space-y-0.5 text-xs text-foreground/90">{teacherRecommendations.map((item, i) => <li key={i} className="flex gap-1.5"><span className="text-violet" aria-hidden="true">▪</span><span>{item}</span></li>)}</ul>
              ) : <p className="text-xs text-muted-foreground">No additional teacher recommendations identified yet.</p>}
            </div>
          </div>
          <div>
            <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-secondary">Learning Resources</h4>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <div className="rounded-md border border-border bg-muted/20 p-2.5"><h5 className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-secondary"><BookOpen className="h-3.5 w-3.5" />eBooks</h5><p className="text-xs text-muted-foreground">No eBooks available yet.</p></div>
              <div className="rounded-md border border-border bg-muted/20 p-2.5"><h5 className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-secondary"><Youtube className="h-3.5 w-3.5" />YouTube Channels</h5><p className="text-xs text-muted-foreground">No YouTube channels available yet.</p></div>
              <div className="rounded-md border border-border bg-muted/20 p-2.5"><h5 className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-secondary"><FileQuestion className="h-3.5 w-3.5" />Question Banks</h5><p className="text-xs text-muted-foreground">No question banks available yet.</p></div>
            </div>
          </div>
          <div>
            <h4 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-secondary"><Globe2 className="h-3.5 w-3.5" />Cultural Adaptation</h4>
            {culturalTips.length > 0 ? (
              <ul className="grid grid-cols-1 gap-x-6 gap-y-1 text-xs text-foreground/90 sm:grid-cols-2">
                {culturalTips.map((tip, i) => <li key={i} className="flex gap-1.5"><span className="text-violet" aria-hidden="true">•</span><span>{tip}</span></li>)}
              </ul>
            ) : <p className="text-xs text-muted-foreground">No cultural adaptation guidance available yet.</p>}
          </div>
        </div>

        {/* H. FAQ */}
        <div className="space-y-2.5">
          <div>
            <h3 className="flex items-center gap-1.5 text-lg font-bold text-primary"><MessageCircleQuestion className="h-4 w-4 text-secondary" />Quick Questions Parents Often Ask</h3>
            <div className="mt-1 flex items-center gap-1.5"><div className="h-0.5 w-10 rounded-full bg-secondary" /><div className="h-1.5 w-1.5 rounded-full bg-mint" /></div>
          </div>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full border-collapse text-xs">
              <thead><tr className="bg-primary text-primary-foreground"><th scope="col" className="px-3 py-1.5 text-left font-semibold">Question</th><th scope="col" className="px-3 py-1.5 text-left font-semibold">Short Answer</th></tr></thead>
              <tbody>
                {faq.map((item, i) => (
                  <tr key={item.question} className={i % 2 === 1 ? "bg-muted/40" : undefined}>
                    <td className="border-t border-border px-3 py-2 align-top font-medium">{item.question}</td>
                    <td className="border-t border-border px-3 py-2 align-top text-muted-foreground">{item.answer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* I. Tutor/counselor note */}
        <div className="p-2.5 bg-muted/30 rounded-lg border border-border text-center">
          <p className="text-xs text-muted-foreground italic">
            This report can be used by tutors or academic counselors to guide structured transition planning.
          </p>
        </div>

        {/* Shared-view attribution */}
        {sharedBanner && (
          <div className="flex items-center justify-center gap-1.5 pt-2">
            <GitCompareArrows className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[11px] text-muted-foreground">Powered by Globiculum · AI Curriculum Transition Platform</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReportView;
