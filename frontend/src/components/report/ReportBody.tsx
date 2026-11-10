import type { ReactNode } from "react";
import { Download, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportHero } from "@/components/report/ReportHero";
import { ReportSectionNav } from "@/components/report/ReportSectionNav";
import { ReportSection, SectionHeader } from "@/components/report/ReportPrimitives";
import { ReadinessOverview } from "@/components/report/ReadinessOverview";
import { SubjectBreakdown } from "@/components/report/SubjectBreakdown";
import { StreamReadiness } from "@/components/report/StreamReadiness";
import { AiSuggestedTag, PreparationPlan } from "@/components/report/PreparationPlan";
import { ThisWeek } from "@/components/report/ThisWeek";
import { ParentQuestions } from "@/components/report/ParentQuestions";
import { NotesResponse } from "@/components/report/NotesResponse";
import {
  boardComparisonNote, boardLabel, buildActionPlan, buildExecutiveSummary, buildKeyTakeaways, buildParentFAQ, orderSubjectsByNeed,
} from "@/lib/reportContent";
import type { GapItem } from "@/lib/subjectGaps";
import { entryGrade, targetStreamLabel } from "@/hooks/useCurriculumSubjects";
import { ALL_COURSES, courseLabel } from "@/components/assessment/shared/highSchoolCourses";
import { levelledLanguage, useLearningResources } from "@/hooks/useLearningResources";

/**
 * The report itself, shared by the report page (ReportPreview) and shared
 * links (SharedReportPage) so both show the same design.
 */
// Check if the goal involves Indian academic readiness (CBSE / ICSE / state board / India transition)
const isIndiaReadinessGoal = (targetGoal?: string): boolean => {
  if (!targetGoal) return true;
  return /india|cbse|icse|state[\s-]?board|ncert/i.test(targetGoal);
};

// Turns a stored option slug (e.g. "cambridge-igcse", "within-3-months") into
// readable display text, preserving known curriculum/country acronyms and
// keeping number ranges like "3-6" from being split apart.
const SLUG_ACRONYMS = new Set(["cbse", "icse", "ib", "igcse", "us", "uk", "uae", "ncert", "teks", "pyp", "ap", "dp", "myp"]);
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

// usState is stored as a two-letter code (e.g. "CA"); humanizeSlug alone would
// just capitalize it to "Ca". This maps to the same full state names shown in
// the assessment form's own dropdown (StudentProfileStep.tsx / ParentStep1.tsx).
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
// (and shared/reviewFormatting.ts's curriculumLabel) — the report never shows
// the raw DB-facing value "regular-us", and known curricula get their exact
// selected wording rather than humanizeSlug's generic title-casing.
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

const curriculumValueLabel = (value: string, usState?: string): string => {
  if (value === "regular-us" && usState && usState !== "other" && US_STATE_NAMES[usState.toUpperCase()]) {
    return `${US_STATE_NAMES[usState.toUpperCase()]} State Curriculum`;
  }
  return CURRICULUM_LABELS[value] || humanizeSlug(value);
};

// currentCurriculum moved from a single string to a list; older saved
// reports (pre-migration assessment_data) may still store it as a plain
// string, so this accepts either shape.
const humanizeCurriculumList = (value: unknown, usState?: string): string => {
  const list = Array.isArray(value) ? value : typeof value === "string" && value ? [value] : [];
  return list.map((v) => curriculumValueLabel(v, usState)).filter(Boolean).join(", ");
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

const coursesTakenRow = (academicPath: unknown): { label: string; value: string }[] => {
  const taken = Array.isArray(academicPath) ? ALL_COURSES.filter((c) => academicPath.includes(c)) : [];
  return taken.length > 0 ? [{ label: "Courses Taken", value: taken.map(courseLabel).join(", ") }] : [];
};

// Total prep months come from the overall estimatedDuration (e.g. "3-6
// months" -> 6) or, failing that, the last bridge phase's duration — never a
// fixed/invented number. The estimate comes first: the model copies the
// prompt's example phase durations ("Months 1-3 ... 7-8"), so reading the
// phase first gave an 8-month plan under a "3-6 months" estimate.
const extractMonthCount = (analysis: AnalysisData): number => {
  const candidates = [analysis.overallAlignment?.estimatedDuration, analysis.bridgeTimeline?.phase3?.duration].filter(
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
  // Fewer steps than months: each step once, in order, with the months after
  // it continuing it (every month used to list all the phase's steps again).
  return Array.from({ length: monthCount }, (_, m) => {
    const i = Math.floor((m * items.length) / monthCount);
    const first = m === 0 || Math.floor(((m - 1) * items.length) / monthCount) !== i;
    return [first || typeof items[i] !== "string" ? items[i] : (`Continue: ${items[i]}` as T)];
  });
};

// Completion % is a plain linear month/total ramp reaching exactly 100% at
// the final month — a timeline position, not a new readiness calculation.
// Each month is assigned to whichever real bridgeTimeline phase covers it
// (parsed from that phase's own "Months X-Y" range), and that phase's real
// bullets are distributed across its months for the Focus Areas column.
const buildMonthlyBridgePlan = (
  analysis: AnalysisData
): { phase: string; month: number; focusAreas: string[]; percentage: number }[] => {
  const monthCount = extractMonthCount(analysis);
  const phases = [analysis.bridgeTimeline.phase1, analysis.bridgeTimeline.phase2, analysis.bridgeTimeline.phase3];

  const parsedRanges = phases.map((p): [number, number] | null => {
    // Some saved reports have a phase without a duration; those split evenly.
    const nums = ((p?.duration ?? "").match(/\d+/g) ?? []).map(Number);
    if (nums.length >= 2) return [nums[0], nums[nums.length - 1]];
    if (nums.length === 1) return [nums[0], nums[0]];
    return null;
  });

  // The model's own ranges are used only when they fit the estimate; otherwise
  // the months are split evenly across the three phases.
  const rangesFit = parsedRanges.every((r): r is [number, number] => r !== null)
    && (parsedRanges as [number, number][])[2][1] === monthCount;
  const phaseSpans: [number, number][] = rangesFit
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
    return distributeAcrossMonths(phases[i]?.bullets ?? [], span);
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
      focusAreas: bullets.length > 0 ? bullets : [phases[phaseIndex].name],
      percentage,
    };
  });
};

// Gap items (GapItem, from lib/subjectGaps): a plain string (legacy) or { topic, resourceUrl?, severity?, ... }
// Resource items: AI returns either a plain string (legacy) or { name, url? }
export type ResourceItem = string | { name: string; url?: string };

export interface SubjectAnalysis {
  subject: string;
  topicsCovered: number;
  totalTopics: number;
  alignmentLevel: "strong" | "moderate" | "high_gap";
  keyGaps: GapItem[];
  /** NCERT book codes behind the subject's chapters. */
  textbooks?: string[];
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
  /** Subjects left out of scoring (a Hindi/Sanskrit not chosen). */
  excludedSubjects?: { subject: string; reason: string }[];
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
  /** The AI's reply to the form's "Additional notes"; only when notes were given. */
  notesResponse?: string;
}

interface ReportBodyProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- stored form data from several form versions
  formData: any;
  analysis: AnalysisData | null;
  onDownload: () => void;
  /** Omitted where sharing isn't possible (shared links, unsaved reports). */
  onShare?: () => void;
  isSharing?: boolean;
  /** Rendered after the sections, e.g. the comparison with a previous report. */
  comparison?: ReactNode;
}

export function ReportBody({ formData, analysis, onDownload, onShare, isSharing = false, comparison }: ReportBodyProps) {
  // Study resources for the board and the grade being entered.
  const learning = useLearningResources(formData?.targetGoal, entryGrade(String(formData?.snapshotGrade), formData?.targetGrade));

  const entry = entryGrade(String(formData.snapshotGrade), formData.targetGrade);
  const board = boardLabel(formData.targetGoal, entry);
  const firstName = formData.childName || formData.studentName;
  const studentName = [firstName, formData.childLastName || formData.studentLastName].filter(Boolean).join(" ") || "Your child";
  const targetGradeLabel = computeTargetGradeLabel(formData.snapshotGrade, formData.targetGrade);
  const from = {
    country: formData.snapshotLocation === "us" ? "United States" : humanizeSlug(formData.snapshotLocation) || "Current school",
    detail: [humanizeCurriculumList(formData.currentCurriculum, formData.usState), formData.snapshotGrade ? `Grade ${formData.snapshotGrade}` : ""].filter(Boolean).join(" · "),
  };
  const to = {
    country: isIndiaReadinessGoal(formData.targetGoal) ? "India" : humanizeSlug(formData.targetGoal) || "New curriculum",
    detail: [board ?? humanizeSlug(formData.targetGoal), targetGradeLabel].filter(Boolean).join(" · "),
  };
  const languages = Array.isArray(formData.selectedLanguages) ? formData.selectedLanguages.map((l: string) => humanizeSlug(l)).join(", ") : "";
  const stream = targetStreamLabel(formData.targetStream);
  const details = [
    ...(languages ? [{ label: "Languages spoken", value: languages }] : []),
    ...(formData.targetLanguage && formData.targetLanguage !== "undecided" ? [{ label: "Indian language at new school", value: humanizeSlug(formData.targetLanguage) }] : []),
    ...(stream ? [{ label: "Stream", value: stream }] : []),
    ...coursesTakenRow(formData.academicPath),
  ];

  if (!analysis) {
    return <ReportHero studentName={studentName} from={from} to={to} details={details} onDownload={onDownload} />;
  }

  const targetLabel = [humanizeSlug(formData.targetGoal) || "the target curriculum", targetGradeLabel].filter(Boolean).join(" ");
  const notes = [boardComparisonNote(formData.targetGoal, entry, analysis.subjectAnalysis.map((s) => s.subject)), ...(analysis.excludedSubjects ?? []).map((e) => e.reason)].filter(
    (n): n is string => !!n
  );
  const orderedSubjects = orderSubjectsByNeed(analysis.subjectAnalysis, formData.subjectConfidences, formData.academicPath);
  const subjects = orderedSubjects.map((s) => s.subject);
  const actionPlan = buildActionPlan(
    analysis,
    (subject) => {
      const codes = analysis.subjectAnalysis.find((s) => s.subject === subject)?.textbooks;
      return levelledLanguage(subject)
        ? learning.forLanguage(subject, undefined, 3, codes)[0]?.items[0]
        : learning.forSubject(subject, 1, codes)[0];
    },
    (subject, gap) => learning.firstLink(gap.topic, subject, gap.grade, gap.resourceUrl)
  );
  // Same-curriculum note (e.g. IB -> IB); currentCurriculum may be a legacy string on older reports.
  const currentCurrList: string[] = Array.isArray(formData.currentCurriculum)
    ? formData.currentCurriculum
    : typeof formData.currentCurriculum === "string" && formData.currentCurriculum
      ? [formData.currentCurriculum]
      : [];
  const goal = (formData.targetGoal || "").toLowerCase();
  const matchedCurriculum = currentCurrList.map((c) => c.toLowerCase()).find((c) =>
    (c.includes("ib") && goal.includes("ib")) || (c.includes("igcse") && goal.includes("igcse")) || (c.includes("cambridge") && goal.includes("igcse"))
  );
  const faq = buildParentFAQ(analysis, {
    timeline: formData.timeline,
    supportNeeds: formData.supportNeeds,
    subjectConfidences: formData.subjectConfidences,
    entryGrade: entry,
    board,
    streamLabel: stream || undefined,
  });

  return (
    <div className="space-y-10">
      <ReportHero
        studentName={studentName}
        from={from}
        to={to}
        details={details}
        onDownload={onDownload}
        onShare={onShare}
        isSharing={isSharing}
      />
      {/* A direct child of the full-length container, so it stays pinned while reading. */}
      <ReportSectionNav onDownload={onDownload} className="!mt-2" />

      <ReportSection id="overview">
        <SectionHeader id="overview" title="Overview" description="How ready your child is for the new curriculum today, and what that means." />
        <ReadinessOverview
          analysis={analysis}
          orderedSubjects={orderedSubjects}
          summary={buildExecutiveSummary(analysis, targetLabel, formData.timeline, false)}
          takeaways={buildKeyTakeaways(analysis)}
          notes={notes}
          timeline={formData.timeline}
        />
        {typeof analysis.notesResponse === "string" && analysis.notesResponse.trim() && (
          <div className="mt-4">
            <NotesResponse text={analysis.notesResponse.trim()} />
          </div>
        )}
      </ReportSection>

      <ReportSection id="subjects">
        <SectionHeader
          id="subjects"
          title="Subject-wise Gap Analysis"
          description="Click on a subject to see the missing topics, with links to each chapter, and where to study."
        />
        <SubjectBreakdown
          subjects={orderedSubjects}
          criticalGaps={analysis.criticalGaps}
          entryGrade={entry}
          electives={formData.targetElectives ?? []}
          learning={learning}
          languageProficiencies={formData.languageProficiencies}
        />
        {/* With a stream chosen the subject cards already show each subject's
            readiness; only older reports saved without one get a suggestion. */}
        {formData.schoolStage === "high" && (entry ?? 0) >= 11 && !stream && (
          <StreamReadiness subjects={analysis.subjectAnalysis} academicPath={formData.academicPath || []} />
        )}
      </ReportSection>

      <ReportSection id="plan">
        <SectionHeader
          id="plan"
          title="Preparation plan"
          description={`About ${analysis.overallAlignment.estimatedDuration}, in three phases, starting with the subjects that need the most work.`}
          aside={<AiSuggestedTag />}
        />
        <PreparationPlan months={buildMonthlyBridgePlan(analysis)} />
      </ReportSection>

      <ReportSection id="this-week">
        <SectionHeader id="this-week" title="Start this week" description="Three first steps, each with where to study it." />
        <ThisWeek
          plan={actionPlan}
          learningChannels={learning.ofType("video", subjects)}
          questionBanks={learning.ofType("practice", subjects)}
          sameCurriculumNote={matchedCurriculum
            ? `Your child already studies a ${matchedCurriculum.includes("ib") ? "IB" : "IGCSE/Cambridge"} curriculum, so the advice focuses on continuing within it rather than bridging between curricula.`
            : undefined}
        />
      </ReportSection>

      {faq.length > 0 && (
        <ReportSection id="questions">
          <SectionHeader id="questions" title="Questions parents ask" description="Answered from this report." />
          <ParentQuestions items={faq} />
        </ReportSection>
      )}

      {comparison}

      <footer className="space-y-4 border-t border-border pt-6">
        <p className="font-body text-[15px] text-muted-foreground">
          Tutors and academic counsellors can use this report to plan the transition with you.
        </p>
        <p className="font-body text-[13px] leading-relaxed text-muted-foreground">
          <span className="font-heading font-semibold text-foreground">Disclaimer: </span>
          This report is an indicative assessment based on the information provided and a curriculum comparison. It is not 100% accurate
          or an official equivalency or admission assessment. Requirements vary by school, curriculum, grade and academic year, so please
          verify with the target school where appropriate.
        </p>
        <div className="flex flex-col gap-2 no-print sm:flex-row">
          <Button onClick={onDownload} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
            <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Download PDF
          </Button>
          {onShare && (
            <Button onClick={onShare} variant="outline" disabled={isSharing}>
              {isSharing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : <Share2 className="mr-1.5 h-4 w-4" aria-hidden="true" />}
              Share report
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
