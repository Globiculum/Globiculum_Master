import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FileText, Download, ArrowLeft, Target, AlertTriangle, Loader2, GitCompareArrows, Layers } from "lucide-react";
import ReportComparison from "@/components/ReportComparison";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateReportPDF } from "@/lib/generateReportPDF";
import { mergeWithBaseline } from "@/lib/gradeBaselineTopics";
import { getGapReason } from "@/lib/gapExplanations";
import ReportGenerationLoader, { type LoaderPersona } from "@/components/assessment/shared/ReportGenerationLoader";
import globiculumLogo from "@/assets/globiculum-logo.png";

const PERSONA_STORAGE_KEY = "globiculum-selected-persona";
const getPersona = (): LoaderPersona => (sessionStorage.getItem(PERSONA_STORAGE_KEY) === "parent" ? "parent" : "student");

// Check if the goal involves Indian academic readiness (CBSE / ICSE / state board / India transition)
const isIndiaReadinessGoal = (targetGoal?: string): boolean => {
  if (!targetGoal) return true;
  return /india|cbse|icse|state[\s-]?board|ncert/i.test(targetGoal);
};

// Turns a stored option slug (e.g. "cambridge-igcse", "within-3-months") into
// readable display text, preserving known curriculum/country acronyms and
// keeping number ranges like "3-6" from being split apart.
const SLUG_ACRONYMS = new Set(["cbse", "icse", "ib", "igcse", "us", "uk", "uae", "ncert", "teks", "pyp"]);
const humanizeSlug = (value?: string): string => {
  if (!value) return "";
  return value
    .replace(/(\d+)-(\d+)/g, "$1–$2")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) =>
      SLUG_ACRONYMS.has(word.toLowerCase()) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
};

// targetGrade is stored relative to snapshotGrade ("same" | "next") — this only
// derives a display label for the already-captured value, it doesn't change how
// the assessment stores or scores the grade.
const computeTargetGradeLabel = (snapshotGrade?: string | number, targetGrade?: string): string => {
  const base = typeof snapshotGrade === "number" ? snapshotGrade : parseInt(String(snapshotGrade ?? ""), 10);
  if (!Number.isFinite(base)) return targetGrade ? humanizeSlug(targetGrade) : "";
  const target = targetGrade === "next" ? base + 1 : base;
  return `Grade ${target}`;
};

// Qualitative bucket derived purely from the EXISTING readiness percentage —
// not a new scoring calculation, just a label for the summary strip.
const deriveRiskLevel = (percentage?: number): string => {
  if (typeof percentage !== "number" || Number.isNaN(percentage)) return "—";
  if (percentage >= 75) return "Low";
  if (percentage >= 50) return "Medium";
  return "High";
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- formData itself is untyped raw storage (see getFormData below)
const buildTransitionSummary = (formData: any): string => {
  const currentCountry = formData.snapshotLocation === "us" ? "US" : humanizeSlug(formData.snapshotLocation) || "Current Location";
  const currentState = formData.snapshotLocation === "us" && formData.usState && formData.usState !== "other"
    ? humanizeSlug(formData.usState)
    : "";
  const currentCurriculum = humanizeSlug(formData.currentCurriculum);
  const currentGrade = formData.snapshotGrade ? `Grade ${formData.snapshotGrade}` : "";
  const currentDetail = [currentState, currentCurriculum, currentGrade].filter(Boolean).join(", ");
  const currentLabel = currentDetail ? `${currentCountry} (${currentDetail})` : currentCountry;

  const targetGradeLabel = computeTargetGradeLabel(formData.snapshotGrade, formData.targetGrade);
  const targetCurriculum = humanizeSlug(formData.targetGoal);
  const targetDetail = [targetCurriculum, targetGradeLabel].filter(Boolean).join(", ");
  const targetLabel = isIndiaReadinessGoal(formData.targetGoal)
    ? `India${targetDetail ? ` (${targetDetail})` : ""}`
    : targetDetail || "Target Curriculum";

  return `${currentLabel} → ${targetLabel}`;
};

// Only surfaces fields the assessment actually captures — no fabricated
// school name or calendar date, just honestly-labeled proxies (school stage,
// bucketed timeline) for the two reference fields with no backing data.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- formData itself is untyped raw storage (see getFormData below)
const buildProfileRows = (formData: any): { label: string; value: string }[] => {
  const firstName = formData.childName || formData.studentName;
  const lastName = formData.childLastName || formData.studentLastName;
  const name = [firstName, lastName].filter(Boolean).join(" ") || "—";
  const schoolStageLabel = formData.schoolStage ? `${humanizeSlug(formData.schoolStage)} School` : "—";
  const languages = Array.isArray(formData.selectedLanguages) && formData.selectedLanguages.length > 0
    ? formData.selectedLanguages.map((l: string) => humanizeSlug(l)).join(", ")
    : "—";
  return [
    { label: "Name", value: name },
    { label: "Age", value: formData.snapshotAge ? String(formData.snapshotAge) : "—" },
    { label: "School Stage", value: schoolStageLabel },
    { label: "Current Curriculum", value: humanizeSlug(formData.currentCurriculum) || "—" },
    { label: "Target Curriculum", value: humanizeSlug(formData.targetGoal) || "—" },
    { label: "Transition Timeline", value: humanizeSlug(formData.timeline) || "—" },
    { label: "Language(s)", value: languages },
  ];
};

// Per-subject alignment % derived from the EXISTING topicsCovered/totalTopics
// ratio already returned by the analysis — not a new score, just a display %.
const summarizeSubjects = (analysis: AnalysisData) => {
  const withPercentage = analysis.subjectAnalysis.map((s) => ({
    ...s,
    percentage: s.totalTopics > 0 ? Math.round((s.topicsCovered / s.totalTopics) * 100) : 0,
  }));
  const strong = withPercentage.filter((s) => s.alignmentLevel === "strong");
  const moderate = withPercentage.filter((s) => s.alignmentLevel === "moderate");
  const critical = withPercentage.filter((s) => s.alignmentLevel === "high_gap");
  const weakest = [...withPercentage].sort((a, b) => a.percentage - b.percentage)[0];
  return { withPercentage, strong, moderate, critical, weakest };
};

const joinNames = (items: { subject: string }[]): string => items.map((s) => s.subject).join(", ");

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- formData itself is untyped raw storage (see getFormData below)
const buildExecutiveSummary = (formData: any, analysis: AnalysisData): string[] => {
  const { strong, moderate, critical, weakest } = summarizeSubjects(analysis);
  const percentage = analysis.overallAlignment.percentage;
  const risk = deriveRiskLevel(percentage);
  const duration = analysis.overallAlignment.estimatedDuration;
  const currentCurriculum = humanizeSlug(formData.currentCurriculum) || "the current curriculum";
  const currentGrade = formData.snapshotGrade ? `Grade ${formData.snapshotGrade}` : "the current grade level";
  const targetCurriculum = humanizeSlug(formData.targetGoal) || "the target curriculum";
  const targetGradeLabel = computeTargetGradeLabel(formData.snapshotGrade, formData.targetGrade) || "the target grade";

  const paragraphs: string[] = [];

  let p1 = `This transition assessment indicates a ${risk} overall risk with a ${percentage}% readiness score — reflecting how much of ${targetCurriculum} ${targetGradeLabel} expectations are already in place from the student's ${currentCurriculum} ${currentGrade} record.`;
  if (strong.length > 0) {
    p1 += ` ${joinNames(strong)} ${strong.length === 1 ? "is" : "are"} strong, directly transferable foundation${strong.length === 1 ? "" : "s"} that need${strong.length === 1 ? "s" : ""} only light bridging.`;
  }
  paragraphs.push(p1);

  const p2parts: string[] = [];
  if (moderate.length > 0) {
    p2parts.push(`${joinNames(moderate)} need${moderate.length === 1 ? "s" : ""} moderate reinforcement.`);
  }
  if (critical.length > 0) {
    p2parts.push(`${joinNames(critical)} ${critical.length === 1 ? "is" : "are"} the clear priorit${critical.length === 1 ? "y" : "ies"} and should receive the majority of the preparation window.`);
  }
  if (p2parts.length > 0) paragraphs.push(p2parts.join(" "));

  let p3 = `With a structured, front-loaded bridge plan, the student is well-positioned to enter ${targetCurriculum} ${targetGradeLabel} on schedule within the estimated ${duration} preparation window.`;
  if (weakest) {
    p3 += ` ${weakest.subject}, currently at ${weakest.percentage}% alignment, should be the first focus area.`;
  }
  paragraphs.push(p3);

  return paragraphs;
};

const buildKeyTakeaways = (analysis: AnalysisData): string[] => {
  const { strong, moderate, critical, weakest } = summarizeSubjects(analysis);
  const bullets: string[] = [];

  if (strong.length > 0) {
    bullets.push(`${joinNames(strong)} need${strong.length === 1 ? "s" : ""} only light bridging — already strongly aligned with target expectations.`);
  }
  if (moderate.length > 0) {
    bullets.push(`${joinNames(moderate)} require${moderate.length === 1 ? "s" : ""} targeted, moderate preparation.`);
  }
  if (weakest) {
    bullets.push(`${weakest.subject} is the single most important prep area, currently at ${weakest.percentage}% alignment.`);
  }
  bullets.push(`Estimated preparation window: ${analysis.overallAlignment.estimatedDuration}.`);
  if (analysis.criticalGaps.length > 0) {
    bullets.push(`${analysis.criticalGaps.length} critical gap${analysis.criticalGaps.length === 1 ? "" : "s"} identified and should be front-loaded before the transition starts.`);
  }

  return bullets;
};

// Presentational relabelings of the EXISTING alignmentLevel field — not a new
// scoring system. There is no per-subject numeric week estimate in the
// analysis data, so catch-up speed is shown qualitatively rather than a
// fabricated week count.
const SUBJECT_CONFIDENCE_LABEL: Record<SubjectAnalysis["alignmentLevel"], string> = {
  strong: "High Confidence",
  moderate: "Medium Confidence",
  high_gap: "Low Confidence",
};

const SUBJECT_PACE_LABEL: Record<SubjectAnalysis["alignmentLevel"], string> = {
  strong: "Quick Review",
  moderate: "Moderate Prep",
  high_gap: "Extended Prep",
};

const SUBJECT_DIFFICULTY: Record<SubjectAnalysis["alignmentLevel"], { level: string; explanation: string }> = {
  strong: {
    level: "Low",
    explanation: "Underlying concepts transfer well — remaining gaps are narrow and should close quickly with light, focused practice.",
  },
  moderate: {
    level: "Medium",
    explanation: "Core concepts are learnable, but some content and assessment style will be new — steady, regular practice is recommended.",
  },
  high_gap: {
    level: "High",
    explanation: "This subject needs structured, front-loaded preparation across multiple topics to reach grade-level readiness.",
  },
};

// No per-subject "strengths" list exists in the analysis data — only
// topicsCovered/totalTopics and keyGaps. This surfaces what's actually known
// rather than inventing specific topic names.
const buildSubjectStrengths = (subject: SubjectAnalysis): string[] => {
  const bullets: string[] = [`${subject.topicsCovered} of ${subject.totalTopics} target topics already covered.`];
  if (subject.alignmentLevel === "strong") {
    bullets.push("No significant gaps identified in this subject.");
  } else if (subject.keyGaps.length === 0) {
    bullets.push("No specific gap topics flagged for this subject yet.");
  }
  return bullets;
};

// Only gaps that already carry a real resourceUrl (from the curriculum
// database, via keyGaps) become resource links — nothing is invented.
const buildSubjectResources = (subject: SubjectAnalysis): { label: string; url: string }[] =>
  subject.keyGaps
    .map((gap) => ({ label: getGapTopic(gap), url: getGapUrl(gap) }))
    .filter((r): r is { label: string; url: string } => !!r.url);

// Three metrics from ONLY existing fields: readiness is the existing overall
// percentage; academic risk is its direct complement; transition risk is the
// existing subjectsNeedingBridge count as a share of all assessed subjects.
// No independent risk score is invented.
const deriveRiskMetrics = (analysis: AnalysisData): { label: string; percentage: number; tone: "positive" | "risk" }[] => {
  const readiness = Math.max(0, Math.min(100, analysis.overallAlignment.percentage));
  const academicRisk = 100 - readiness;
  const totalSubjects = analysis.subjectAnalysis.length;
  const needingBridge = analysis.overallAlignment.subjectsNeedingBridge?.length ?? 0;
  const transitionRisk = totalSubjects > 0 ? Math.round((needingBridge / totalSubjects) * 100) : academicRisk;
  return [
    { label: "Academic Risk", percentage: academicRisk, tone: "risk" },
    { label: "Transition Risk", percentage: transitionRisk, tone: "risk" },
    { label: "Exam Readiness", percentage: readiness, tone: "positive" },
  ];
};

// Total prep months come from the bridge timeline's own phase durations
// (e.g. "Months 7-8") or, failing that, the overall estimatedDuration string
// — never a fixed/invented number.
const extractMonthCount = (analysis: AnalysisData): number => {
  const candidates = [analysis.bridgeTimeline?.phase3?.duration, analysis.overallAlignment?.estimatedDuration].filter(
    (v): v is string => !!v
  );
  for (const text of candidates) {
    const numbers = (text.match(/\d+/g) ?? []).map(Number);
    if (numbers.length > 0) return Math.max(1, ...numbers);
  }
  return 3;
};

// Splits an existing bullet list across N months as evenly as possible —
// pure redistribution of real content, no new bullets are written.
const distributeAcrossMonths = <T,>(items: T[], monthCount: number): T[][] => {
  if (monthCount <= 0) return [];
  if (items.length === 0) return Array.from({ length: monthCount }, () => [] as T[]);
  if (items.length >= monthCount) {
    const result: T[][] = Array.from({ length: monthCount }, () => [] as T[]);
    items.forEach((item, i) => {
      const bucket = Math.min(monthCount - 1, Math.floor((i * monthCount) / items.length));
      result[bucket].push(item);
    });
    return result;
  }
  return Array.from({ length: monthCount }, () => items);
};

// Completion % is a plain linear month/total ramp reaching exactly 100% at
// the final month — a timeline position, not a new readiness calculation.
// Each month is assigned to whichever real bridgeTimeline phase covers it
// (parsed from that phase's own "Months X-Y" range), and that phase's real
// bullets are distributed across its months for the Focus Areas column.
const buildMonthlyBridgePlan = (
  analysis: AnalysisData
): { phase: string; month: number; focusAreas: string; percentage: number }[] => {
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
        const base = Math.floor(monthCount / 3);
        const remainder = monthCount % 3;
        let cursor = 1;
        return [0, 1, 2].map((i) => {
          const span = base + (i < remainder ? 1 : 0);
          const start = cursor;
          const end = Math.max(start, cursor + span - 1);
          cursor += span;
          return [start, end] as [number, number];
        });
      })();

  const bulletsPerPhaseMonth = phaseSpans.map(([start, end], i) => {
    const span = Math.max(1, end - start + 1);
    return distributeAcrossMonths(phases[i].bullets, span);
  });

  return Array.from({ length: monthCount }, (_, idx) => {
    const month = idx + 1;
    const percentage = month === monthCount ? 100 : Math.round((month / monthCount) * 100);
    let phaseIndex = phaseSpans.findIndex(([start, end]) => month >= start && month <= end);
    if (phaseIndex === -1) phaseIndex = phaseSpans.length - 1;
    const [start] = phaseSpans[phaseIndex];
    const offsetInPhase = Math.min(month - start, bulletsPerPhaseMonth[phaseIndex].length - 1);
    const bullets = bulletsPerPhaseMonth[phaseIndex][Math.max(0, offsetInPhase)] ?? [];
    return {
      phase: phases[phaseIndex].name,
      month,
      focusAreas: bullets.join(" · ") || phases[phaseIndex].name,
      percentage,
    };
  });
};

const buildWhyStartNow = (analysis: AnalysisData): string => {
  const topGaps = analysis.criticalGaps.slice(0, 2).map(getGapTopic);
  const duration = analysis.overallAlignment.estimatedDuration;
  if (topGaps.length === 0) {
    return `Beginning preparation now keeps the plan on track for the estimated ${duration} timeline, rather than compressing everything into the final weeks.`;
  }
  const gapPhrase = topGaps.join(" and ");
  const plural = analysis.criticalGaps.length > 1;
  return `The highest-priority gap${plural ? "s" : ""} — ${gapPhrase} — carr${plural ? "y" : "ies"} the greatest academic impact and should be addressed first. Starting preparation now keeps the overall plan on track for the estimated ${duration} timeline, rather than compressing everything into the final weeks.`;
};

const buildRoadmapExplanation = (analysis: AnalysisData): string => {
  const topGaps = analysis.criticalGaps.slice(0, 2).map(getGapTopic);
  const duration = analysis.overallAlignment.estimatedDuration;
  const phase1Name = analysis.bridgeTimeline.phase1.name;
  const phase3Name = analysis.bridgeTimeline.phase3.name;
  const gapPhrase = topGaps.length > 0 ? topGaps.join(" and ") : "The highest-priority gaps";
  return `The roadmap is front-loaded deliberately: ${gapPhrase} carr${topGaps.length === 1 ? "ies" : "y"} the greatest academic risk, so ${topGaps.length > 0 ? "they are" : "it is"} addressed early under ${phase1Name}. The remaining months build toward ${phase3Name.toLowerCase()}, confirming readiness well ahead of the end of the estimated ${duration} preparation window.`;
};

// Prioritizes real resource links, then falls back to real study/skill tips —
// nothing here is generated, only reused from the existing recommendations.
const buildImmediateActions = (analysis: AnalysisData): { label: string; url?: string }[] => {
  const actions: { label: string; url?: string }[] = [];
  analysis.recommendations.resources.slice(0, 2).forEach((r) => {
    actions.push({ label: getResName(r), url: getResUrl(r) });
  });
  analysis.recommendations.study.slice(0, 2).forEach((s) => actions.push({ label: s }));
  analysis.recommendations.skillStrategy.slice(0, 2).forEach((s) => actions.push({ label: s }));
  return actions.slice(0, 5);
};

// Reuses the existing student-facing study tips, plus one checklist item per
// top real critical-gap topic — no new items are written.
const buildStudentChecklist = (analysis: AnalysisData): string[] => {
  const items = [...analysis.recommendations.study];
  analysis.criticalGaps.slice(0, 2).forEach((gap) => items.push(`Review ${getGapTopic(gap)}.`));
  return items.slice(0, 6);
};

// Reuses the existing skill-strategy and cultural/classroom-adaptation tips —
// both are already framed as guidance for whoever is supporting the student,
// which fits a teacher/school audience.
const buildTeacherRecommendations = (analysis: AnalysisData): string[] =>
  [...analysis.recommendations.skillStrategy, ...analysis.recommendations.culturalLanguage].slice(0, 6);

// Combines the two real resource sources: report-level recommendations.resources
// and per-subject keyGaps[].resourceUrl — deduped, nothing invented.
const buildLearningResources = (analysis: AnalysisData): { label: string; url?: string }[] => {
  const fromRecommendations = analysis.recommendations.resources.map((r) => ({ label: getResName(r), url: getResUrl(r) }));
  const fromGaps = analysis.subjectAnalysis.flatMap((s) =>
    s.keyGaps.map((g) => ({ label: getGapTopic(g), url: getGapUrl(g) })).filter((r) => !!r.url)
  );
  const seen = new Set<string>();
  return [...fromRecommendations, ...fromGaps]
    .filter((r) => {
      const key = r.url || r.label;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
};

// Every subject's alignment % is real. There is no per-subject "study hours"
// field anywhere in the backend response, so hour figures below are an
// ESTIMATE constructed from that real gap size — disclosed via the on-page
// captions, not a hidden score. HOURS_PER_WEEK_AT_FULL_GAP and the weekly
// taper are fixed, transparent planning assumptions, not derived data.
const HOURS_PER_WEEK_AT_FULL_GAP = 5;
const WEEKLY_PLAN_WEEKS = 4;
const WEEKLY_PLAN_TAPER = [1, 0.9, 0.8, 0.7];

const subjectGapPercentages = (analysis: AnalysisData): { subject: string; percentage: number }[] =>
  analysis.subjectAnalysis.map((s) => ({
    subject: s.subject,
    percentage: s.totalTopics > 0 ? Math.round((s.topicsCovered / s.totalTopics) * 100) : 0,
  }));

// Total estimated hours per subject to close its gap, scaled against the
// report's own real estimated preparation length (via extractMonthCount).
const buildStudyHoursToCloseGaps = (analysis: AnalysisData): { subject: string; hours: number }[] => {
  const totalWeeks = extractMonthCount(analysis) * 4;
  return subjectGapPercentages(analysis).map(({ subject, percentage }) => ({
    subject,
    hours: Math.round(((100 - percentage) / 100) * totalWeeks * HOURS_PER_WEEK_AT_FULL_GAP),
  }));
};

// A near-term (4-week) weekly hour allocation per subject, front-loaded then
// tapering — the same disclosed, uniform taper applied to every subject.
const buildWeeklyStudyPlan = (
  analysis: AnalysisData
): { subjects: string[]; rows: { week: number; hours: number[] }[] } => {
  const subjects = subjectGapPercentages(analysis);
  const baseWeeklyHours = subjects.map(({ percentage }) => Math.max(1, Math.round(((100 - percentage) / 100) * 6)));
  const rows = Array.from({ length: WEEKLY_PLAN_WEEKS }, (_, weekIdx) => ({
    week: weekIdx + 1,
    hours: baseWeeklyHours.map((h) => Math.max(1, Math.round(h * WEEKLY_PLAN_TAPER[weekIdx]))),
  }));
  return { subjects: subjects.map((s) => s.subject), rows };
};

const buildWeeklyPlanCaption = (analysis: AnalysisData): string => {
  const hoursToClose = buildStudyHoursToCloseGaps(analysis);
  if (hoursToClose.length === 0) return "";
  const heaviest = [...hoursToClose].sort((a, b) => b.hours - a.hours)[0];
  return `${heaviest.subject} carries the heaviest weekly load, tapering gradually across the plan as practice builds fluency in every subject.`;
};

const VerticalHoursChart = ({ data }: { data: { subject: string; hours: number }[] }) => {
  const max = Math.max(...data.map((d) => d.hours), 1);
  return (
    <div className="flex h-40 items-end gap-3 border-b border-l border-border pb-1 pl-2">
      {data.map((d) => (
        <div key={d.subject} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <span className="text-xs font-semibold text-foreground">{d.hours}h</span>
          <div
            className={`w-full max-w-[48px] rounded-t-sm ${d.hours === max && max > 0 ? "bg-accent" : "bg-primary"}`}
            style={{ height: `${Math.max((d.hours / max) * 100, 4)}%` }}
          />
          <span className="mt-1 text-center text-[10px] leading-tight text-muted-foreground">{d.subject}</span>
        </div>
      ))}
    </div>
  );
};

// Short, real-data-driven answers — no fabricated dates/weeks, only the
// report's own duration, phase name, and risk level.
const buildParentFAQ = (analysis: AnalysisData): { question: string; answer: string }[] => {
  const { critical } = summarizeSubjects(analysis);
  const duration = analysis.overallAlignment.estimatedDuration;
  const risk = deriveRiskLevel(analysis.overallAlignment.percentage);
  const phase1Name = analysis.bridgeTimeline.phase1.name;

  const tutorAnswer =
    critical.length > 0
      ? `Not required, but recommended for ${critical[0].subject} specifically.`
      : "Not required based on the current assessment — self-guided study should be sufficient.";

  const lateStartAnswer = `Still workable — compress the ${phase1Name} phase and consider a tutor if the timeline shortens further.`;

  const enoughTimeAnswer =
    risk === "High"
      ? "It will be tight — prioritizing the highest-impact gaps early is recommended."
      : "Yes, at the pace in this plan, with room to spare.";

  return [
    { question: "Do we need a tutor?", answer: tutorAnswer },
    { question: "What if we start late?", answer: lateStartAnswer },
    { question: `Is ${duration} really enough?`, answer: enoughTimeAnswer },
  ];
};

const CompletionAreaChart = ({ data }: { data: { month: number; percentage: number }[] }) => {
  const width = 640;
  const height = 170;
  const paddingX = 28;
  const paddingTop = 26;
  const paddingBottom = 22;
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingTop - paddingBottom;
  const n = data.length;
  const xFor = (i: number) => paddingX + (n === 1 ? plotWidth / 2 : (i / (n - 1)) * plotWidth);
  const yFor = (pct: number) => paddingTop + plotHeight - (pct / 100) * plotHeight;
  const points = data.map((d, i) => ({ x: xFor(i), y: yFor(d.percentage), ...d }));
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + plotHeight} L ${points[0].x} ${paddingTop + plotHeight} Z`
      : "";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Expected preparation completion percentage by month">
      {[0, 50, 100].map((gridPct) => (
        <line key={gridPct} x1={paddingX} x2={width - paddingX} y1={yFor(gridPct)} y2={yFor(gridPct)} stroke="hsl(var(--border))" strokeWidth={1} />
      ))}
      {areaPath && <path d={areaPath} fill="hsl(var(--secondary))" fillOpacity={0.12} stroke="none" />}
      <path d={linePath} fill="none" stroke="hsl(var(--secondary))" strokeWidth={2} />
      {points.map((p) => (
        <g key={p.month}>
          <circle cx={p.x} cy={p.y} r={3.5} fill="hsl(var(--secondary))" />
          <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize={11} fontWeight={700} fill="hsl(var(--foreground))">
            {p.percentage}%
          </text>
          <text x={p.x} y={height - 6} textAnchor="middle" fontSize={10} fill="hsl(var(--muted-foreground))">
            Month {p.month}
          </text>
        </g>
      ))}
    </svg>
  );
};

const ReadinessDonut = ({ percentage }: { percentage: number }) => {
  const size = 148;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, Number.isFinite(percentage) ? percentage : 0));
  const offset = circumference * (1 - clamped / 100);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--secondary))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-foreground">{Math.round(clamped)}%</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Readiness</span>
      </div>
    </div>
  );
};

// Gap items: AI returns either a plain string (legacy) or { topic, resourceUrl? }
type GapItem = string | { topic: string; resourceUrl?: string };
// Resource items: AI returns either a plain string (legacy) or { name, url? }
type ResourceItem = string | { name: string; url?: string };

const getGapTopic   = (g: GapItem): string           => typeof g === 'string' ? g : g.topic;
const getGapUrl     = (g: GapItem): string | undefined => typeof g === 'string' ? undefined : g.resourceUrl;
const getResName    = (r: ResourceItem): string           => typeof r === 'string' ? r : r.name;
const getResUrl     = (r: ResourceItem): string | undefined => typeof r === 'string' ? undefined : r.url;

interface SubjectAnalysis {
  subject: string;
  topicsCovered: number;
  totalTopics: number;
  alignmentLevel: "strong" | "moderate" | "high_gap";
  keyGaps: GapItem[];
}

interface TimelinePhase {
  name: string;
  duration: string;
  bullets: string[];
}

interface AnalysisData {
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

const STORAGE_KEY_FORM = 'assessment-form-data';
const STORAGE_KEY_ANALYSIS = 'saved-report-analysis';
const STORAGE_KEY_REPORT_ID = 'saved-report-id';

// Dev-only escape hatch for `/report-preview?dev=true`, used while the local
// Supabase Edge Function CORS deployment is out of date and real assessment
// submission (validate-student-data) can't complete locally. import.meta.env.DEV
// is statically false in production builds, so this branch is compiled out —
// it can never activate outside a local Vite dev server, and it only ever
// fills in for MISSING real form/analysis data, never overrides it.
const isDevPreviewRequested = (search: string): boolean => {
  if (!import.meta.env.DEV) return false;
  try {
    return new URLSearchParams(search).get("dev") === "true";
  } catch {
    return false;
  }
};

// Structurally identical to real formData (see AssessmentFormData / parentMapper)
// so every section renders exactly as it would with a real submission.
const DEV_MOCK_FORM_DATA = {
  studentName: "Aarav",
  studentLastName: "Menon",
  snapshotAge: "10",
  schoolStage: "middle",
  snapshotGrade: "5",
  snapshotLocation: "us",
  usState: "texas",
  currentCurriculum: "us-common-core",
  targetGoal: "cbse",
  targetGrade: "next",
  timeline: "3-6-months",
  selectedLanguages: ["english", "hindi"],
  academicPath: ["Math", "Science"],
};

// Structurally identical to a real AnalysisData response from analyze-curriculum.
const DEV_MOCK_ANALYSIS: AnalysisData = {
  overallAlignment: {
    percentage: 72,
    subjectsNeedingBridge: ["Science", "Social Science"],
    estimatedDuration: "5 Months",
  },
  subjectAnalysis: [
    { subject: "Mathematics", topicsCovered: 18, totalTopics: 20, alignmentLevel: "strong", keyGaps: [] },
    { subject: "Science", topicsCovered: 12, totalTopics: 20, alignmentLevel: "moderate", keyGaps: ["Diagram-based question practice"] },
    { subject: "English", topicsCovered: 16, totalTopics: 20, alignmentLevel: "strong", keyGaps: [] },
    { subject: "Social Science", topicsCovered: 7, totalTopics: 20, alignmentLevel: "high_gap", keyGaps: ["Indian History", "Civics", "Geography"] },
  ],
  criticalGaps: ["Indian History", "Civics & Governance"],
  bridgeTimeline: {
    phase1: { name: "Foundation", duration: "Month 1-2", bullets: ["Introduce Indian History timeline"] },
    phase2: { name: "Building", duration: "Month 3-4", bullets: ["Deepen Social Science coverage"] },
    phase3: { name: "Consolidation", duration: "Month 5", bullets: ["Practice CBSE-style assessments"] },
  },
  recommendations: {
    study: ["Daily Social Science reading"],
    skillStrategy: ["Practice diagram-based Science questions"],
    resources: ["NCERT Class 6 Social Science"],
    culturalLanguage: ["Watch Indian history documentaries"],
  },
};

const ReportPreview = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const devPreviewActive = isDevPreviewRequested(location.search);

  // Try location.state first, fallback to sessionStorage, then localStorage
  const getFormData = () => {
    // Priority 1: Navigation state
    if (location.state?.formData && Object.keys(location.state.formData).length > 0) {
      console.log("[ReportPreview] Using formData from navigation state");
      // Persist to storage for page refresh resilience
      try {
        sessionStorage.setItem(STORAGE_KEY_FORM, JSON.stringify(location.state.formData));
        localStorage.setItem(STORAGE_KEY_FORM, JSON.stringify(location.state.formData));
      } catch (e) {
        console.warn("[ReportPreview] Failed to persist formData to storage:", e);
      }
      return location.state.formData;
    }
    
    // Priority 2: Session storage
    const sessionStored = sessionStorage.getItem(STORAGE_KEY_FORM);
    if (sessionStored) {
      try {
        const parsed = JSON.parse(sessionStored);
        if (parsed && Object.keys(parsed).length > 0) {
          console.log("[ReportPreview] Using formData from sessionStorage");
          return parsed;
        }
      } catch {
        console.warn("[ReportPreview] Failed to parse sessionStorage formData");
      }
    }
    
    // Priority 3: Local storage (survives browser close)
    const localStored = localStorage.getItem(STORAGE_KEY_FORM);
    if (localStored) {
      try {
        const parsed = JSON.parse(localStored);
        if (parsed && Object.keys(parsed).length > 0) {
          console.log("[ReportPreview] Using formData from localStorage");
          // Restore to sessionStorage
          sessionStorage.setItem(STORAGE_KEY_FORM, localStored);
          return parsed;
        }
      } catch {
        console.warn("[ReportPreview] Failed to parse localStorage formData");
      }
    }
    
    if (devPreviewActive) {
      console.log("[ReportPreview] No real formData found — using dev preview mock (?dev=true)");
      return DEV_MOCK_FORM_DATA;
    }

    console.warn("[ReportPreview] No formData found in any storage");
    return {};
  };

  const getSavedAnalysis = (): AnalysisData | null => {
    // Priority 1: Navigation state (from saved reports page)
    if (location.state?.savedAnalysis) {
      console.log("[ReportPreview] Using savedAnalysis from navigation state");
      return location.state.savedAnalysis as AnalysisData;
    }

    // Priority 2: Session storage
    const stored = sessionStorage.getItem(STORAGE_KEY_ANALYSIS);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log("[ReportPreview] Using savedAnalysis from sessionStorage");
        // Clear after reading so refresh triggers new analysis
        sessionStorage.removeItem(STORAGE_KEY_ANALYSIS);
        sessionStorage.removeItem(STORAGE_KEY_REPORT_ID);
        return parsed as AnalysisData;
      } catch {
        console.warn("[ReportPreview] Failed to parse sessionStorage analysis");
        return null;
      }
    }

    if (devPreviewActive) {
      console.log("[ReportPreview] No real analysis found — using dev preview mock (?dev=true)");
      return DEV_MOCK_ANALYSIS;
    }

    return null;
  };
  
  const formData = getFormData();
  const initialSavedAnalysis = getSavedAnalysis();
  const hasValidFormData = formData && Object.keys(formData).length > 0;
  const persona = getPersona();
  
  const [isLoading, setIsLoading] = useState(!initialSavedAnalysis && hasValidFormData);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(initialSavedAnalysis);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(!!initialSavedAnalysis);
  const [redirecting, setRedirecting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const analysisStartedRef = useRef(false);
  const [previousReport, setPreviousReport] = useState<{ analysis_data: AnalysisData; created_at: string } | null>(null);
  
  const prevReportId = location.state?.prevReportId as string | undefined;

  // Redirect if no valid form data
  useEffect(() => {
    if (!hasValidFormData && !initialSavedAnalysis && !redirecting) {
      console.log("[ReportPreview] No assessment data found, redirecting to assessment");
      setRedirecting(true);
      toast.error("No assessment data found. Please complete the assessment first.");
      
      // Small delay so user sees the message
      const timer = setTimeout(() => {
        navigate("/begin-journey", { replace: true });
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [hasValidFormData, initialSavedAnalysis, navigate, redirecting]);

  // Fetch previous report for comparison
  useEffect(() => {
    if (!prevReportId) return;
    const fetchPrev = async () => {
      const { data, error } = await supabase
        .from("saved_reports" as any)
        .select("analysis_data, created_at")
        .eq("id", prevReportId)
        .single();
      if (!error && data) {
        setPreviousReport(data as any);
      }
    };
    fetchPrev();
  }, [prevReportId]);

  useEffect(() => {
    // Guard against StrictMode double-invoke and duplicate in-flight requests
    if (analysisStartedRef.current) return;
    analysisStartedRef.current = true;

    let cancelled = false;

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const normalizeOther = (value: unknown, otherValue: unknown) => {
      if (typeof value !== "string") return undefined;
      if (value === "other") {
        const v = typeof otherValue === "string" ? otherValue.trim() : "";
        return v || undefined;
      }
      return value || undefined;
    };

    const buildCurriculumFormData = (raw: any) => {
      const gradeRaw = raw?.snapshotGrade;
      const gradeNum =
        typeof gradeRaw === "number"
          ? gradeRaw
          : typeof gradeRaw === "string"
            ? Number(gradeRaw)
            : NaN;

      const snapshotGrade = Number.isFinite(gradeNum) ? gradeNum : undefined;

      const snapshotLocation =
        raw?.snapshotLocation === "other"
          ? (typeof raw?.snapshotLocationOther === "string" ? raw.snapshotLocationOther.trim() : "")
          : raw?.snapshotLocation;

      const usState = normalizeOther(raw?.usState, raw?.usStateOther);
      const currentCurriculum = normalizeOther(raw?.currentCurriculum, raw?.currentCurriculumOther);
      const targetGoal = normalizeOther(raw?.targetGoal, raw?.targetGoalOther);
      const targetCurriculum = normalizeOther(raw?.targetCurriculum, raw?.targetCurriculumOther) || targetGoal;

      const languages = [
        ...(Array.isArray(raw?.languagesSpoken)
          ? raw.languagesSpoken
          : Array.isArray(raw?.selectedLanguages)
            ? raw.selectedLanguages
            : Array.isArray(raw?.languagesAtHome)
              ? raw.languagesAtHome
              : []),
        ...(typeof raw?.customLanguage === "string" && raw.customLanguage.trim()
          ? [raw.customLanguage.trim()]
          : []),
      ]
        .filter((x: any): x is string => typeof x === "string" && x.trim().length > 0)
        .map((s) => s.trim());

      const uniqueLanguages = Array.from(new Set(languages));

      return {
        schoolStage: typeof raw?.schoolStage === "string" ? raw.schoolStage : undefined,
        snapshotGrade,
        snapshotLocation: typeof snapshotLocation === "string" ? snapshotLocation : undefined,
        usState,
        previousCountry:
          raw?.previousLocation === "other"
            ? (typeof raw?.previousLocationOther === "string" ? raw.previousLocationOther.trim() : undefined)
            : undefined,
        currentCurriculum,
        targetCurriculum,
        targetGoal,
        academicPath: Array.isArray(raw?.academicPath) ? raw.academicPath : undefined,
        strongestSubjects: Array.isArray(raw?.strongestSubjects) ? raw.strongestSubjects : undefined,
        challengingAreas: Array.isArray(raw?.challengingAreas)
          ? raw.challengingAreas
          : Array.isArray(raw?.challengingSubjects)
            ? raw.challengingSubjects
            : undefined,
        languagesSpoken: uniqueLanguages.length ? uniqueLanguages : undefined,
        transitionTimeline:
          typeof raw?.transitionTimeline === "string"
            ? raw.transitionTimeline
            : typeof raw?.timeline === "string"
              ? raw.timeline
              : undefined,
      };
    };

    const getValidAccessToken = async (): Promise<string | null> => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) return null;

      const expiresAtMs = session.expires_at ? session.expires_at * 1000 : null;
      if (expiresAtMs && expiresAtMs < Date.now() + 60_000) {
        const { data: refreshed, error } = await supabase.auth.refreshSession();
        if (error || !refreshed.session) return null;
        return refreshed.session.access_token;
      }

      return session.access_token;
    };

    const parseFunctionError = (fnError: any): { status?: number; message: string } => {
      const status = fnError?.context?.status as number | undefined;
      const body = fnError?.context?.body;

      // Best-effort JSON parsing of standardized error responses
      try {
        const parsed = typeof body === "string" ? JSON.parse(body) : body;
        const msg = parsed?.error?.message;
        const code = parsed?.error?.code;
        const firstDetail = parsed?.error?.details?.[0]?.message;
        const pretty = [msg, firstDetail].filter(Boolean).join(" — ");
        return {
          status,
          message: pretty || code || fnError?.message || "Request failed",
        };
      } catch {
        return {
          status,
          message: (typeof body === "string" && body.trim()) || fnError?.message || "Request failed",
        };
      }
    };

    const saveReportToDatabase = async (analysisData: AnalysisData) => {
      if (isSaved) return;
      try {
        // refreshSession() fires TOKEN_REFRESHED which updates the PostgREST
        // client's Authorization header — without this, auth.uid() is NULL in
        // Postgres and the RLS INSERT policy silently blocks the row.
        let userId: string | null = null;
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError && refreshData.session?.user) {
          userId = refreshData.session.user.id;
        } else {
          const { data: { session: fallback } } = await supabase.auth.getSession();
          if (!fallback?.user) {
            toast.error("Session expired. Please sign in again to save your report.");
            navigate("/auth", { replace: true });
            return;
          }
          userId = fallback.user.id;
        }
        const userData = { user: { id: userId } };

        const insertPayload: any = {
          user_id: userData.user.id,
          form_data: formData,
          analysis_data: analysisData as unknown as Record<string, unknown>,
          title: `Curriculum Alignment Report - Grade ${formData.snapshotGrade || "N/A"}`,
        };
        if (prevReportId) {
          insertPayload.prev_report_id = prevReportId;
        }
        const { data: savedReport, error: saveError } = await supabase.from("saved_reports" as any).insert(insertPayload).select("id").single();

        if (saveError) {
          console.error("Failed to save report:", saveError);
          toast.error(`Could not save report: ${saveError.message}`);
        } else {
          setIsSaved(true);
          toast.success("Report saved to your history");

          // Fire-and-forget: send report summary email
          const analysis = analysisData as Record<string, any>;
          const overallAlignment = analysis?.overallAlignment;
          const criticalGaps = analysis?.criticalGaps;

          // Fetch student name for email
          const { data: studentProfile } = await supabase
            .from("student_profiles")
            .select("student_name")
            .eq("user_id", userData.user.id)
            .maybeSingle();

          supabase.functions.invoke("send-report-email", {
            body: {
              reportId: (savedReport as any)?.id ?? "unknown",
              studentName: studentProfile?.student_name ?? formData.snapshotGrade ? `Grade ${formData.snapshotGrade} Student` : "Your Child",
              overallAlignmentPercentage: typeof overallAlignment?.percentage === "number" ? overallAlignment.percentage : 0,
              criticalGapCount: Array.isArray(criticalGaps) ? criticalGaps.length : 0,
              estimatedBridgeDuration: overallAlignment?.estimatedDuration ?? "3–6 months",
              reportTitle: `Curriculum Alignment Report - Grade ${formData.snapshotGrade || "N/A"}`,
            },
          }).then(({ error }) => {
            if (error) console.error("[ReportPreview] Email send failed:", error);
            else console.log("[ReportPreview] Report summary email sent");
          }).catch((err) => {
            console.error("[ReportPreview] Email fire-and-forget error:", err);
          });
        }

        // Also update the assessment record with the full analysis result
        const assessmentId = location.state?.assessmentId;
        if (assessmentId) {
          const { error: updateError } = await supabase
            .from("assessments")
            .update({
              assessment_data: { ...formData, analysisResult: analysisData } as any,
              status: "completed",
            })
            .eq("id", assessmentId);

          if (updateError) {
            console.error("Failed to update assessment with analysis:", updateError);
          } else {
            console.log("[ReportPreview] Assessment updated with analysis result");
          }
        }
      } catch (err) {
        console.error("Error saving report:", err);
      }
    };

    const analyzeAlignment = async () => {
      // Skip if redirecting due to missing data
      if (!hasValidFormData) {
        console.log("[ReportPreview] Skipping analysis - no valid form data");
        return;
      }
      
      // Skip if we already have a saved analysis
      if (initialSavedAnalysis) {
        console.log("[ReportPreview] Using saved analysis from state/storage");
        setIsLoading(false);
        return;
      }

      const MAX_RETRIES = 2;

      setIsLoading(true);
      setError(null);
      setAnalysis(null);

      console.log("[ReportPreview] Starting curriculum analysis with form data:", formData);

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        console.log(`[ReportPreview] Attempt ${attempt + 1}/${MAX_RETRIES + 1}`);
        
        try {
          const accessToken = await getValidAccessToken();
          if (!accessToken) {
            console.error("[ReportPreview] No valid access token, redirecting to auth");
            await supabase.auth.signOut();
            navigate("/auth", { replace: true });
            return;
          }

          const safeFormData = buildCurriculumFormData(formData);
          console.log("[ReportPreview] Sending sanitized payload:", safeFormData);

          const { data, error: fnError } = await supabase.functions.invoke("analyze-curriculum", {
            body: { formData: safeFormData },
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "X-API-Version": "v1",
            },
          });

          console.log("[ReportPreview] Response received:", { data, fnError });

          if (fnError) {
            const { status, message } = parseFunctionError(fnError);
            console.error("[ReportPreview] Function error:", { status, message, fnError });

            // Retry once on auth/network-ish failures
            if ((status === 401 || status === 500) && attempt < MAX_RETRIES) {
              console.log("[ReportPreview] Retrying due to status", status);
              await sleep(800 + attempt * 700);
              continue;
            }

            throw new Error(message);
          }

          // Handle wrapped response format from createSuccessResponse
          const responseData = (data as any)?.data ?? data;
          
          if ((responseData as any)?.error) {
            const errMsg = (responseData as any).error.message || (responseData as any).error;
            console.error("[ReportPreview] Response contains error:", errMsg);
            throw new Error(errMsg);
          }

          const nextAnalysis = responseData?.analysis;
          console.log("[ReportPreview] Extracted analysis:", nextAnalysis);

          if (responseData?._meta) {
            console.log("[ReportPreview] RAG meta:", responseData._meta);
            if (responseData._meta.debug_logs) {
              console.log("[ReportPreview] Debug logs:", responseData._meta.debug_logs);
              console.table(responseData._meta.debug_logs);
            }
          }
          
          if (!nextAnalysis) {
            console.error("[ReportPreview] No analysis in response. Full response:", data);
            throw new Error("No analysis data received from AI. Please try again.");
          }

          if (!cancelled) {
            console.log("[ReportPreview] Setting analysis and saving to database");
            setAnalysis(nextAnalysis);
            // Auto-save the report
            saveReportToDatabase(nextAnalysis);
          }
          return;
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to analyze curriculum";
          console.error("[ReportPreview] Catch block error:", message, err);

          // Retry only on fetch-like failures
          const retryable =
            attempt < MAX_RETRIES &&
            (err instanceof TypeError || message.toLowerCase().includes("fetch") || message.toLowerCase().includes("network"));

          if (retryable) {
            console.log("[ReportPreview] Retrying due to network error");
            await sleep(1000 + attempt * 800);
            continue;
          }

          if (!cancelled) {
            setError(message);
            toast.error(message);
          }
          return;
        } finally {
          if (!cancelled) {
            setIsLoading(false);
          }
        }
      }

      if (!cancelled) setIsLoading(false);
    };

    analyzeAlignment();

    return () => {
      cancelled = true;
    };
  }, [formData, navigate, hasValidFormData, initialSavedAnalysis]);

  const handleDownloadPDF = async () => {
    if (!analysis || !reportRef.current) return;
    try {
      await generateReportPDF(reportRef.current);
      toast.success("PDF downloaded successfully!");
    } catch {
      toast.error("Failed to generate PDF. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assessment
          </Button>

          {redirecting ? (
            <Card className="border border-border">
              <CardContent role="status" aria-live="polite" className="flex flex-col items-center justify-center py-16 space-y-4">
                <div className="relative">
                  <div className="relative p-4 bg-muted rounded-full">
                    <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" aria-hidden="true" />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <h1 className="text-lg font-semibold">No Assessment Data Found</h1>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Redirecting you to the assessment form...
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <ReportGenerationLoader persona={persona} />
          ) : error ? (
            <Card className="border border-destructive/20">
              <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
                <div className="p-3 bg-destructive/10 rounded-full">
                  <AlertTriangle className="h-10 w-10 text-destructive" />
                </div>
                <h1 className="text-lg font-semibold">Analysis Failed</h1>
                <p className="text-sm text-muted-foreground text-center max-w-sm">{error}</p>
                <Button onClick={() => window.location.reload()} size="sm">Try Again</Button>
              </CardContent>
            </Card>
          ) : (
            <div ref={reportRef}>
            <Card className="border border-border overflow-hidden">
            {/* A. Report Header */}
              <div className="bg-primary px-5 py-6 sm:px-8 sm:py-7">
                <img src={globiculumLogo} alt="Globiculum" className="h-7 w-auto brightness-0 invert mb-4" />
                <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-primary-foreground">
                  Curriculum Gap Analysis Report
                </h1>
                <p className="mt-1.5 text-sm sm:text-base font-medium text-mint">
                  {buildTransitionSummary(formData)}
                </p>
              </div>

              <CardContent className="space-y-6 pt-6">
                {/* B. Student & Transition Profile + Overall Readiness */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <div className="lg:col-span-2">
                    <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Target className="h-3.5 w-3.5" aria-hidden="true" />
                      Student &amp; Transition Profile
                    </h2>
                    <div className="overflow-x-auto rounded-md border border-border">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-primary text-primary-foreground">
                            <th scope="col" className="w-2/5 px-3 py-2 text-left font-semibold">Field</th>
                            <th scope="col" className="px-3 py-2 text-left font-semibold">Detail</th>
                          </tr>
                        </thead>
                        <tbody>
                          {buildProfileRows(formData).map((row, i) => (
                            <tr key={row.label} className={i % 2 === 1 ? "bg-muted/40" : undefined}>
                              <th scope="row" className="border-t border-border px-3 py-2 text-left font-medium text-muted-foreground">
                                {row.label}
                              </th>
                              <td className="border-t border-border px-3 py-2">{row.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {analysis && (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-border bg-muted/20 py-6">
                      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Overall Readiness</h2>
                      <ReadinessDonut percentage={analysis.overallAlignment.percentage} />
                    </div>
                  )}
                </div>

                {/* C. Readiness Summary Strip */}
                {analysis && (
                  <div className="-mx-6 grid grid-cols-1 overflow-hidden border-y border-border sm:grid-cols-3">
                    <div className="bg-secondary px-6 py-4 text-center text-secondary-foreground">
                      <div className="text-2xl font-bold">{analysis.overallAlignment.percentage}%</div>
                      <div className="text-xs font-semibold uppercase tracking-wide">Ready Now</div>
                    </div>
                    <div className="bg-accent px-6 py-4 text-center text-accent-foreground sm:border-x sm:border-border/40">
                      <div className="text-2xl font-bold">{deriveRiskLevel(analysis.overallAlignment.percentage)}</div>
                      <div className="text-xs font-semibold uppercase tracking-wide">Risk Level</div>
                    </div>
                    <div className="bg-primary px-6 py-4 text-center text-primary-foreground">
                      <div className="text-2xl font-bold">{analysis.overallAlignment.estimatedDuration}</div>
                      <div className="text-xs font-semibold uppercase tracking-wide">Time to Prepare</div>
                    </div>
                  </div>
                )}

                {/* C2. Executive Summary / Alignment by Subject / Key Takeaways */}
                {analysis && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold uppercase tracking-tight text-primary">Executive Summary</h2>
                      <div className="mt-1.5 mb-3 h-0.5 w-16 bg-secondary" />
                      <div className="space-y-3 text-sm leading-relaxed text-foreground/90">
                        {buildExecutiveSummary(formData, analysis).map((paragraph, i) => (
                          <p key={i}>{paragraph}</p>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                      <div>
                        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Alignment by Subject
                        </h2>
                        <div className="space-y-2.5">
                          {summarizeSubjects(analysis).withPercentage.map((s) => (
                            <div key={s.subject} className="flex items-center gap-3">
                              <div className="w-28 shrink-0 truncate text-xs font-medium text-foreground" title={s.subject}>
                                {s.subject}
                              </div>
                              <div className="h-2.5 flex-1 rounded-sm bg-muted">
                                <div
                                  className={`h-full rounded-sm ${s.percentage >= 70 ? "bg-secondary" : "bg-accent"}`}
                                  style={{ width: `${Math.max(s.percentage, 2)}%` }}
                                />
                              </div>
                              <div className="w-9 shrink-0 text-right text-xs font-semibold text-foreground">{s.percentage}%</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Key Takeaways
                        </h2>
                        <ul className="space-y-2 text-sm text-foreground/90">
                          {buildKeyTakeaways(analysis).map((bullet, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-secondary" aria-hidden="true">•</span>
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* D. Subject-wise Gap Analysis — one uniform card per subject */}
                {analysis && (() => {
                  const gradeNum = parseInt(formData.snapshotGrade) || 0;
                  // For Grades 2–10 (Foundation Transition), suppress detailed social-studies
                  // breakdown — replaced by the 2–3 month refresher note (D3, below).
                  const isFoundation = gradeNum >= 2 && gradeNum <= 10;
                  const isSocialStudy = (name: string) => /social|history|civics|geography/i.test(name);

                  const subjectsToRender = analysis.subjectAnalysis.filter((s) => {
                    if (isFoundation && isSocialStudy(s.subject)) return false;
                    return true;
                  });

                  const renderSubjectCard = (subject: SubjectAnalysis) => {
                    const percentage = subject.totalTopics > 0 ? Math.round((subject.topicsCovered / subject.totalTopics) * 100) : 0;
                    const rawGaps = isFoundation
                      ? mergeWithBaseline(gradeNum, subject.subject, subject.keyGaps.map(getGapTopic), { maxTopics: 6 }).map(t => subject.keyGaps.find(g => getGapTopic(g) === t) ?? t)
                      : subject.keyGaps;
                    const gapRows = rawGaps.slice(0, 4).map((gap) => {
                      const topic = getGapTopic(gap);
                      return { topic, url: getGapUrl(gap), reason: getGapReason(topic, subject.subject) };
                    });
                    const strengths = buildSubjectStrengths(subject);
                    const resources = buildSubjectResources(subject);
                    const difficulty = SUBJECT_DIFFICULTY[subject.alignmentLevel];

                    return (
                      <div key={subject.subject} className="rounded-md bg-muted/30 p-5 sm:p-6">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-xl font-bold text-foreground">{subject.subject}</h4>
                          <div className="flex flex-wrap gap-1.5">
                            <span className={`rounded px-2.5 py-1 text-xs font-semibold text-white ${percentage >= 70 ? "bg-secondary" : "bg-accent"}`}>
                              {percentage}% Align
                            </span>
                            <span className="rounded bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
                              {SUBJECT_CONFIDENCE_LABEL[subject.alignmentLevel]}
                            </span>
                            <span className="rounded bg-muted-foreground px-2.5 py-1 text-xs font-semibold text-white">
                              {SUBJECT_PACE_LABEL[subject.alignmentLevel]}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                          <div className="space-y-4">
                            <div>
                              <h5 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-secondary">Strengths</h5>
                              <ul className="space-y-1 text-sm text-foreground/90">
                                {strengths.map((s, i) => (
                                  <li key={i} className="flex gap-2">
                                    <span className="text-secondary" aria-hidden="true">•</span>
                                    <span>{s}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h5 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-secondary">Missing Topics</h5>
                              {gapRows.length > 0 ? (
                                <div className="overflow-x-auto rounded-md border border-border bg-background">
                                  <table className="w-full border-collapse text-xs">
                                    <thead>
                                      <tr className="bg-primary text-primary-foreground">
                                        <th scope="col" className="px-2.5 py-1.5 text-left font-semibold">Topic</th>
                                        <th scope="col" className="px-2.5 py-1.5 text-left font-semibold">Gap</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {gapRows.map((g, i) => (
                                        <tr key={i} className={i % 2 === 1 ? "bg-muted/40" : undefined}>
                                          <td className="border-t border-border px-2.5 py-1.5 align-top font-medium">
                                            {g.url ? (
                                              <a href={g.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-secondary no-print">
                                                {g.topic}
                                              </a>
                                            ) : (
                                              g.topic
                                            )}
                                          </td>
                                          <td className="border-t border-border px-2.5 py-1.5 align-top text-muted-foreground">{g.reason}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">No specific gap topics flagged for this subject.</p>
                              )}
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <h5 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-secondary">Difficulty &amp; Catch-up</h5>
                              <p className="text-sm text-foreground/90">
                                <span className="font-semibold">{difficulty.level} — </span>
                                {difficulty.explanation}
                              </p>
                            </div>
                            <div>
                              <h5 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-secondary">Resources</h5>
                              {resources.length > 0 ? (
                                <ul className="space-y-1 text-sm text-foreground/90">
                                  {resources.map((r, i) => (
                                    <li key={i} className="flex gap-2">
                                      <span className="text-secondary" aria-hidden="true">•</span>
                                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-secondary no-print">
                                        {r.label}
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-muted-foreground">No resources available yet for this subject.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  };

                  return (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xl font-bold text-primary">Subject-wise Gap Analysis</h3>
                        <div className="mt-1.5 mb-3 h-0.5 w-16 bg-secondary" />
                        <p className="text-xs italic text-muted-foreground">
                          Each subject is assessed independently across strengths, missing topics, difficulty, and preparation resources.
                        </p>
                      </div>
                      <div className="space-y-4">
                        {subjectsToRender.map(renderSubjectCard)}
                      </div>
                    </div>
                  );
                })()}

                {/* D2. Stream Readiness for High School 11-12 */}
                {analysis && formData.schoolStage === "high" && parseInt(formData.snapshotGrade) >= 11 && (() => {
                  // Determine stream readiness from selected subjects
                  const subjects = formData.academicPath || [];
                  const subjectAnalysis = analysis.subjectAnalysis || [];
                  
                  const getReadiness = (keywords: RegExp): "strong" | "moderate" | "preparation" => {
                    const matched = subjectAnalysis.find(s => keywords.test(s.subject));
                    if (!matched) return "preparation";
                    if (matched.alignmentLevel === "strong") return "strong";
                    if (matched.alignmentLevel === "moderate") return "moderate";
                    return "preparation";
                  };

                  const hasSubject = (keywords: RegExp) => subjects.some((s: string) => keywords.test(s));

                  const streamSubjects = [
                    { name: "Mathematics", check: /math|algebra|calculus|geometry|pre-calculus/i, readiness: getReadiness(/math/i) },
                    { name: "Physics", check: /physics/i, readiness: hasSubject(/physics/i) ? getReadiness(/physics/i) : "preparation" },
                    { name: "Chemistry", check: /chemistry/i, readiness: hasSubject(/chemistry/i) ? getReadiness(/chemistry/i) : "preparation" },
                    { name: "Biology", check: /biology/i, readiness: hasSubject(/biology/i) ? getReadiness(/biology/i) : "preparation" },
                    { name: "Economics / Commerce", check: /economics|commerce|business/i, readiness: hasSubject(/economics|commerce/i) ? getReadiness(/economics/i) : "preparation" },
                    { name: "Computer Science", check: /computer|cs|coding/i, readiness: hasSubject(/computer|cs|coding/i) ? getReadiness(/computer/i) : "preparation" },
                  ].filter(s => hasSubject(s.check) || s.name === "Mathematics");

                  const readinessColors = {
                    strong: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
                    moderate: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
                    preparation: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800",
                  };
                  const readinessLabels = { strong: "Strong Readiness", moderate: "Moderate Readiness", preparation: "Preparation Required" };

                  // Suggest streams
                  const pcmReady = streamSubjects.filter(s => /math|physics|chemistry/i.test(s.name)).every(s => s.readiness !== "preparation");
                  const pcbReady = streamSubjects.filter(s => /math|physics|chemistry|biology/i.test(s.name) && !/computer/i.test(s.name)).some(s => /biology/i.test(s.name) && s.readiness !== "preparation");

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">Recommended Stream Readiness</h3>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Based on your US coursework, here's how your child aligns with Indian Grade 11–12 streams.
                        University Entrance Test/AP courses are treated as rigor indicators.
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {streamSubjects.map((s) => (
                          <div key={s.name} className={`p-3 rounded-lg border text-center ${readinessColors[s.readiness]}`}>
                            <div className="text-sm font-semibold">{s.name}</div>
                            <div className="text-xs mt-1">{readinessLabels[s.readiness]}</div>
                          </div>
                        ))}
                      </div>
                      {/* Stream suggestion */}
                      <div className="p-3 bg-muted/30 rounded-lg border border-border">
                        <div className="text-sm font-medium mb-1">Suggested Stream Alignment</div>
                        <div className="flex flex-wrap gap-2">
                          {pcmReady && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">PCM (Science – Math)</Badge>}
                          {pcbReady && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">PCB (Science – Bio)</Badge>}
                          {hasSubject(/economics|commerce|business/i) && <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">Commerce</Badge>}
                          {!pcmReady && !pcbReady && <Badge variant="secondary">Needs further assessment</Badge>}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* F. Bridge Timeline & Recommendations */}
                {analysis && (() => {
                  const riskMetrics = deriveRiskMetrics(analysis);
                  const monthlyPlan = buildMonthlyBridgePlan(analysis);
                  const whyStartNow = buildWhyStartNow(analysis);
                  const roadmapExplanation = buildRoadmapExplanation(analysis);
                  const immediateActions = buildImmediateActions(analysis);

                  return (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl font-bold text-primary">Bridge Timeline &amp; Recommendations</h3>
                        <div className="mt-1.5 h-0.5 w-16 bg-secondary" />
                      </div>

                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div>
                          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-secondary">Risk at a Glance</h4>
                          <div className="space-y-2.5">
                            {riskMetrics.map((m) => (
                              <div key={m.label} className="flex items-center gap-3">
                                <div className="w-28 shrink-0 text-xs font-medium text-foreground">{m.label}</div>
                                <div className="h-2.5 flex-1 rounded-sm bg-muted">
                                  <div
                                    className={`h-full rounded-sm ${m.tone === "positive" ? "bg-secondary" : "bg-accent"}`}
                                    style={{ width: `${Math.max(m.percentage, 2)}%` }}
                                  />
                                </div>
                                <div className="w-9 shrink-0 text-right text-xs font-semibold text-foreground">{m.percentage}%</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-secondary">Why Start Now</h4>
                          <p className="text-sm leading-relaxed text-foreground/90">{whyStartNow}</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-secondary">Expected Completion by Month</h4>
                        <CompletionAreaChart data={monthlyPlan.map(({ month, percentage }) => ({ month, percentage }))} />
                      </div>

                      <div>
                        <div className="overflow-x-auto rounded-md border border-border">
                          <table className="w-full border-collapse text-xs">
                            <thead>
                              <tr className="bg-primary text-primary-foreground">
                                <th scope="col" className="px-3 py-2 text-left font-semibold">Phase</th>
                                <th scope="col" className="px-3 py-2 text-left font-semibold">Month</th>
                                <th scope="col" className="px-3 py-2 text-left font-semibold">Focus Areas</th>
                                <th scope="col" className="px-3 py-2 text-right font-semibold">Completion</th>
                              </tr>
                            </thead>
                            <tbody>
                              {monthlyPlan.map((row, i) => (
                                <tr key={row.month} className={i % 2 === 1 ? "bg-muted/40" : undefined}>
                                  <td className="border-t border-border px-3 py-2 align-top font-medium">{row.phase}</td>
                                  <td className="border-t border-border px-3 py-2 align-top">Month {row.month}</td>
                                  <td className="border-t border-border px-3 py-2 align-top text-muted-foreground">{row.focusAreas}</td>
                                  <td className="border-t border-border px-3 py-2 align-top text-right font-semibold">{row.percentage}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <p className="text-sm leading-relaxed text-foreground/90">{roadmapExplanation}</p>

                      <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Immediate Actions</h4>
                        {immediateActions.length > 0 ? (
                          <ul className="space-y-1.5 text-sm text-foreground/90">
                            {immediateActions.map((action, i) => (
                              <li key={i} className="flex gap-2">
                                <span className="text-secondary" aria-hidden="true">•</span>
                                {action.url ? (
                                  <a href={action.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-secondary no-print">
                                    {action.label}
                                  </a>
                                ) : (
                                  <span>{action.label}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-muted-foreground">No immediate actions identified yet.</p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* G. Personalized Recommendations — Student Checklist / Teacher Recommendations / Learning Resources */}
                {analysis && (() => {
                  // Check if source and target curriculum match (e.g. IB → IB)
                  const currentCurr = (formData.currentCurriculum || "").toLowerCase();
                  const targetGoal = (formData.targetGoal || "").toLowerCase();
                  const isSameCurriculum = (
                    (currentCurr.includes("ib") && targetGoal.includes("ib")) ||
                    (currentCurr.includes("igcse") && targetGoal.includes("igcse")) ||
                    (currentCurr.includes("cambridge") && targetGoal.includes("igcse"))
                  );

                  const studentChecklist = buildStudentChecklist(analysis);
                  const teacherRecommendations = buildTeacherRecommendations(analysis);
                  const learningResources = buildLearningResources(analysis);
                  const weeklyPlan = buildWeeklyStudyPlan(analysis);
                  const hoursToClose = buildStudyHoursToCloseGaps(analysis);
                  const weeklyPlanCaption = buildWeeklyPlanCaption(analysis);
                  const culturalTips = analysis.recommendations.culturalLanguage;

                  return (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl font-bold text-primary">Personalized Recommendations</h3>
                        <div className="mt-1.5 mb-3 h-0.5 w-16 bg-secondary" />
                        <p className="text-xs italic text-muted-foreground">
                          Recommendations are adjusted based on the student's current performance level and readiness.
                        </p>
                      </div>

                      {/* Same-curriculum note */}
                      {isSameCurriculum && (
                        <div className="rounded-md border border-border bg-muted/30 p-3">
                          <div className="mb-1 text-sm font-medium text-foreground">Same Curriculum Detected</div>
                          <p className="text-xs text-muted-foreground">
                            Your child is already studying in a {currentCurr.includes("ib") ? "IB" : "IGCSE/Cambridge"} curriculum.
                            Recommendations focus on continuation within the same framework rather than cross-curriculum bridging.
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div>
                          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Student Checklist</h4>
                          {studentChecklist.length > 0 ? (
                            <ul className="space-y-1.5 text-sm text-foreground/90">
                              {studentChecklist.map((item, i) => (
                                <li key={i} className="flex gap-2">
                                  <span className="text-secondary" aria-hidden="true">•</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-muted-foreground">No specific student actions identified yet.</p>
                          )}
                        </div>

                        <div>
                          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Teacher Recommendations</h4>
                          {teacherRecommendations.length > 0 ? (
                            <ul className="space-y-1.5 text-sm text-foreground/90">
                              {teacherRecommendations.map((item, i) => (
                                <li key={i} className="flex gap-2">
                                  <span className="text-secondary" aria-hidden="true">•</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-muted-foreground">No additional teacher recommendations identified yet.</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Learning Resources</h4>
                        {learningResources.length > 0 ? (
                          <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm text-foreground/90 sm:grid-cols-2">
                            {learningResources.map((resource, i) => (
                              <li key={i} className="flex gap-2">
                                <span className="text-secondary" aria-hidden="true">•</span>
                                {resource.url ? (
                                  <a href={resource.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-secondary no-print">
                                    {resource.label}
                                  </a>
                                ) : (
                                  <span>{resource.label}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-muted-foreground">No resources available yet.</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div>
                          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">
                            Weekly Study Plan (Hours/Subject)
                          </h4>
                          {weeklyPlan.subjects.length > 0 ? (
                            <div className="overflow-x-auto rounded-md border border-border">
                              <table className="w-full border-collapse text-xs">
                                <thead>
                                  <tr className="bg-primary text-primary-foreground">
                                    <th scope="col" className="px-2.5 py-1.5 text-left font-semibold">Week</th>
                                    {weeklyPlan.subjects.map((s) => (
                                      <th key={s} scope="col" className="px-2.5 py-1.5 text-left font-semibold">{s}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {weeklyPlan.rows.map((row, i) => (
                                    <tr key={row.week} className={i % 2 === 1 ? "bg-muted/40" : undefined}>
                                      <td className="border-t border-border px-2.5 py-1.5 font-medium">Week {row.week}</td>
                                      {row.hours.map((h, si) => (
                                        <td key={si} className="border-t border-border px-2.5 py-1.5">{h}</td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No weekly plan available yet.</p>
                          )}
                        </div>

                        <div>
                          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Study Hours to Close Gaps</h4>
                          {hoursToClose.length > 0 ? (
                            <VerticalHoursChart data={hoursToClose} />
                          ) : (
                            <p className="text-xs text-muted-foreground">No estimate available yet.</p>
                          )}
                        </div>
                      </div>

                      {weeklyPlanCaption && (
                        <p className="text-xs italic leading-relaxed text-muted-foreground">{weeklyPlanCaption}</p>
                      )}

                      <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Cultural Adaptation</h4>
                        {culturalTips.length > 0 ? (
                          <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm text-foreground/90 sm:grid-cols-2">
                            {culturalTips.map((tip, i) => (
                              <li key={i} className="flex gap-2">
                                <span className="text-secondary" aria-hidden="true">•</span>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-muted-foreground">No cultural adaptation guidance available yet.</p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* H. Quick Questions Parents Often Ask */}
                {analysis && (() => {
                  const faq = buildParentFAQ(analysis);
                  return (
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-xl font-bold text-primary">Quick Questions Parents Often Ask</h3>
                        <div className="mt-1.5 h-0.5 w-16 bg-secondary" />
                      </div>
                      <div className="overflow-x-auto rounded-md border border-border">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="bg-primary text-primary-foreground">
                              <th scope="col" className="px-3 py-2 text-left font-semibold">Question</th>
                              <th scope="col" className="px-3 py-2 text-left font-semibold">Short Answer</th>
                            </tr>
                          </thead>
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
                  );
                })()}

                {/* Compare with Previous */}
                {previousReport && analysis && (
                  <ReportComparison
                    previousAnalysis={previousReport.analysis_data}
                    currentAnalysis={analysis}
                    previousDate={previousReport.created_at}
                  />
                )}

                {analysis && (
                  <div className="p-3 bg-muted/30 rounded-lg border border-border text-center">
                    <p className="text-xs text-muted-foreground italic">
                      This report can be used by tutors or academic counselors to guide structured transition planning.
                    </p>
                  </div>
                )}

                {/* Disclaimer footnote — always shown at the bottom of the report */}
                <div className="-mx-6 border-t border-border bg-muted/30 px-6 py-3">
                  <p className="text-[9px] leading-relaxed text-muted-foreground sm:text-[10px]">
                    <span className="font-semibold text-foreground">Disclaimer:</span> This report is an indicative
                    assessment based on the information provided and curriculum comparison. It is not 100% accurate
                    or an official equivalency/admission assessment. Actual requirements may vary by school,
                    curriculum, grade, and academic year. Please verify with the target school where appropriate.
                  </p>
                </div>

                {/* Download Button */}
                <div className="flex justify-center pt-4">
                  <Button
                    onClick={handleDownloadPDF}
                    className="w-full md:w-auto"
                    disabled={!analysis}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                </div>
              </CardContent>
            </Card>
            </div>
          )}
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default ReportPreview;
