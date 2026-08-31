import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight, Check, Minus, Plus, X,
  Calculator, Sigma, Shapes, Infinity as InfinityIcon, FlaskConical, TestTube, Atom, Dna, Code,
  BookOpen, PenTool, Languages, Landmark, ScrollText, Scale, Compass, Brain, Users, TrendingUp,
  Receipt, Briefcase, Leaf, Palette, GraduationCap,
  type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { GlobiculumChecklistIcon, GlobiculumIconTile } from "@/components/icons";
import FieldError from "../../shared/FieldError";
import editIcon from "@/assets/icons-3d/edit.png";
import backIcon from "@/assets/icons-3d/back.png";
import FlashcardShell from "../../shared/FlashcardShell";

// Combines what used to be two separate questions ("Current Subjects" then
// "How confident do you feel in each subject?") into one flashcard-per-
// subject interaction: picking a confidence level both records the
// confidence AND adds the subject to academicPath in the same tap. Layout is
// a persistent left journey navigator (desktop) / compact progress dots
// (mobile) plus a larger active card on the right — the interaction
// hierarchy asked for in the redesign — but the underlying state machine and
// storage are unchanged: academicPath: string[], plus subjectConfidences:
// Record<string, "strong"|"moderate"|"needs-help">.

export type ConfidenceValue = "strong" | "moderate" | "needs-help" | "not-applicable";

const CONFIDENCE_LEVELS: { value: ConfidenceValue; label: string }[] = [
  { value: "strong", label: "Strong" },
  { value: "moderate", label: "Moderate" },
  { value: "needs-help", label: "Needs Help" },
];

// Fourth option shown only on the main per-subject card (not the custom-add
// card) — replaces the old "I don't take this" text link below the row with
// a proper fourth button, and removes a subject from academicPath exactly
// like that link used to (see skipSubject).
export const MAIN_CONFIDENCE_LEVELS: { value: ConfidenceValue; label: string }[] = [
  ...CONFIDENCE_LEVELS,
  { value: "not-applicable", label: "Not Applicable" },
];

const DEFAULT_MICROCOPY: Record<ConfidenceValue, string> = {
  strong: "I feel confident",
  moderate: "I understand most of it",
  "needs-help": "I'd like more support",
  "not-applicable": "Doesn't apply",
};

const confidenceLabel = (value?: string): string =>
  CONFIDENCE_LEVELS.find((l) => l.value === value)?.label ?? value ?? "";

// A distinct, subject-relevant Lucide icon per subject, covering every
// subject string across all grade bands/curricula (elementary, IB,
// Cambridge/IGCSE, US high school, higher-secondary streams) rather than
// clustering many subjects behind one generic icon.
const SUBJECT_ICON: Record<string, LucideIcon> = {
  "Mathematics": Calculator,
  "Foundational Math": Calculator,
  "Algebra": Sigma,
  "Geometry": Shapes,
  "Pre-Calculus / Calculus": InfinityIcon,
  "Science": FlaskConical,
  "Basic Science": FlaskConical,
  "Sciences": FlaskConical,
  "Physics": Atom,
  "Chemistry": TestTube,
  "Biology": Dna,
  "Computer Science": Code,
  "English / Language Arts": BookOpen,
  "English": BookOpen,
  "English Language": BookOpen,
  "Language and Literature": BookOpen,
  "Reading & Comprehension": BookOpen,
  "Writing Skills": PenTool,
  "Language Acquisition": Languages,
  "Foreign Language": Languages,
  "Social Studies": Landmark,
  "Social Studies / US History": Landmark,
  "History": ScrollText,
  "Individuals and Societies": Landmark,
  "Humanities": Landmark,
  "Political Science": Scale,
  "Geography": Compass,
  "Psychology": Brain,
  "Sociology": Users,
  "Economics": TrendingUp,
  "Accountancy": Receipt,
  "Business Studies": Briefcase,
  "General Awareness / Environmental Learning": Leaf,
  "Elective (Art/Music/CS/Other)": Palette,
  "Elective (Art/Music/Technology)": Palette,
};
const getSubjectIcon = (subject: string): LucideIcon => SUBJECT_ICON[subject] ?? GraduationCap;

export const CONFIDENCE_STYLE: Record<ConfidenceValue, { idle: string; selected: string }> = {
  strong: {
    idle: "border-secondary/25 bg-secondary/5 text-foreground hover:border-secondary/60 hover:bg-secondary/10",
    selected: "border-secondary bg-secondary text-secondary-foreground shadow-glow-sm",
  },
  moderate: {
    idle: "border-accent/30 bg-accent/5 text-foreground hover:border-accent/60 hover:bg-accent/10",
    selected: "border-accent bg-accent text-accent-foreground shadow-glow-sm",
  },
  "needs-help": {
    idle: "border-violet/25 bg-violet/5 text-foreground hover:border-violet/60 hover:bg-violet/10",
    selected: "border-violet bg-violet text-violet-foreground shadow-glow-sm",
  },
  "not-applicable": {
    idle: "border-border bg-muted/30 text-foreground hover:border-muted-foreground/40 hover:bg-muted/50",
    selected: "border-muted-foreground bg-muted text-foreground shadow-glow-sm",
  },
};

const ConfidenceButton = ({
  level,
  microcopy,
  selected,
  onSelect,
  disabled,
}: {
  level: (typeof CONFIDENCE_LEVELS)[number];
  microcopy: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) => {
  const style = CONFIDENCE_STYLE[level.value];
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      whileHover={disabled ? undefined : { y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 420, damping: 20 }}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 rounded-xl border-2 px-4 py-4 text-center transition-colors duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected ? style.selected : style.idle,
        disabled && "cursor-not-allowed opacity-40"
      )}
    >
      <span className="flex items-center gap-1.5 text-sm font-semibold">
        {selected && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 20 }}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
          </motion.span>
        )}
        {level.label}
      </span>
      <span className={cn("text-[11px]", selected ? "opacity-90" : "text-muted-foreground")}>{microcopy}</span>
    </motion.button>
  );
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
}

const NavDot = ({ status }: { status: NavStatus }) => (
  <span
    className={cn(
      "relative z-10 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200",
      NAV_DOT_STYLE[status]
    )}
  >
    {status === "completed" && <Check className="h-3 w-3" aria-hidden="true" />}
    {status === "skipped" && <Minus className="h-2.5 w-2.5" aria-hidden="true" />}
    {status === "current" && <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />}
  </span>
);

const NavRow = ({ item, isLast }: { item: NavItem; isLast: boolean }) => {
  const content = (
    <>
      <NavDot status={item.status} />
      <span className="min-w-0">
        <span className={cn("block truncate text-sm", NAV_LABEL_STYLE[item.status])}>{item.label}</span>
        {item.sublabel && (
          <span
            className={cn(
              "block text-xs",
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
    <li className="relative pb-3 last:pb-0">
      {!isLast && (
        <span
          className={cn("absolute left-[9px] top-6 h-full w-0.5", NAV_LINE_STYLE[item.status])}
          aria-hidden="true"
        />
      )}
      {item.onClick ? (
        <button
          type="button"
          onClick={item.onClick}
          className="relative z-10 flex w-full items-center gap-2.5 rounded-lg p-0.5 text-left transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {content}
        </button>
      ) : (
        <div
          className={cn(
            "relative z-10 flex items-center gap-2.5 rounded-lg p-0.5",
            item.status === "current" && "bg-violet/5"
          )}
        >
          {content}
        </div>
      )}
    </li>
  );
};

const NavPanel = ({ navItems, navTitle }: { navItems: NavItem[]; navTitle: string; navSubtitle?: string }) => (
  <nav aria-label="Academic path progress" className="hidden lg:block lg:w-[232px] lg:shrink-0">
    <div className="lg:sticky lg:top-4">
      <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{navTitle}</h3>
      <ol className="mt-3">
        {navItems.map((item, i) => (
          <NavRow key={item.key} item={item} isLast={i === navItems.length - 1} />
        ))}
      </ol>
    </div>
  </nav>
);

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

interface AcademicPathFlashcardsProps {
  activeSubjectList: string[];
  requiredSubjects: Set<string>;
  academicPath: string[];
  subjectConfidences: Record<string, string>;
  setAcademicPath: (value: string[]) => void;
  setConfidence: (subject: string, value: string) => void;
  error?: string;
  // Copy overrides — all default to the original self-report wording, so
  // Student's output is byte-identical if none are passed. Parent passes
  // observer-framed text (see ParentStep2.tsx) without changing layout,
  // animation, or the interaction pattern itself.
  navTitle?: string;
  navSubtitle?: string;
  confidenceHint?: string;
  microcopy?: Partial<Record<ConfidenceValue, string>>;
  // Entries that live in academicPath but belong to a different section
  // (e.g. Parent's AP Courses chips) — excluded from the "Other subjects"
  // custom-card count so picking an AP course doesn't show up there too.
  excludeFromCustom?: string[];
  customCardTitle?: string;
  customCardSubtitle?: string;
  customCardQuestion?: string;
  summaryTitle?: string;
}

const ADVANCE_DELAY_MS = 420;

const AcademicPathFlashcards = ({
  activeSubjectList,
  requiredSubjects,
  academicPath,
  subjectConfidences,
  setAcademicPath,
  setConfidence,
  error,
  navTitle = "Your Academic Path",
  navSubtitle = "Tell us how each subject feels.",
  confidenceHint,
  microcopy,
  excludeFromCustom = [],
  customCardTitle = "Any other subjects?",
  customCardSubtitle = "Add any subject not listed above, then rate your confidence.",
  customCardQuestion = "How confident do you feel in this subject?",
  summaryTitle = "Your Academic Path is ready.",
}: AcademicPathFlashcardsProps) => {
  const resolvedMicrocopy: Record<ConfidenceValue, string> = { ...DEFAULT_MICROCOPY, ...microcopy };
  const shouldReduceMotion = useReducedMotion() ?? false;
  const customSubjects = academicPath.filter((s) => !activeSubjectList.includes(s) && !excludeFromCustom.includes(s));
  const totalCards = activeSubjectList.length + 1; // +1 for the trailing "Other subjects" card

  const hasExistingAnswers =
    activeSubjectList.some((s) => academicPath.includes(s) && subjectConfidences[s]) || customSubjects.length > 0;

  const [phase, setPhase] = useState<"cards" | "summary">(hasExistingAnswers ? "summary" : "cards");
  const [cardIndex, setCardIndex] = useState(0);
  const [draftName, setDraftName] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  // True when a card was opened by tapping a single row in the nav/summary
  // (rather than working through the deck in order) — one answer there
  // should return straight to the summary, not drag the student through
  // every remaining card in the sequence.
  const [editingSingleCard, setEditingSingleCard] = useState(false);

  const isOnCustomCard = cardIndex >= activeSubjectList.length;
  const currentSubject = isOnCustomCard ? null : activeSubjectList[cardIndex];
  const currentSubjectSelected = currentSubject ? subjectConfidences[currentSubject] : undefined;
  const position = Math.min(cardIndex, totalCards - 1) + 1;

  const advance = () => {
    setIsTransitioning(true);
    const isLast = cardIndex >= totalCards - 1 || editingSingleCard;
    window.setTimeout(
      () => {
        setIsTransitioning(false);
        if (isLast) {
          setEditingSingleCard(false);
          setPhase("summary");
        } else {
          setCardIndex((i) => i + 1);
        }
      },
      shouldReduceMotion ? 0 : ADVANCE_DELAY_MS
    );
  };

  const selectConfidence = (subject: string, value: ConfidenceValue) => {
    if (isTransitioning) return;
    if (!academicPath.includes(subject)) {
      setAcademicPath([...academicPath, subject]);
    }
    setConfidence(subject, value);
    advance();
  };

  const skipSubject = (subject: string) => {
    if (isTransitioning) return;
    if (academicPath.includes(subject)) {
      setAcademicPath(academicPath.filter((s) => s !== subject));
    }
    setConfidence(subject, "not-applicable");
    advance();
  };

  const addCustomSubject = (value: ConfidenceValue) => {
    const trimmed = draftName.trim();
    if (!trimmed) return;
    if (!academicPath.includes(trimmed)) {
      setAcademicPath([...academicPath, trimmed]);
    }
    setConfidence(trimmed, value);
    setDraftName("");
  };

  const removeCustomSubject = (subject: string) => {
    setAcademicPath(academicPath.filter((s) => s !== subject));
  };

  const finishCustomSubjects = () => {
    if (isTransitioning) return;
    advance();
  };

  const goBackOneCard = () => {
    if (isTransitioning) return;
    setEditingSingleCard(false);
    setCardIndex((i) => Math.max(0, i - 1));
  };

  const editSubject = (subject: string) => {
    const idx = activeSubjectList.indexOf(subject);
    setEditingSingleCard(true);
    setPhase("cards");
    setCardIndex(idx === -1 ? activeSubjectList.length : idx);
  };

  const editOther = () => {
    setEditingSingleCard(true);
    setPhase("cards");
    setCardIndex(activeSubjectList.length);
  };

  const goToSummary = () => {
    setPhase("cards");
    setCardIndex(activeSubjectList.length);
  };

  const continueToNext = () => {
    document.getElementById("academic-path-next-section")?.scrollIntoView({ behavior: shouldReduceMotion ? "auto" : "smooth", block: "start" });
  };

  // Drives both the persistent left nav (desktop) and the compact progress
  // dots (mobile) — same source of truth in every phase, so the left side
  // updates immediately as soon as an answer is picked.
  const navItems: NavItem[] = [
    ...activeSubjectList.map((subject, idx) => {
      const hasAnswer = academicPath.includes(subject) && !!subjectConfidences[subject];
      const status: NavStatus = hasAnswer
        ? "completed"
        : phase === "summary"
          ? "skipped"
          : idx === cardIndex && !isOnCustomCard
            ? "current"
            : idx < cardIndex
              ? "skipped"
              : "upcoming";
      return {
        key: subject,
        label: subject,
        status,
        sublabel:
          status === "completed"
            ? confidenceLabel(subjectConfidences[subject])
            : status === "current"
              ? "You're here"
              : status === "skipped"
                ? "Not taken"
                : undefined,
        onClick: status === "completed" || status === "skipped" ? () => editSubject(subject) : undefined,
      };
    }),
    (() => {
      const status: NavStatus =
        customSubjects.length > 0
          ? "completed"
          : phase === "summary"
            ? "skipped"
            : isOnCustomCard
              ? "current"
              : "upcoming";
      return {
        key: "__other__",
        label: "Other",
        status,
        sublabel:
          status === "completed"
            ? `${customSubjects.length} added`
            : status === "current"
              ? "You're here"
              : status === "skipped"
                ? "None added"
                : undefined,
        onClick: status === "completed" || status === "skipped" ? editOther : undefined,
      };
    })(),
  ];

  const activeLabel = isOnCustomCard ? "Other subjects" : (currentSubject ?? "");

  if (phase === "summary") {
    const answered = [
      ...activeSubjectList.filter((s) => academicPath.includes(s) && subjectConfidences[s]),
      ...customSubjects.filter((s) => subjectConfidences[s]),
    ];

    return (
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <NavPanel navItems={navItems} navTitle={navTitle} navSubtitle={navSubtitle} />

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Complete</span>
            <button
              type="button"
              onClick={goToSummary}
              className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              ← Back
            </button>
          </div>

          <FlashcardShell accent="teal">
            <div className="flex flex-col items-center text-center">
              <div className="mb-3">
                <GlobiculumIconTile tone="teal" size={52}>
                  <GlobiculumChecklistIcon size={28} />
                </GlobiculumIconTile>
              </div>
              <h3 className="text-lg font-bold text-foreground">{summaryTitle}</h3>
            </div>

            {answered.length > 0 ? (
              <div className="mt-5 divide-y divide-border overflow-hidden rounded-xl border border-border">
                {answered.map((subject) => (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => editSubject(subject)}
                    className="flex w-full items-center justify-between gap-3 bg-background px-4 py-3 text-left transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Check className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
                      {subject}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">{confidenceLabel(subjectConfidences[subject])}</span>
                      <img src={editIcon} className="h-3.5 w-3.5 shrink-0 object-contain" alt="" aria-hidden="true" draggable={false} />
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-3 text-center text-xs text-muted-foreground">
                No subjects added yet.
              </p>
            )}

            <p className="mt-3 text-center text-xs text-muted-foreground">
              {answered.length} of {answered.length} complete
            </p>

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

          <FieldError message={error} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <NavPanel navItems={navItems} navTitle={navTitle} navSubtitle={navSubtitle} />

      <div className="min-w-0 flex-1 space-y-3">
        <MobileProgress navItems={navItems} activeLabel={activeLabel} position={position} total={totalCards} />
        <FieldError message={error} />

        <AnimatePresence mode="wait">
          {isOnCustomCard ? (
            <motion.div
              key="custom"
              initial={shouldReduceMotion ? undefined : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, x: -24 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <FlashcardShell accent="teal">
              <div className="flex flex-col items-center text-center">
                <div className="mb-3">
                  <GlobiculumIconTile tone="teal" size={64}>
                    <Plus size={30} aria-hidden="true" />
                  </GlobiculumIconTile>
                </div>
                <h4 className="text-xl font-bold text-foreground">{customCardTitle}</h4>
                <p className="mt-1 text-xs text-muted-foreground">{customCardSubtitle}</p>
              </div>

              {customSubjects.length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {customSubjects.map((subject) => (
                    <span
                      key={subject}
                      className="inline-flex items-center gap-1.5 rounded-full border-2 border-secondary bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary"
                    >
                      {subject} · {confidenceLabel(subjectConfidences[subject])}
                      <button
                        type="button"
                        onClick={() => removeCustomSubject(subject)}
                        aria-label={`Remove ${subject}`}
                        className="rounded-full p-0.5 hover:bg-secondary/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <Input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="e.g. Robotics, Design Thinking"
                className="mt-4"
                aria-label="Other subject name"
              />

              <p className="mb-2 mt-4 text-center text-xs font-medium text-muted-foreground">{customCardQuestion}</p>
              <div role="radiogroup" aria-label="New subject confidence" className="flex flex-col gap-2 sm:flex-row">
                {CONFIDENCE_LEVELS.map((level) => (
                  <ConfidenceButton
                    key={level.value}
                    level={level}
                    microcopy={resolvedMicrocopy[level.value]}
                    selected={false}
                    disabled={!draftName.trim()}
                    onSelect={() => addCustomSubject(level.value)}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={finishCustomSubjects}
                className="mt-4 block w-full text-center text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                I&rsquo;m done adding subjects →
              </button>
              </FlashcardShell>
            </motion.div>
          ) : (
            currentSubject && (
              <motion.div
                key={currentSubject}
                initial={shouldReduceMotion ? undefined : { opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, x: -24 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <FlashcardShell accent="teal">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-3">
                    <GlobiculumIconTile tone="teal" size={64}>
                      {(() => {
                        const SubjectIcon = getSubjectIcon(currentSubject);
                        return <SubjectIcon size={30} aria-hidden="true" />;
                      })()}
                    </GlobiculumIconTile>
                  </div>
                  <h4 className="text-xl font-bold text-foreground">{currentSubject}</h4>
                  {confidenceHint && <p className="mt-1 text-[11px] text-muted-foreground/70">{confidenceHint}</p>}
                </div>

                <div role="radiogroup" aria-label={`${currentSubject} confidence`} className="mt-5 flex flex-col gap-2 sm:flex-row">
                  {MAIN_CONFIDENCE_LEVELS.map((level) => (
                    <ConfidenceButton
                      key={level.value}
                      level={level}
                      microcopy={resolvedMicrocopy[level.value]}
                      selected={currentSubjectSelected === level.value}
                      disabled={isTransitioning}
                      onSelect={() => (level.value === "not-applicable" ? skipSubject(currentSubject) : selectConfidence(currentSubject, level.value))}
                    />
                  ))}
                </div>
                </FlashcardShell>
              </motion.div>
            )
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={goBackOneCard}
            disabled={cardIndex === 0}
            className={cn(
              "flex items-center gap-1 text-xs font-medium",
              cardIndex === 0 ? "invisible" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <img src={backIcon} className="h-3.5 w-3.5 object-contain" alt="" aria-hidden="true" draggable={false} /> Back
          </button>
          <span className="text-xs font-medium text-muted-foreground lg:hidden">
            {position} of {totalCards}
          </span>
          <span className="w-10" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
};

export default AcademicPathFlashcards;
