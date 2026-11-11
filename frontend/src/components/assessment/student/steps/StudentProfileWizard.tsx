import { useLayoutEffect, useState, type ComponentType, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ArrowUpCircle, BarChart3, BookOpen, Check, Equal, Globe2, Minus, Target } from "lucide-react";
import editIcon from "@/assets/icons-3d/edit.png";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  GlobiculumChecklistIcon,
  GlobiculumEducationIcon,
  GlobiculumGlobeIcon,
  GlobiculumGradeIcon,
  GlobiculumIconTile,
  GlobiculumLocationIcon,
  GlobiculumPencilIcon,
  GlobiculumSchoolIcon,
  GlobiculumStudentIcon,
  GlobiculumTargetIcon,
  GlobiculumTimelineIcon,
  UsFlag,
  CaFlag,
  GbFlag,
  AuFlag,
  AeFlag,
  SgFlag,
  MyFlag,
  type GlobiculumIconProps,
} from "@/components/icons";
import InputCard from "../../shared/InputCard";
import FieldError from "../../shared/FieldError";
import FlashcardShell from "../../shared/FlashcardShell";
import CardNav from "../../shared/CardNav";
import OptionalLabel from "../../shared/OptionalLabel";
import EducationHistoryList from "../../shared/EducationHistoryList";
import { EMPTY_EDUCATION_ENTRY, priorGradeOptions } from "../../shared/priorGrades";
import { previousSchoolsComplete } from "../../shared/stepRules";
import TimelineSelector, { type TimelineOption } from "../../shared/TimelineSelector";
import { targetGradeLabel } from "../../shared/reviewFormatting";
import { boardCoverageNote, boardHasData, coverageCardToFix, currentCurriculumHasData, targetGradeHasData } from "../../shared/dataCoverage";
import type { AssessmentFormData } from "../../shared/types";
import {
  TARGET_STREAMS,
  electivesForStream,
  entryGrade,
  gradeHasStream,
  normalizeTargetStream,
  targetStreamLabel,
  useStreamElectives,
  type TargetStream,
} from "@/hooks/useCurriculumSubjects";

// The reusable Globiculum icon family (frontend/src/components/icons)
// replaces generic Lucide glyphs for the 8 explicitly-requested card-badge
// concepts. targetGrade keeps its existing Lucide icon (Equal/ArrowUpCircle)
// — it wasn't part of the requested icon swap — so this type stays a union
// of both families rather than forcing every card onto one or the other.
type ProfileIcon = ComponentType<GlobiculumIconProps> | LucideIcon;

// Sprint 1: turns the "core snapshot" fields of Student Profile (name ->
// school stage -> grade -> country -> [state/other] -> curriculum -> [other]
// -> target board -> target grade -> timeline) into a one-question-at-a-time
// wizard, mirroring the structural pattern already proven in
// AcademicPathFlashcards.tsx (left nav / mobile progress dots + single
// active animated card + auto-advance + summary phase) — duplicated locally
// rather than shared, so this sprint's diff stays scoped to Profile-step
// files only. The optional "attended an Indian school before?" question, with
// the prior schools, is the last card (it used to be a box under the wizard,
// so it showed below every card).
//
// Every field name, setField call, and validation rule is identical to the
// previous single-scroll form — this file only changes how the same fields
// are presented.

const SCHOOL_STAGES: { value: string; label: string; description: string; icon: LucideIcon }[] = [
  { value: "elementary", label: "Elementary", description: "Grades 1-5", icon: BookOpen },
  { value: "middle", label: "Middle School", description: "Grades 6-8", icon: Target },
  { value: "high", label: "High School", description: "Grades 9-12", icon: BarChart3 },
];

const getGradeOptions = (schoolStage: string) => {
  switch (schoolStage) {
    case "elementary":
      return Array.from({ length: 5 }, (_, i) => i + 1);
    case "middle":
      return Array.from({ length: 3 }, (_, i) => i + 6);
    case "high":
      return Array.from({ length: 4 }, (_, i) => i + 9);
    default:
      return Array.from({ length: 12 }, (_, i) => i + 1);
  }
};

// Only "United States" is enrollable today — the rest stay visible (per
// product decision to preview upcoming coverage) but are disabled.
const COUNTRIES = [
  { value: "us", label: "United States", enabled: true, Flag: UsFlag },
  { value: "canada", label: "Canada", enabled: false, Flag: CaFlag },
  { value: "uk", label: "United Kingdom", enabled: false, Flag: GbFlag },
  { value: "australia", label: "Australia", enabled: false, Flag: AuFlag },
  { value: "uae", label: "UAE / Gulf", enabled: false, Flag: AeFlag },
  { value: "singapore", label: "Singapore", enabled: false, Flag: SgFlag },
  { value: "malaysia", label: "Malaysia", enabled: false, Flag: MyFlag },
  { value: "other", label: "Other", enabled: false, Flag: undefined },
];

// Value stays the two-letter abbreviation (existing usState payload shape);
// only the displayed label is expanded to the full state name.
const US_STATES: { value: string; label: string }[] = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"],
  ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"], ["FL", "Florida"], ["GA", "Georgia"],
  ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"],
  ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"],
  ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"], ["MO", "Missouri"],
  ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"],
  ["NM", "New Mexico"], ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"],
  ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"],
  ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"],
  ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
  ["DC", "District of Columbia"],
].map(([value, name]) => ({ value, label: `${name} (${value})` }));

// US-country students no longer choose between Common Core / State-Specific
// Standards / NGSS as separate technical options — those three collapse into
// a single "Regular U.S. school curriculum" choice (US_REGULAR_CURRICULUM_OPTION,
// prepended only for US-country users in getCurriculumOptions below). The
// actual state standards are resolved server-side from the state already
// collected in the "usState" step — see resolveSourceCurriculum in
// backend/supabase/functions/_shared/curriculumGaps.ts. Non-US and IB/
// Cambridge/Honors/Other choices are unaffected.
const CURRICULUM_BY_STAGE: Record<string, { value: string; label: string }[]> = {
  elementary: [
    { value: "ib-pyp", label: "IB Primary Years Programme" },
    { value: "cambridge-primary", label: "Cambridge Primary" },
    { value: "montessori", label: "Montessori Curriculum" },
    { value: "other", label: "Other" },
  ],
  middle: [
    { value: "ib-myp", label: "IB Middle Years Programme" },
    { value: "cambridge-lower", label: "Cambridge Lower Secondary" },
    { value: "honors-advanced", label: "Honors / Advanced Program" },
    { value: "other", label: "Other" },
  ],
  high: [
    { value: "ap", label: "AP Track (Advanced Placement)" },
    { value: "ib-dp", label: "IB DP" },
    { value: "cambridge-igcse", label: "Cambridge IGCSE" },
    { value: "a-levels", label: "A-Levels" },
    { value: "other", label: "Other" },
  ],
};

const US_REGULAR_CURRICULUM_OPTION = { value: "regular-us", label: "Regular U.S. school curriculum" };

// Options without curriculum data are faded (dataCoverage.ts). AP courses still
// count: they are picked in the Academic Path step, on top of the state's.
const AP_TRACK_HINT = "Coming Soon. Choose the regular U.S. curriculum and add AP courses in the Academic Path step.";

const getCurriculumOptions = (schoolStage: string, snapshotLocation: string): { value: string; label: string }[] => {
  const base = CURRICULUM_BY_STAGE[schoolStage] || [];
  return snapshotLocation === "us" ? [US_REGULAR_CURRICULUM_OPTION, ...base] : base;
};

// A student never sees the DB identifier "us-state-california" — they picked
// "California" in the State step and "Regular U.S. school curriculum" here;
// this turns that pair into "California State Curriculum" for display only
// (the stored currentCurriculum value stays "regular-us" either way, and the
// backend resolves the actual DB system from usState).
const resolveCurriculumOptionLabel = (value: string, baseLabel: string, formData: AssessmentFormData): string => {
  if (value !== "regular-us" || formData.snapshotLocation !== "us" || !formData.usState) {
    return baseLabel;
  }
  const stateEntry = US_STATES.find((s) => s.value === formData.usState);
  if (!stateEntry) return baseLabel;
  const stateName = stateEntry.label.replace(/\s*\([^)]*\)\s*$/, "");
  return `${stateName} State Curriculum`;
};

const TARGET_BOARDS = [
  { value: "cbse", label: "CBSE" },
  { value: "icse", label: "ICSE" },
  { value: "ib", label: "IB" },
  { value: "cambridge-igcse", label: "Cambridge" },
];

const TARGET_GRADE_OPTIONS: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "same", label: "Same Grade", icon: Equal },
  { value: "next", label: "Next Grade", icon: ArrowUpCircle },
];

const TIMELINES: TimelineOption[] = [
  { value: "within-3-months", label: "Within 3 months" },
  { value: "3-6-months", label: "3–6 months" },
  { value: "6-12-months", label: "6–12 months" },
  { value: "1-2-years", label: "1–2 years" },
  { value: "exploring", label: "Just exploring" },
];

type ProfileFieldId =
  | "name"
  | "schoolStage"
  | "grade"
  | "country"
  | "usState"
  | "countryOther"
  | "curriculum"
  | "curriculumOther"
  | "targetBoard"
  | "targetGrade"
  | "targetStream"
  | "targetElectives"
  | "timeline"
  | "previousSchool";

// Static forward order for the 8 base cards — conditional cards (usState /
// countryOther / curriculumOther) are spliced in around "country" and
// "curriculum" at render time by buildCardSequence, and are handled as
// special cases by nextCardId below rather than living in this array.
const BASE_ORDER: ProfileFieldId[] = [
  "name",
  "schoolStage",
  "grade",
  "country",
  "curriculum",
  "targetBoard",
  "targetGrade",
  "targetStream",
  "targetElectives",
  "timeline",
  "previousSchool",
];

type StreamElectives = Record<TargetStream, string[]>;

// A subset of GlobiculumIconTile's four tones — three families only, so the
// icon system stays cohesive rather than a different color per field. Amber
// is used exactly once (Target) to stay a "tiny accent," per the brand's
// semantic color guidance.
type TileColor = "violet" | "teal" | "amber";
type Milestone = "About You" | "Your School" | "Your Goal" | "Your Plan" | "Previous Learning";

interface ProfileCard {
  id: ProfileFieldId;
  icon: ProfileIcon;
  tileColor: TileColor;
  /** Presentational grouping for the left nav (Sprint 1.2) — the underlying
   * `sequence` order/logic is unaffected by this. */
  milestone: Milestone;
  /** Short journey label for the left nav / mobile progress — distinct from
   * `title`, which stays the full on-screen question for the active card. */
  navLabel: string;
  kicker?: string;
  title: string;
  hint?: string;
  errorField: keyof AssessmentFormData | null;
  /** Can be left unanswered: not a reason to reopen the cards on return. */
  optional?: boolean;
}

const buildCardSequence = (formData: AssessmentFormData, streamElectives: StreamElectives): ProfileCard[] => {
  const cards: ProfileCard[] = [
    {
      id: "name",
      icon: GlobiculumPencilIcon,
      tileColor: "violet",
      milestone: "About You",
      navLabel: "Your Name",
      title: "What's your name?",
      errorField: null, // composite — handled via studentName/studentLastName directly
    },
    {
      id: "schoolStage",
      icon: GlobiculumSchoolIcon,
      tileColor: "teal",
      milestone: "About You",
      navLabel: "School",
      kicker: formData.studentName.trim() ? `Nice to meet you, ${formData.studentName.trim()}!` : undefined,
      title: "Which stage best describes you?",
      errorField: "schoolStage",
    },
    {
      id: "grade",
      icon: GlobiculumGradeIcon,
      tileColor: "violet",
      milestone: "About You",
      navLabel: "Grade",
      title: "What grade are you in?",
      errorField: "snapshotGrade",
    },
    {
      id: "country",
      icon: GlobiculumGlobeIcon,
      tileColor: "teal",
      milestone: "Your School",
      navLabel: "Location",
      title: "In which country do you currently attend school?",
      errorField: "snapshotLocation",
    },
  ];

  if (formData.snapshotLocation === "us") {
    cards.push({
      id: "usState",
      icon: GlobiculumLocationIcon,
      tileColor: "teal",
      milestone: "Your School",
      navLabel: "State",
      title: "Which state are you in?",
      hint: "Your current state helps us compare against the right local curriculum standards.",
      errorField: "usState",
    });
  } else if (formData.snapshotLocation === "other") {
    cards.push({
      id: "countryOther",
      icon: GlobiculumPencilIcon,
      tileColor: "teal",
      milestone: "Your School",
      navLabel: "Location",
      title: "Please specify your country",
      errorField: null,
    });
  }

  cards.push({
    id: "curriculum",
    icon: BookOpen,
    tileColor: "violet",
    milestone: "Your School",
    navLabel: "Curriculum",
    title: "What curriculum do you follow?",
    hint: formData.snapshotLocation === "us"
      ? "Your state and school information help us identify the relevant U.S. academic standards automatically."
      : "The curriculum or academic standards you currently follow at school.",
    errorField: "currentCurriculum",
  });

  if (formData.currentCurriculum.includes("other")) {
    cards.push({
      id: "curriculumOther",
      icon: GlobiculumPencilIcon,
      tileColor: "violet",
      milestone: "Your School",
      navLabel: "Curriculum",
      title: "Please specify your curriculum",
      errorField: null,
    });
  }

  cards.push(
    {
      id: "targetBoard",
      icon: GlobiculumTargetIcon,
      tileColor: "amber",
      milestone: "Your Goal",
      navLabel: "Target",
      title: "Which Indian board are you targeting?",
      errorField: "targetGoal",
    },
    {
      id: "targetGrade",
      icon: Equal,
      tileColor: "violet",
      milestone: "Your Goal",
      navLabel: "Target Grade",
      title: "Same grade, or move up?",
      errorField: "targetGrade",
    },
    // Classes XI-XII on CBSE / ICSE only (see gradeHasStream).
    ...(gradeHasStream(formData.snapshotGrade, formData.targetGoal, formData.targetGrade) ? [{
      id: "targetStream" as const,
      icon: GlobiculumTargetIcon,
      tileColor: "violet" as TileColor,
      milestone: "Your Goal" as Milestone,
      navLabel: "Stream",
      title: "Which stream will you take?",
      hint: "Indian boards split Classes XI-XII into streams. This decides which subjects your report analyses.",
      errorField: "targetStream" as const,
    }] : []),
    // The stream's optional subjects the student will take at the new school
    // (e.g. Computer Science in PCM). Only the ones picked are compared.
    ...(gradeHasStream(formData.snapshotGrade, formData.targetGoal, formData.targetGrade) &&
    electivesForStream(streamElectives, formData.targetStream).length > 0 ? [{
      id: "targetElectives" as const,
      icon: BookOpen,
      tileColor: "violet" as TileColor,
      milestone: "Your Goal" as Milestone,
      navLabel: "Optional subjects",
      title: `Which optional subjects will you take in Class ${entryGrade(formData.snapshotGrade, formData.targetGrade)}?`,
      hint: "Pick any you will take on top of the stream's main subjects. Only these are added to your report.",
      errorField: null,
      optional: true,
    }] : []),
    {
      id: "timeline",
      icon: GlobiculumTimelineIcon,
      tileColor: "teal",
      milestone: "Your Plan",
      navLabel: "Timeline",
      title: "When are you planning to transition?",
      errorField: "timeline",
    },
    {
      id: "previousSchool",
      icon: GlobiculumEducationIcon,
      tileColor: "amber",
      milestone: "Previous Learning",
      navLabel: "Indian school before",
      title: "Did you attend an Indian school before?",
      hint: "If yes, add each school with its grades and curriculum.",
      errorField: "educationHistory",
      optional: true,
    }
  );

  return cards;
};

// The next card after a selection on `id`, given the (about-to-be-applied)
// field value — NOT derived from a possibly-stale `sequence` array, since
// formData hasn't re-rendered yet at the moment a selection is made. This
// sidesteps the race that array-index-based "next" would hit when a
// selection itself changes which conditional card comes next.
const nextCardId = (
  id: ProfileFieldId,
  snapshotLocation: string,
  currentCurriculum: string[],
  snapshotGrade: string,
  targetGoal: string,
  targetGrade: string,
  targetStream: string,
  streamElectives: StreamElectives
): ProfileFieldId | null => {
  if (id === "country") {
    if (snapshotLocation === "us") return "usState";
    if (snapshotLocation === "other") return "countryOther";
    return "curriculum";
  }
  if (id === "usState" || id === "countryOther") return "curriculum";
  if (id === "curriculum") {
    return currentCurriculum.includes("other") ? "curriculumOther" : "targetBoard";
  }
  if (id === "curriculumOther") return "targetBoard";

  const idx = BASE_ORDER.indexOf(id);
  if (idx === -1) return null;
  const hasStream = gradeHasStream(snapshotGrade, targetGoal, targetGrade);
  const skip = (next: ProfileFieldId) =>
    (next === "targetStream" && !hasStream) ||
    (next === "targetElectives" && !(hasStream && electivesForStream(streamElectives, targetStream).length > 0));
  return BASE_ORDER.slice(idx + 1).find((next) => !skip(next)) ?? null;
};

const cardHasError = (card: ProfileCard, errors: Record<string, string>): boolean => {
  if (card.id === "name") return !!(errors.studentName || errors.studentLastName);
  if (card.id === "previousSchool") return !!(errors.previouslyStudiedInIndia || errors.educationHistory);
  return !!(card.errorField && errors[card.errorField]);
};

const gradeLabel = (grade: string) => (grade === "KG" ? "KG" : `Grade ${grade}`);

const isCardAnswered = (card: ProfileCard, formData: AssessmentFormData): boolean => {
  switch (card.id) {
    case "name":
      return !!formData.studentName.trim() && !!formData.studentLastName.trim();
    case "schoolStage":
      return !!formData.schoolStage;
    case "grade":
      return !!formData.snapshotGrade;
    case "country":
      return !!formData.snapshotLocation;
    case "usState":
      return !!formData.usState;
    case "countryOther":
      return !!formData.snapshotLocationOther;
    case "curriculum":
      return formData.currentCurriculum.length > 0;
    case "curriculumOther":
      return !!formData.currentCurriculumOther;
    case "targetBoard":
      return !!formData.targetGoal;
    case "targetGrade":
      return !!formData.targetGrade;
    case "targetStream":
      return !!formData.targetStream;
    case "targetElectives":
      return (formData.targetElectives ?? []).length > 0;
    case "timeline":
      return !!formData.timeline;
    case "previousSchool":
      return formData.previouslyStudiedInIndia === "no" || (formData.previouslyStudiedInIndia === "yes" && previousSchoolsComplete(formData.educationHistory));
    default:
      return false;
  }
};

const displayValue = (id: ProfileFieldId, formData: AssessmentFormData): string | undefined => {
  switch (id) {
    case "name":
      return formData.studentName || formData.studentLastName
        ? `${formData.studentName} ${formData.studentLastName}`.trim()
        : undefined;
    case "schoolStage":
      return SCHOOL_STAGES.find((s) => s.value === formData.schoolStage)?.label;
    case "grade":
      return formData.snapshotGrade ? `Grade ${formData.snapshotGrade}` : undefined;
    case "country":
      return COUNTRIES.find((c) => c.value === formData.snapshotLocation)?.label;
    case "usState":
      return US_STATES.find((s) => s.value === formData.usState)?.label;
    case "countryOther":
      return formData.snapshotLocationOther || undefined;
    case "curriculum": {
      const options = getCurriculumOptions(formData.schoolStage, formData.snapshotLocation);
      const labels = formData.currentCurriculum
        .map((v) => {
          const opt = options.find((c) => c.value === v);
          return opt ? resolveCurriculumOptionLabel(opt.value, opt.label, formData) : undefined;
        })
        .filter((l): l is string => !!l);
      return labels.length > 0 ? labels.join(", ") : undefined;
    }
    case "curriculumOther":
      return formData.currentCurriculumOther || undefined;
    case "targetBoard":
      return TARGET_BOARDS.find((b) => b.value === formData.targetGoal)?.label;
    case "targetGrade":
      return TARGET_GRADE_OPTIONS.find((g) => g.value === formData.targetGrade)?.label;
    case "targetStream":
      return targetStreamLabel(formData.targetStream);
    case "targetElectives":
      return (formData.targetElectives ?? []).length > 0 ? formData.targetElectives.join(", ") : "None";
    case "timeline":
      return TIMELINES.find((t) => t.value === formData.timeline)?.label;
    case "previousSchool": {
      if (formData.previouslyStudiedInIndia === "no") return "No";
      if (formData.previouslyStudiedInIndia !== "yes") return undefined;
      const schools = formData.educationHistory
        .filter((e) => e.curriculum || e.fromGrade)
        .map((e) => [e.curriculum, e.fromGrade && e.toGrade ? `${gradeLabel(e.fromGrade)}–${gradeLabel(e.toGrade)}` : ""].filter(Boolean).join(" "));
      return schools.length > 0 ? `Yes · ${schools.join("; ")}` : "Yes";
    }
    default:
      return undefined;
  }
};

interface SummarySection {
  key: string;
  icon: ProfileIcon;
  tileColor: TileColor;
  label: string;
  value?: string;
  editCardId: ProfileFieldId;
}

// Groups the flat card-per-field answers into the topic sections the
// summary card actually shows — Location folds country + state into one
// line, Goal folds target board + target grade into one line, so the
// summary reads as 7 short rows instead of up to 11 raw fields.
const buildSummarySections = (formData: AssessmentFormData, streamElectives: StreamElectives): SummarySection[] => {
  const stateLabel = formData.snapshotLocation === "us" ? displayValue("usState", formData) : undefined;
  const locationValue =
    formData.snapshotLocation === "other"
      ? displayValue("countryOther", formData)
      : [displayValue("country", formData), stateLabel].filter(Boolean).join(" · ") || undefined;

  const curriculumOptions = getCurriculumOptions(formData.schoolStage, formData.snapshotLocation);
  const curriculumLabels = formData.currentCurriculum
    .filter((v) => v !== "other")
    .map((v) => {
      const opt = curriculumOptions.find((c) => c.value === v);
      return opt ? resolveCurriculumOptionLabel(opt.value, opt.label, formData) : undefined;
    })
    .filter((l): l is string => !!l);
  if (formData.currentCurriculum.includes("other") && formData.currentCurriculumOther) {
    curriculumLabels.push(formData.currentCurriculumOther);
  }
  const curriculumValue = curriculumLabels.length > 0 ? curriculumLabels.join(", ") : undefined;

  const goalValue = formData.targetGrade
    ? [displayValue("targetBoard", formData), targetGradeLabel(formData.targetGrade, formData.snapshotGrade)].filter(Boolean).join(" · ") || undefined
    : displayValue("targetBoard", formData);

  return [
    { key: "name", icon: GlobiculumStudentIcon, tileColor: "violet", label: "About You", value: displayValue("name", formData), editCardId: "name" },
    { key: "school", icon: GlobiculumSchoolIcon, tileColor: "teal", label: "School", value: displayValue("schoolStage", formData), editCardId: "schoolStage" },
    { key: "grade", icon: GlobiculumGradeIcon, tileColor: "violet", label: "Grade", value: displayValue("grade", formData), editCardId: "grade" },
    { key: "location", icon: GlobiculumGlobeIcon, tileColor: "teal", label: "Location", value: locationValue, editCardId: "country" },
    { key: "curriculum", icon: BookOpen, tileColor: "violet", label: "Curriculum", value: curriculumValue, editCardId: "curriculum" },
    { key: "goal", icon: GlobiculumTargetIcon, tileColor: "amber", label: "Goal", value: goalValue, editCardId: "targetBoard" },
    // Its own row so the stream can be edited directly; the Goal row's edit
    // opens the board card, which never leads on to the stream when editing.
    ...(gradeHasStream(formData.snapshotGrade, formData.targetGoal, formData.targetGrade)
      ? [{ key: "stream", icon: GlobiculumTargetIcon, tileColor: "violet" as TileColor, label: "Stream", value: displayValue("targetStream", formData), editCardId: "targetStream" as const }]
      : []),
    ...(gradeHasStream(formData.snapshotGrade, formData.targetGoal, formData.targetGrade) &&
    electivesForStream(streamElectives, formData.targetStream).length > 0
      ? [{ key: "electives", icon: BookOpen, tileColor: "violet" as TileColor, label: "Optional Subjects", value: displayValue("targetElectives", formData), editCardId: "targetElectives" as const }]
      : []),
    { key: "timeline", icon: GlobiculumTimelineIcon, tileColor: "teal", label: "Timeline", value: displayValue("timeline", formData), editCardId: "timeline" },
    { key: "previousSchool", icon: GlobiculumEducationIcon, tileColor: "amber", label: "Previous Learning (optional)", value: displayValue("previousSchool", formData), editCardId: "previousSchool" },
  ];
};

type NavStatus = "completed" | "current" | "upcoming" | "skipped";

const NAV_DOT_STYLE: Record<NavStatus, string> = {
  completed: "border-secondary bg-secondary text-secondary-foreground",
  current: "border-violet bg-violet text-violet-foreground shadow-glow-sm",
  upcoming: "border-border bg-card text-transparent",
  skipped: "border-border bg-muted text-muted-foreground",
};
const NAV_LINE_STYLE: Record<NavStatus, string> = {
  completed: "bg-secondary",
  current: "bg-violet",
  upcoming: "bg-border",
  skipped: "bg-border",
};
const NAV_LABEL_STYLE: Record<NavStatus, string> = {
  completed: "text-foreground",
  current: "text-foreground font-semibold",
  upcoming: "text-muted-foreground",
  skipped: "text-muted-foreground/70",
};

interface NavItem {
  key: string;
  label: string;
  status: NavStatus;
  sublabel?: string;
  onClick?: () => void;
  milestone: Milestone;
}

const NavDot = ({ status }: { status: NavStatus }) => (
  <span
    className={cn(
      "relative z-10 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200",
      NAV_DOT_STYLE[status]
    )}
  >
    {status === "completed" && <Check className="h-2.5 w-2.5" aria-hidden="true" />}
    {status === "skipped" && <Minus className="h-2 w-2" aria-hidden="true" />}
    {status === "current" && <span className="h-1 w-1 rounded-full bg-white" aria-hidden="true" />}
  </span>
);

const NavRow = ({ item, isLast }: { item: NavItem; isLast: boolean }) => {
  const content = (
    <>
      <NavDot status={item.status} />
      <span className="min-w-0">
        <span className={cn("block truncate text-[11px]", NAV_LABEL_STYLE[item.status])}>{item.label}</span>
        {item.sublabel && (
          <span
            className={cn(
              "block truncate text-[11px]",
              item.status === "completed" && "font-medium text-secondary",
              item.status === "current" && "font-medium text-violet",
              (item.status === "skipped" || item.status === "upcoming") && "text-muted-foreground/70"
            )}
          >
            {item.sublabel}
          </span>
        )}
      </span>
    </>
  );

  return (
    <li className="relative pb-2 last:pb-0">
      {!isLast && <span className={cn("absolute left-[6px] top-5 h-full w-0.5", NAV_LINE_STYLE[item.status])} aria-hidden="true" />}
      {item.onClick ? (
        <button
          type="button"
          onClick={item.onClick}
          className="relative z-10 flex w-full items-center gap-2 rounded-lg p-0.5 text-left transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {content}
        </button>
      ) : (
        <div className={cn("relative z-10 flex items-center gap-2 rounded-lg p-0.5", item.status === "current" && "bg-violet/5")}>{content}</div>
      )}
    </li>
  );
};

// Groups navItems into their conceptual milestones for presentation only —
// the underlying item order/status/onClick logic is untouched.
type NavRenderEntry = { type: "header"; key: string; label: Milestone } | { type: "item"; item: NavItem };

const buildNavRenderEntries = (navItems: NavItem[]): NavRenderEntry[] => {
  const currentMilestone = navItems.find((i) => i.status === "current")?.milestone;
  const entries: NavRenderEntry[] = [];
  let lastMilestone: Milestone | null = null;
  for (const item of navItems) {
    if (item.milestone !== lastMilestone) {
      entries.push({ type: "header", key: `header-${item.milestone}`, label: item.milestone });
      lastMilestone = item.milestone;
    }
    // Keep the nav uncluttered: a not-yet-reached step only shows once its
    // own milestone group is the one currently being worked on — future
    // groups still show their header (so the roadmap stays visible) but not
    // every individual field inside them yet. Anything already answered (or
    // already passed) stays visible regardless of milestone.
    if (item.status !== "upcoming" || item.milestone === currentMilestone) {
      entries.push({ type: "item", item });
    }
  }
  return entries;
};

const NavPanel = ({ navItems }: { navItems: NavItem[] }) => {
  const entries = buildNavRenderEntries(navItems);
  return (
    <nav aria-label="Student profile progress" className="hidden lg:block lg:w-[152px] lg:shrink-0">
      <div className="lg:sticky lg:top-4">
        <ol>
          {entries.map((entry, i) => {
            if (entry.type === "header") {
              return (
                <li key={entry.key} className="list-none pb-0.5 pt-2.5 first:pt-0">
                  <span className="text-sm font-bold tracking-wide text-muted-foreground/60">{entry.label}</span>
                </li>
              );
            }
            // Connecting line stops at the last row of each milestone group
            // rather than the very last row overall, so groups read as
            // distinct clusters instead of one continuous chain.
            const nextEntry = entries[i + 1];
            const isGroupEnd = !nextEntry || nextEntry.type === "header";
            return <NavRow key={entry.item.key} item={entry.item} isLast={isGroupEnd} />;
          })}
        </ol>
      </div>
    </nav>
  );
};

const MobileProgress = ({ navItems, activeLabel, position, total }: { navItems: NavItem[]; activeLabel: string; position: number; total: number }) => (
  <div className="mb-4 lg:hidden">
    <div className="flex items-center gap-1.5" role="img" aria-label={`Progress: ${position} of ${total}`}>
      {navItems.map((item) => (
        <span
          key={item.key}
          className={cn(
            "h-1.5 flex-1 rounded-full transition-colors duration-200",
            item.status === "completed" && "bg-secondary",
            item.status === "current" && "bg-violet",
            item.status === "skipped" && "bg-border",
            item.status === "upcoming" && "bg-muted"
          )}
          aria-hidden="true"
        />
      ))}
    </div>
    <p className="mt-1.5 text-xs font-medium text-muted-foreground">
      {activeLabel} · {position} of {total}
    </p>
  </div>
);

const CardFrame = ({
  icon: Icon,
  tileColor,
  kicker,
  title,
  hint,
  error,
  invalid,
  optional,
  children,
  footer,
}: {
  icon: ProfileIcon;
  tileColor: TileColor;
  kicker?: string;
  title: string;
  hint?: string;
  error?: string;
  invalid?: boolean;
  /** Shows "(Optional)" after the title. */
  optional?: boolean;
  children: ReactNode;
  /** The card's Back / Next row (CardNav), below any error. */
  footer?: ReactNode;
}) => (
  <FlashcardShell invalid={invalid || !!error} accent="teal" accentBorder>
    <div className="flex flex-col items-center text-center">
      <div className="mb-4">
        <GlobiculumIconTile tone={tileColor} size={64}>
          <Icon size={34} />
        </GlobiculumIconTile>
      </div>
      {kicker && <p className="mb-1 text-xs font-semibold text-secondary">{kicker}</p>}
      <h4 className="text-xl font-bold text-foreground">
        {title}
        {optional && <OptionalLabel />}
      </h4>
      {hint && <p className="mt-1.5 text-sm text-muted-foreground">{hint}</p>}
    </div>
    <div className="mt-6">{children}</div>
    <FieldError message={error} />
    {footer}
  </FlashcardShell>
);

interface StudentProfileWizardProps {
  formData: AssessmentFormData;
  setField: <K extends keyof AssessmentFormData>(field: K, value: AssessmentFormData[K]) => void;
  errors: Record<string, string>;
  /** The page's Continue: Next on the finished summary moves to the next step. */
  onContinue?: () => void;
}

const ADVANCE_DELAY_MS = 420;

const StudentProfileWizard = ({ formData, setField, errors, onContinue }: StudentProfileWizardProps) => {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const streamElectives = useStreamElectives(formData);
  const sequence = buildCardSequence(formData, streamElectives);

  // Opening the step (after a refresh, or coming back to it) continues where
  // the student left off: the first required question still unanswered, or
  // the summary once they are all in (a retake, or a finished step).
  const firstUnanswered = sequence.find((card) => !card.optional && !isCardAnswered(card, formData));

  const [phase, setPhase] = useState<"cards" | "summary">(firstUnanswered ? "cards" : "summary");
  const [currentCardId, setCurrentCardId] = useState<ProfileFieldId>(firstUnanswered?.id ?? "name");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [editingSingleCard, setEditingSingleCard] = useState(false);

  const currentIndex = Math.max(0, sequence.findIndex((c) => c.id === currentCardId));
  const currentCard = sequence[currentIndex] ?? sequence[0];
  const position = currentIndex + 1;
  const total = sequence.length;

  // If a failed outer "Continue" produces an error for a field the wizard
  // isn't currently showing, jump straight to it. useLayoutEffect (not
  // useEffect) so this — and any re-render it triggers — fully settles
  // before the controller's own useScrollToFirstInvalidField effect (a
  // sibling passive effect one level up) queries the DOM in the same
  // commit; otherwise that query could run against the pre-jump card.
  useLayoutEffect(() => {
    const firstInvalid = sequence.find((c) => cardHasError(c, errors));
    if (!firstInvalid) return;
    if (phase === "cards" && currentCardId === firstInvalid.id) return;
    setEditingSingleCard(false);
    setPhase("cards");
    setCurrentCardId(firstInvalid.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errors]);

  // continueEditing: stay on the cards after a single-card edit, for an edit
  // that makes another answer newly required (see selectChoice).
  const advanceTo = (nextId: ProfileFieldId | null, continueEditing = false) => {
    setIsTransitioning(true);
    window.setTimeout(
      () => {
        setIsTransitioning(false);
        if (nextId === null || (editingSingleCard && !continueEditing)) {
          setEditingSingleCard(false);
          setPhase("summary");
        } else {
          setCurrentCardId(nextId);
        }
      },
      shouldReduceMotion ? 0 : ADVANCE_DELAY_MS
    );
  };

  const selectChoice = <K extends keyof AssessmentFormData>(field: K, value: AssessmentFormData[K], extra?: () => void) => {
    if (isTransitioning) return;
    setField(field, value);
    extra?.();
    const nextId = nextCardId(
      currentCard.id,
      currentCard.id === "country" ? (value as string) : formData.snapshotLocation,
      currentCard.id === "curriculum" ? (value as string[]) : formData.currentCurriculum,
      currentCard.id === "grade" ? (value as string) : formData.snapshotGrade,
      currentCard.id === "targetBoard" ? (value as string) : formData.targetGoal,
      currentCard.id === "targetGrade" ? (value as string) : formData.targetGrade,
      currentCard.id === "targetStream" ? (value as string) : formData.targetStream,
      streamElectives
    );
    // Editing the grade, board or same/next answer from the summary can make a
    // stream required (Grade 10 -> 11, IB -> CBSE, Grade 10 moving up). Ask for
    // it now rather than returning to a summary that fails validation on Continue.
    const streamNowNeeded =
      editingSingleCard &&
      (currentCard.id === "grade" || currentCard.id === "targetBoard" || currentCard.id === "targetGrade") &&
      gradeHasStream(
        currentCard.id === "grade" ? (value as string) : formData.snapshotGrade,
        currentCard.id === "targetBoard" ? (value as string) : formData.targetGoal,
        currentCard.id === "targetGrade" ? (value as string) : formData.targetGrade
      ) &&
      !normalizeTargetStream(formData.targetStream);
    // Editing the grade or board can likewise leave a board or class with no
    // data (Grade 9 -> 7 on ICSE); open that card now (dataCoverage.ts).
    const coverageCard =
      editingSingleCard && (currentCard.id === "grade" || currentCard.id === "targetBoard")
        ? coverageCardToFix(
            currentCard.id === "grade" ? (value as string) : formData.snapshotGrade,
            currentCard.id === "targetBoard" ? (value as string) : formData.targetGoal,
            formData.targetGrade
          )
        : null;
    advanceTo(coverageCard ?? (streamNowNeeded ? "targetStream" : nextId), !!coverageCard || streamNowNeeded);
  };

  const continueFromText = () => {
    if (isTransitioning) return;
    advanceTo(nextCardId(currentCard.id, formData.snapshotLocation, formData.currentCurriculum, formData.snapshotGrade, formData.targetGoal, formData.targetGrade, formData.targetStream, streamElectives));
  };

  const continueFromName = () => {
    if (isTransitioning) return;
    if (!formData.studentName.trim() || !formData.studentLastName.trim()) return;
    advanceTo(nextCardId("name", formData.snapshotLocation, formData.currentCurriculum, formData.snapshotGrade, formData.targetGoal, formData.targetGrade, formData.targetStream, streamElectives));
  };

  const goBackOneCard = () => {
    if (isTransitioning || currentIndex === 0) return;
    setEditingSingleCard(false);
    setCurrentCardId(sequence[currentIndex - 1].id);
  };

  const editCard = (id: ProfileFieldId) => {
    setEditingSingleCard(true);
    setPhase("cards");
    setCurrentCardId(id);
  };

  // Summary "Back" reopens the last question.
  const backFromSummary = () => {
    setEditingSingleCard(false);
    setPhase("cards");
    setCurrentCardId(sequence[sequence.length - 1].id);
  };

  // Yes shows the first school's row straight away; No needs nothing more, so
  // it moves on like the other single-choice cards.
  const answerPreviousSchool = (studied: boolean) => {
    if (isTransitioning) return;
    setField("previousLocation", studied ? "india" : "");
    if (studied) {
      setField("previouslyStudiedInIndia", "yes");
      if (formData.educationHistory.length === 0) setField("educationHistory", [{ ...EMPTY_EDUCATION_ENTRY }]);
    } else {
      selectChoice("previouslyStudiedInIndia", "no");
    }
  };

  // The Back / Next row inside each card. Back is hidden on the first card;
  // Next moves on once the question is answered (radio cards also move on by
  // themselves when picked).
  const cardNav = (answered: boolean, onNext: () => void = continueFromText, nextLabel = "Next") => (
    <CardNav
      onBack={currentIndex > 0 ? goBackOneCard : undefined}
      onNext={onNext}
      nextDisabled={!answered || isTransitioning}
      nextLabel={nextLabel}
    />
  );

  const navItems: NavItem[] = sequence.map((card, idx) => {
    const answered = isCardAnswered(card, formData);
    const status: NavStatus = answered
      ? "completed"
      : phase === "summary"
        ? "skipped"
        : idx === currentIndex
          ? "current"
          : idx < currentIndex
            ? "skipped"
            : "upcoming";
    // Short journey labels, no value previews — the left nav is a map of
    // where you are, not a second place to read your answers back (that's
    // what the summary card is for).
    return {
      key: card.id,
      label: card.navLabel,
      milestone: card.milestone,
      status,
      // Display-only — editing an already-answered step now happens in
      // exactly one place (the summary page's own pencil-icon rows, via
      // buildSummarySections below), not also here mid-sequence. Two
      // separate ways to trigger the same edit was the redundancy being
      // removed; editCard(card.id) is still what the summary rows call.
      onClick: undefined,
    };
  });

  if (phase === "summary") {
    const sections = buildSummarySections(formData, streamElectives);
    const answeredCount = sections.filter((s) => s.value).length;

    return (
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <NavPanel navItems={navItems} />

        <div className="min-w-0 flex-1 space-y-4">
          <FlashcardShell accent="teal" accentBorder>
            <div className="flex flex-col items-center text-center">
              <div className="mb-3">
                <GlobiculumIconTile tone="teal" size={52}>
                  <GlobiculumChecklistIcon size={28} />
                </GlobiculumIconTile>
              </div>
              <h3 className="text-lg font-bold text-foreground">You're all set.</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {answeredCount} of {sections.length} complete
              </p>
            </div>

            <div className="mt-5 space-y-1.5">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => editCard(section.editCardId)}
                    className="flex w-full items-center gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-left transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  >
                    <GlobiculumIconTile tone={section.tileColor} size={36} accent={false}>
                      <Icon size={18} />
                    </GlobiculumIconTile>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{section.label}</span>
                      <span className="block truncate text-sm font-medium text-foreground">{section.value ?? "—"}</span>
                    </span>
                    <img src={editIcon} className="h-3.5 w-3.5 shrink-0 object-contain" alt="" aria-hidden="true" draggable={false} />
                  </button>
                );
              })}
            </div>

            <CardNav onBack={backFromSummary} onNext={onContinue} />
          </FlashcardShell>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <NavPanel navItems={navItems} />

      <div className="min-w-0 flex-1 space-y-3">
        <MobileProgress navItems={navItems} activeLabel={currentCard.title} position={position} total={total} />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentCard.id}
            initial={shouldReduceMotion ? undefined : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {currentCard.id === "name" && (
              <CardFrame
                icon={currentCard.icon}
                tileColor={currentCard.tileColor}
                title={currentCard.title}
                hint={currentCard.hint}
                invalid={cardHasError(currentCard, errors)}
                footer={cardNav(!!formData.studentName.trim() && !!formData.studentLastName.trim(), continueFromName)}
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Input
                      id="student-first-name"
                      placeholder="First name"
                      value={formData.studentName}
                      onChange={(e) => setField("studentName", e.target.value)}
                    />
                    <FieldError message={errors.studentName} />
                  </div>
                  <div>
                    <Input
                      id="student-last-name"
                      placeholder="Last name"
                      value={formData.studentLastName}
                      onChange={(e) => setField("studentLastName", e.target.value)}
                    />
                    <FieldError message={errors.studentLastName} />
                  </div>
                </div>
                {/* No voice input here: browser speech recognition sends the audio to Google. */}
              </CardFrame>
            )}

            {currentCard.id === "schoolStage" && (
              <CardFrame icon={currentCard.icon} tileColor={currentCard.tileColor} kicker={currentCard.kicker} title={currentCard.title} hint={currentCard.hint} error={errors.schoolStage} footer={cardNav(!!formData.schoolStage)}>
                <div role="radiogroup" aria-label={currentCard.title} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {SCHOOL_STAGES.map((stage) => (
                    <InputCard
                      key={stage.value}
                      variant="large"
                      mode="radio"
                      icon={stage.icon}
                      label={stage.label}
                      description={stage.description}
                      selected={formData.schoolStage === stage.value}
                      onClick={() =>
                        selectChoice("schoolStage", stage.value, () => {
                          setField("snapshotGrade", "");
                          setField("currentCurriculum", []);
                        })
                      }
                    />
                  ))}
                </div>
              </CardFrame>
            )}

            {currentCard.id === "grade" && (
              <CardFrame icon={currentCard.icon} tileColor={currentCard.tileColor} title={currentCard.title} hint={currentCard.hint} error={errors.snapshotGrade} footer={cardNav(!!formData.snapshotGrade)}>
                <div role="radiogroup" aria-label={currentCard.title} className="flex flex-wrap justify-center gap-2">
                  {getGradeOptions(formData.schoolStage).map((grade) => (
                    <InputCard
                      key={grade}
                      variant="compact-pill"
                      mode="radio"
                      label={String(grade)}
                      selected={formData.snapshotGrade === String(grade)}
                      onClick={() => selectChoice("snapshotGrade", String(grade))}
                    />
                  ))}
                </div>
              </CardFrame>
            )}

            {currentCard.id === "country" && (
              <CardFrame icon={currentCard.icon} tileColor={currentCard.tileColor} title={currentCard.title} hint={currentCard.hint} error={errors.snapshotLocation} footer={cardNav(!!formData.snapshotLocation)}>
                <div role="radiogroup" aria-label={currentCard.title} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {COUNTRIES.map((loc) => (
                    <InputCard
                      key={loc.value}
                      variant="large"
                      mode="radio"
                      icon={Globe2}
                      iconColorClassName="text-secondary/70"
                      emoji={loc.Flag ? <loc.Flag /> : undefined}
                      label={loc.label}
                      description={loc.enabled ? "Available" : "Coming Soon"}
                      selected={formData.snapshotLocation === loc.value}
                      onClick={() => selectChoice("snapshotLocation", loc.value)}
                      disabled={!loc.enabled}
                      disabledHint="Coming Soon"
                    />
                  ))}
                </div>
              </CardFrame>
            )}

            {currentCard.id === "usState" && (
              <CardFrame icon={currentCard.icon} tileColor={currentCard.tileColor} title={currentCard.title} hint={currentCard.hint} error={errors.usState} footer={cardNav(!!formData.usState)}>
                <Select value={formData.usState} onValueChange={(value) => selectChoice("usState", value)}>
                  <SelectTrigger id="us-state">
                    <SelectValue placeholder="Select your state" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {US_STATES.map((state) => (
                      <SelectItem key={state.value} value={state.value}>
                        {state.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardFrame>
            )}

            {currentCard.id === "countryOther" && (
              <CardFrame icon={currentCard.icon} tileColor={currentCard.tileColor} title={currentCard.title} footer={cardNav(!!formData.snapshotLocationOther.trim())}>
                <Input
                  id="snapshot-location-other"
                  placeholder="Enter country name"
                  value={formData.snapshotLocationOther}
                  onChange={(e) => setField("snapshotLocationOther", e.target.value)}
                />
              </CardFrame>
            )}

            {currentCard.id === "curriculum" && (
              <CardFrame icon={currentCard.icon} tileColor={currentCard.tileColor} title={currentCard.title} hint={currentCard.hint} error={errors.currentCurriculum} footer={cardNav(formData.currentCurriculum.length > 0)}>
                <div role="radiogroup" aria-label={currentCard.title} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {getCurriculumOptions(formData.schoolStage, formData.snapshotLocation).map((c) => (
                    <InputCard
                      key={c.value}
                      variant="large"
                      mode="radio"
                      label={resolveCurriculumOptionLabel(c.value, c.label, formData)}
                      description={currentCurriculumHasData(c.value) ? "Available" : "Coming Soon"}
                      selected={formData.currentCurriculum[0] === c.value}
                      onClick={() => selectChoice("currentCurriculum", [c.value])}
                      disabled={!currentCurriculumHasData(c.value)}
                      disabledHint={c.value === "ap" ? AP_TRACK_HINT : "Coming Soon"}
                    />
                  ))}
                </div>
              </CardFrame>
            )}

            {currentCard.id === "curriculumOther" && (
              <CardFrame icon={currentCard.icon} tileColor={currentCard.tileColor} title={currentCard.title} footer={cardNav(!!formData.currentCurriculumOther.trim())}>
                <Input
                  id="current-curriculum-other"
                  placeholder="Enter curriculum name"
                  value={formData.currentCurriculumOther}
                  onChange={(e) => setField("currentCurriculumOther", e.target.value)}
                />
              </CardFrame>
            )}

            {currentCard.id === "targetBoard" && (
              <CardFrame icon={currentCard.icon} tileColor={currentCard.tileColor} title={currentCard.title} hint={currentCard.hint} error={errors.targetGoal} footer={cardNav(!!formData.targetGoal)}>
                <div role="radiogroup" aria-label={currentCard.title} className="grid grid-cols-2 gap-3">
                  {TARGET_BOARDS.map((board) => (
                    <InputCard
                      key={board.value}
                      variant="large"
                      mode="radio"
                      label={board.label}
                      description={boardCoverageNote(board.value, formData.snapshotGrade)}
                      selected={formData.targetGoal === board.value}
                      onClick={() => selectChoice("targetGoal", board.value)}
                      disabled={!boardHasData(board.value, formData.snapshotGrade)}
                      disabledHint={boardCoverageNote(board.value, formData.snapshotGrade)}
                    />
                  ))}
                </div>
              </CardFrame>
            )}

            {currentCard.id === "targetGrade" && (
              <CardFrame icon={currentCard.icon} tileColor={currentCard.tileColor} title={currentCard.title} hint={currentCard.hint} error={errors.targetGrade} footer={cardNav(!!formData.targetGrade)}>
                <div role="radiogroup" aria-label={currentCard.title} className="grid grid-cols-2 gap-3">
                  {TARGET_GRADE_OPTIONS.map((option) => {
                    const available = !formData.targetGoal || targetGradeHasData(formData.targetGoal, formData.snapshotGrade, option.value);
                    const boardLabel = TARGET_BOARDS.find((b) => b.value === formData.targetGoal)?.label;
                    return (
                      <InputCard
                        key={option.value}
                        variant="large"
                        mode="radio"
                        icon={option.icon}
                        label={option.label}
                        description={available ? undefined : `No ${boardLabel} data for Class ${entryGrade(formData.snapshotGrade, option.value)}`}
                        selected={formData.targetGrade === option.value}
                        onClick={() => selectChoice("targetGrade", option.value)}
                        disabled={!available}
                        disabledHint="Not available yet"
                      />
                    );
                  })}
                </div>
              </CardFrame>
            )}

            {currentCard.id === "targetStream" && (
              <CardFrame icon={currentCard.icon} tileColor={currentCard.tileColor} title={currentCard.title} hint={currentCard.hint} error={errors.targetStream} footer={cardNav(!!normalizeTargetStream(formData.targetStream))}>
                <div role="radiogroup" aria-label={currentCard.title} className="grid grid-cols-1 gap-3">
                  {TARGET_STREAMS.map((stream) => (
                    <InputCard
                      key={stream.value}
                      variant="large"
                      mode="radio"
                      label={stream.label}
                      description={stream.hint}
                      selected={formData.targetStream === stream.value}
                      onClick={() =>
                        // Keep only the optional subjects the new stream offers.
                        selectChoice("targetStream", stream.value, () =>
                          setField("targetElectives", (formData.targetElectives ?? []).filter((s) => streamElectives[stream.value].includes(s)))
                        )
                      }
                    />
                  ))}
                </div>
              </CardFrame>
            )}

            {currentCard.id === "targetElectives" && (
              <CardFrame
                icon={currentCard.icon}
                tileColor={currentCard.tileColor}
                title={currentCard.title}
                hint={currentCard.hint}
                optional
                footer={cardNav(true, continueFromText, (formData.targetElectives ?? []).length > 0 ? "Next" : "Skip, none of these")}
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {electivesForStream(streamElectives, formData.targetStream).map((subject) => {
                    const chosen = (formData.targetElectives ?? []).includes(subject);
                    return (
                      <InputCard
                        key={subject}
                        variant="large"
                        mode="checkbox"
                        label={subject}
                        selected={chosen}
                        onClick={() =>
                          setField(
                            "targetElectives",
                            chosen ? formData.targetElectives.filter((s) => s !== subject) : [...(formData.targetElectives ?? []), subject]
                          )
                        }
                      />
                    );
                  })}
                </div>
              </CardFrame>
            )}

            {currentCard.id === "timeline" && (
              <CardFrame icon={currentCard.icon} tileColor={currentCard.tileColor} title={currentCard.title} hint={currentCard.hint} error={errors.timeline} footer={cardNav(!!formData.timeline)}>
                <TimelineSelector options={TIMELINES} value={formData.timeline} onChange={(value) => selectChoice("timeline", value)} />
              </CardFrame>
            )}

            {currentCard.id === "previousSchool" && (
              <CardFrame
                icon={currentCard.icon}
                tileColor={currentCard.tileColor}
                title={currentCard.title}
                hint={currentCard.hint}
                error={errors.educationHistory ?? errors.previouslyStudiedInIndia}
                optional
                footer={cardNav(
                  formData.previouslyStudiedInIndia !== "yes" || previousSchoolsComplete(formData.educationHistory),
                  continueFromText,
                  formData.previouslyStudiedInIndia ? "Next" : "Skip"
                )}
              >
                <div role="radiogroup" aria-label={currentCard.title} className="flex justify-center gap-3">
                  <InputCard variant="chip" mode="radio" label="Yes" selected={formData.previouslyStudiedInIndia === "yes"} onClick={() => answerPreviousSchool(true)} />
                  <InputCard variant="chip" mode="radio" label="No" selected={formData.previouslyStudiedInIndia === "no"} onClick={() => answerPreviousSchool(false)} />
                </div>
                {formData.previouslyStudiedInIndia === "yes" && (
                  <div className="mt-6">
                    <p className="mb-3 text-sm text-muted-foreground">
                      {priorGradeOptions(formData.snapshotGrade).length > 1
                        ? `Add each school and the grades you studied there (before Grade ${formData.snapshotGrade}).`
                        : "Add the school you attended."}
                    </p>
                    <EducationHistoryList
                      entries={formData.educationHistory}
                      onChange={(entries) => setField("educationHistory", entries)}
                      currentGrade={formData.snapshotGrade}
                    />
                  </div>
                )}
              </CardFrame>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default StudentProfileWizard;
