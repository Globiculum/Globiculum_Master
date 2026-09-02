import { useLayoutEffect, useState, type ComponentType, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, ArrowUpCircle, BarChart3, BookOpen, Check, Equal, Globe2, Minus, Target } from "lucide-react";
import editIcon from "@/assets/icons-3d/edit.png";
import backIcon from "@/assets/icons-3d/back.png";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  GlobiculumChecklistIcon,
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
import VoiceInputButton from "../../shared/VoiceInputButton";
import TimelineSelector, { type TimelineOption } from "../../shared/TimelineSelector";
import { targetGradeLabel } from "../../shared/reviewFormatting";
import type { AssessmentFormData } from "../../shared/types";

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
// files only. Education History stays a separate static section below this
// wizard, unchanged, in StudentProfileStep.tsx.
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

const CURRICULUM_BY_STAGE: Record<string, { value: string; label: string }[]> = {
  elementary: [
    { value: "us-common-core", label: "US Common Core" },
    { value: "state-specific", label: "State-Specific Standards" },
    { value: "ngss", label: "NGSS (Next Generation Science Standards)" },
    { value: "ib-pyp", label: "IB Middle Year Programme" },
    { value: "cambridge-primary", label: "Cambridge Primary" },
    { value: "montessori", label: "Montessori Curriculum" },
    { value: "other", label: "Other" },
  ],
  middle: [
    { value: "us-common-core", label: "US Common Core" },
    { value: "state-specific", label: "State-Specific Standards" },
    { value: "ngss", label: "NGSS (Next Generation Science Standards)" },
    { value: "ib-myp", label: "IB Middle Year Programme" },
    { value: "cambridge-lower", label: "Cambridge Lower Secondary" },
    { value: "honors-advanced", label: "Honors / Advanced Programs" },
    { value: "other", label: "Other" },
  ],
  high: [
    { value: "us-common-core", label: "US Common Core" },
    { value: "state-specific", label: "State-Specific Standards" },
    { value: "ngss", label: "NGSS (Next Generation Science Standards)" },
    { value: "ap", label: "AP Track (Advanced Placement)" },
    { value: "ib-dp", label: "IB DP" },
    { value: "cambridge-igcse", label: "Cambridge IGCSE" },
    { value: "a-levels", label: "A-Levels" },
    { value: "other", label: "Other" },
  ],
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
  | "timeline";

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
  "timeline",
];

// A subset of GlobiculumIconTile's four tones — three families only, so the
// icon system stays cohesive rather than a different color per field. Amber
// is used exactly once (Target) to stay a "tiny accent," per the brand's
// semantic color guidance.
type TileColor = "violet" | "teal" | "amber";
type Milestone = "About You" | "Your School" | "Your Goal" | "Your Plan";

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
}

const buildCardSequence = (formData: AssessmentFormData): ProfileCard[] => {
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
    hint: "The curriculum or academic standards you currently follow at school.",
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
    {
      id: "timeline",
      icon: GlobiculumTimelineIcon,
      tileColor: "teal",
      milestone: "Your Plan",
      navLabel: "Timeline",
      title: "When are you planning to transition?",
      errorField: "timeline",
    }
  );

  return cards;
};

// The next card after a selection on `id`, given the (about-to-be-applied)
// field value — NOT derived from a possibly-stale `sequence` array, since
// formData hasn't re-rendered yet at the moment a selection is made. This
// sidesteps the race that array-index-based "next" would hit when a
// selection itself changes which conditional card comes next.
const nextCardId = (id: ProfileFieldId, snapshotLocation: string, currentCurriculum: string[]): ProfileFieldId | null => {
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
  return idx === -1 || idx === BASE_ORDER.length - 1 ? null : BASE_ORDER[idx + 1];
};

const cardHasError = (card: ProfileCard, errors: Record<string, string>): boolean => {
  if (card.id === "name") return !!(errors.studentName || errors.studentLastName);
  return !!(card.errorField && errors[card.errorField]);
};

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
    case "timeline":
      return !!formData.timeline;
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
      const options = CURRICULUM_BY_STAGE[formData.schoolStage] || [];
      const labels = formData.currentCurriculum
        .map((v) => options.find((c) => c.value === v)?.label)
        .filter((l): l is string => !!l);
      return labels.length > 0 ? labels.join(", ") : undefined;
    }
    case "curriculumOther":
      return formData.currentCurriculumOther || undefined;
    case "targetBoard":
      return TARGET_BOARDS.find((b) => b.value === formData.targetGoal)?.label;
    case "targetGrade":
      return TARGET_GRADE_OPTIONS.find((g) => g.value === formData.targetGrade)?.label;
    case "timeline":
      return TIMELINES.find((t) => t.value === formData.timeline)?.label;
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
const buildSummarySections = (formData: AssessmentFormData): SummarySection[] => {
  const stateLabel = formData.snapshotLocation === "us" ? displayValue("usState", formData) : undefined;
  const locationValue =
    formData.snapshotLocation === "other"
      ? displayValue("countryOther", formData)
      : [displayValue("country", formData), stateLabel].filter(Boolean).join(" · ") || undefined;

  const curriculumOptions = CURRICULUM_BY_STAGE[formData.schoolStage] || [];
  const curriculumLabels = formData.currentCurriculum
    .filter((v) => v !== "other")
    .map((v) => curriculumOptions.find((c) => c.value === v)?.label)
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
    { key: "timeline", icon: GlobiculumTimelineIcon, tileColor: "teal", label: "Timeline", value: displayValue("timeline", formData), editCardId: "timeline" },
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
      {activeLabel} · {position} of {total} · {Math.round((position / total) * 100)}%
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
  children,
  editing,
  onFinishEditing,
}: {
  icon: ProfileIcon;
  tileColor: TileColor;
  kicker?: string;
  title: string;
  hint?: string;
  error?: string;
  invalid?: boolean;
  children: ReactNode;
  /** True when this card was reached by clicking an already-answered nav
   * item to revisit it, rather than the normal forward sequence. Auto-advance
   * cards (radio/select, no manual "Next" of their own) only move on when the
   * selection actually changes — if reopened just to check it and nothing
   * changes, there was previously no way back to the summary except
   * retracing every "Back" step. Showing an explicit "Next" here, only while
   * editing, gives a guaranteed way out either way. */
  editing?: boolean;
  onFinishEditing?: () => void;
}) => (
  <FlashcardShell invalid={invalid || !!error} accent="teal" accentBorder>
    <div className="flex flex-col items-center text-center">
      <div className="mb-4">
        <GlobiculumIconTile tone={tileColor} size={64}>
          <Icon size={34} />
        </GlobiculumIconTile>
      </div>
      {kicker && <p className="mb-1 text-xs font-semibold text-secondary">{kicker}</p>}
      <h4 className="text-xl font-bold text-foreground">{title}</h4>
      {hint && <p className="mt-1.5 text-sm text-muted-foreground">{hint}</p>}
    </div>
    <div className="mt-6">{children}</div>
    <FieldError message={error} />
    {editing && onFinishEditing && (
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onFinishEditing}
          className="group inline-flex items-center gap-2 rounded-full bg-secondary py-2.5 pl-5 pr-2 text-sm font-semibold text-secondary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:bg-secondary/90"
        >
          Next
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 transition-transform duration-200 group-hover:translate-x-0.5">
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </button>
      </div>
    )}
  </FlashcardShell>
);

interface StudentProfileWizardProps {
  formData: AssessmentFormData;
  setField: <K extends keyof AssessmentFormData>(field: K, value: AssessmentFormData[K]) => void;
  errors: Record<string, string>;
}

const ADVANCE_DELAY_MS = 420;

const StudentProfileWizard = ({ formData, setField, errors }: StudentProfileWizardProps) => {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const sequence = buildCardSequence(formData);

  const hasExistingAnswers = BASE_ORDER.some((id) => isCardAnswered(sequence.find((c) => c.id === id)!, formData));
  const firstUnansweredId = (): ProfileFieldId => {
    for (const card of sequence) {
      if (!isCardAnswered(card, formData)) return card.id;
    }
    return "timeline";
  };

  const [phase, setPhase] = useState<"cards" | "summary">(hasExistingAnswers ? "summary" : "cards");
  const [currentCardId, setCurrentCardId] = useState<ProfileFieldId>(firstUnansweredId());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [editingSingleCard, setEditingSingleCard] = useState(false);
  const [focusedNameField, setFocusedNameField] = useState<"first" | "last">("first");

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

  const advanceTo = (nextId: ProfileFieldId | null) => {
    setIsTransitioning(true);
    window.setTimeout(
      () => {
        setIsTransitioning(false);
        if (nextId === null || editingSingleCard) {
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
      formData.currentCurriculum
    );
    advanceTo(nextId);
  };

  const continueFromText = () => {
    if (isTransitioning) return;
    advanceTo(nextCardId(currentCard.id, formData.snapshotLocation, formData.currentCurriculum));
  };

  const continueFromCurriculum = () => {
    if (isTransitioning || formData.currentCurriculum.length === 0) return;
    advanceTo(nextCardId("curriculum", formData.snapshotLocation, formData.currentCurriculum));
  };

  const toggleCurriculum = (value: string) => {
    const current = formData.currentCurriculum;
    setField("currentCurriculum", current.includes(value) ? current.filter((v) => v !== value) : [...current, value]);
  };

  const continueFromName = () => {
    if (isTransitioning) return;
    if (!formData.studentName.trim() || !formData.studentLastName.trim()) return;
    advanceTo(nextCardId("name", formData.snapshotLocation, formData.currentCurriculum));
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

  // For auto-advance cards (radio/select) reached via editCard: selecting a
  // value already jumps back to the summary via advanceTo's editingSingleCard
  // check, but if nothing changes there was previously no way back except
  // "Back"-ing through every earlier card. This gives a direct, guaranteed
  // way out regardless of whether anything changed.
  const finishEditing = () => {
    setEditingSingleCard(false);
    setPhase("summary");
  };

  const continueToNext = () => {
    document.getElementById("student-profile-next-section")?.scrollIntoView({ behavior: shouldReduceMotion ? "auto" : "smooth", block: "start" });
  };

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
    const sections = buildSummarySections(formData);
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

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={continueToNext}
                className="group inline-flex items-center gap-2 rounded-full bg-secondary py-2.5 pl-5 pr-2 text-sm font-semibold text-secondary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:bg-secondary/90"
              >
                Next
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 transition-transform duration-200 group-hover:translate-x-0.5">
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </button>
            </div>
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
              <CardFrame icon={currentCard.icon} tileColor={currentCard.tileColor} title={currentCard.title} hint={currentCard.hint} invalid={cardHasError(currentCard, errors)}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Input
                      id="student-first-name"
                      placeholder="First name"
                      value={formData.studentName}
                      onFocus={() => setFocusedNameField("first")}
                      onChange={(e) => setField("studentName", e.target.value)}
                    />
                    <FieldError message={errors.studentName} />
                  </div>
                  <div>
                    <Input
                      id="student-last-name"
                      placeholder="Last name"
                      value={formData.studentLastName}
                      onFocus={() => setFocusedNameField("last")}
                      onChange={(e) => setField("studentLastName", e.target.value)}
                    />
                    <FieldError message={errors.studentLastName} />
                  </div>
                </div>
                <div className="mt-2 flex justify-end">
                  <VoiceInputButton
                    label="Say your name"
                    onResult={(text) => setField(focusedNameField === "last" ? "studentLastName" : "studentName", text)}
                  />
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={continueFromName}
                    disabled={!formData.studentName.trim() || !formData.studentLastName.trim()}
                    className="group inline-flex items-center gap-2 rounded-full bg-secondary py-2.5 pl-5 pr-2 text-sm font-semibold text-secondary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                  >
                    Next
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 transition-transform duration-200 group-hover:translate-x-0.5">
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  </button>
                </div>
              </CardFrame>
            )}

            {currentCard.id === "schoolStage" && (
              <CardFrame icon={currentCard.icon} tileColor={currentCard.tileColor} kicker={currentCard.kicker} title={currentCard.title} hint={currentCard.hint} error={errors.schoolStage} editing={editingSingleCard} onFinishEditing={finishEditing}>
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
              <CardFrame icon={currentCard.icon} tileColor={currentCard.tileColor} title={currentCard.title} hint={currentCard.hint} error={errors.snapshotGrade} editing={editingSingleCard} onFinishEditing={finishEditing}>
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
              <CardFrame icon={currentCard.icon} tileColor={currentCard.tileColor} title={currentCard.title} hint={currentCard.hint} error={errors.snapshotLocation} editing={editingSingleCard} onFinishEditing={finishEditing}>
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
              <CardFrame icon={currentCard.icon} tileColor={currentCard.tileColor} title={currentCard.title} hint={currentCard.hint} error={errors.usState} editing={editingSingleCard} onFinishEditing={finishEditing}>
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
              <CardFrame icon={currentCard.icon} tileColor={currentCard.tileColor} title={currentCard.title}>
                <Input
                  id="snapshot-location-other"
                  placeholder="Enter country name"
                  value={formData.snapshotLocationOther}
                  onChange={(e) => setField("snapshotLocationOther", e.target.value)}
                />
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={continueFromText}
                    className="group inline-flex items-center gap-2 rounded-full bg-secondary py-2.5 pl-5 pr-2 text-sm font-semibold text-secondary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:bg-secondary/90"
                  >
                    Next
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 transition-transform duration-200 group-hover:translate-x-0.5">
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  </button>
                </div>
              </CardFrame>
            )}

            {currentCard.id === "curriculum" && (
              <CardFrame icon={currentCard.icon} tileColor={currentCard.tileColor} title={currentCard.title} hint={currentCard.hint} error={errors.currentCurriculum}>
                <div role="group" aria-label={currentCard.title} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(CURRICULUM_BY_STAGE[formData.schoolStage] || []).map((c) => (
                    <InputCard
                      key={c.value}
                      variant="large"
                      mode="checkbox"
                      label={c.label}
                      selected={formData.currentCurriculum.includes(c.value)}
                      onClick={() => toggleCurriculum(c.value)}
                    />
                  ))}
                </div>
                <p className="mt-4 text-center text-xs font-medium text-muted-foreground">
                  {formData.currentCurriculum.length} selected
                </p>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={continueFromCurriculum}
                    disabled={formData.currentCurriculum.length === 0}
                    className="group inline-flex items-center gap-2 rounded-full bg-secondary py-2.5 pl-5 pr-2 text-sm font-semibold text-secondary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                  >
                    Done
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 transition-transform duration-200 group-hover:translate-x-0.5">
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  </button>
                </div>
              </CardFrame>
            )}

            {currentCard.id === "curriculumOther" && (
              <CardFrame icon={currentCard.icon} tileColor={currentCard.tileColor} title={currentCard.title}>
                <Input
                  id="current-curriculum-other"
                  placeholder="Enter curriculum name"
                  value={formData.currentCurriculumOther}
                  onChange={(e) => setField("currentCurriculumOther", e.target.value)}
                />
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={continueFromText}
                    className="group inline-flex items-center gap-2 rounded-full bg-secondary py-2.5 pl-5 pr-2 text-sm font-semibold text-secondary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:bg-secondary/90"
                  >
                    Next
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 transition-transform duration-200 group-hover:translate-x-0.5">
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  </button>
                </div>
              </CardFrame>
            )}

            {currentCard.id === "targetBoard" && (
              <CardFrame icon={currentCard.icon} tileColor={currentCard.tileColor} title={currentCard.title} hint={currentCard.hint} error={errors.targetGoal} editing={editingSingleCard} onFinishEditing={finishEditing}>
                <div role="radiogroup" aria-label={currentCard.title} className="grid grid-cols-2 gap-3">
                  {TARGET_BOARDS.map((board) => (
                    <InputCard
                      key={board.value}
                      variant="large"
                      mode="radio"
                      label={board.label}
                      selected={formData.targetGoal === board.value}
                      onClick={() => selectChoice("targetGoal", board.value)}
                    />
                  ))}
                </div>
              </CardFrame>
            )}

            {currentCard.id === "targetGrade" && (
              <CardFrame icon={currentCard.icon} tileColor={currentCard.tileColor} title={currentCard.title} hint={currentCard.hint} error={errors.targetGrade} editing={editingSingleCard} onFinishEditing={finishEditing}>
                <div role="radiogroup" aria-label={currentCard.title} className="grid grid-cols-2 gap-3">
                  {TARGET_GRADE_OPTIONS.map((option) => (
                    <InputCard
                      key={option.value}
                      variant="large"
                      mode="radio"
                      icon={option.icon}
                      label={option.label}
                      selected={formData.targetGrade === option.value}
                      onClick={() => selectChoice("targetGrade", option.value)}
                    />
                  ))}
                </div>
              </CardFrame>
            )}

            {currentCard.id === "timeline" && (
              <CardFrame icon={currentCard.icon} tileColor={currentCard.tileColor} title={currentCard.title} hint={currentCard.hint} error={errors.timeline} editing={editingSingleCard} onFinishEditing={finishEditing}>
                <TimelineSelector options={TIMELINES} value={formData.timeline} onChange={(value) => selectChoice("timeline", value)} />
              </CardFrame>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={goBackOneCard}
            disabled={currentIndex === 0}
            className={cn("flex items-center gap-1 text-xs font-medium", currentIndex === 0 ? "invisible" : "text-muted-foreground hover:text-foreground")}
          >
            <img src={backIcon} className="h-3.5 w-3.5 object-contain" alt="" aria-hidden="true" draggable={false} /> Back
          </button>
          <span className="text-xs font-medium text-muted-foreground lg:hidden">
            {position} of {total}
          </span>
          <span className="w-10" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
};

export default StudentProfileWizard;
