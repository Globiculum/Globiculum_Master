import { useLayoutEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, TrendingUp } from "lucide-react";
import editIcon from "@/assets/icons-3d/edit.png";
import backIcon from "@/assets/icons-3d/back.png";
import { cn } from "@/lib/utils";
import { GlobiculumChecklistIcon, GlobiculumCurriculumIcon, GlobiculumGradeIcon, GlobiculumIconTile, GlobiculumStudentIcon, GlobiculumSuccessIcon } from "@/components/icons";
import InputCard from "../shared/InputCard";
import FieldError from "../shared/FieldError";
import FlashcardShell from "../shared/FlashcardShell";
import { LearningStyleObservations, learningStyleOptions } from "../LearningStyleObservations";
import type { ParentFormData } from "./parentMapper";

// Phase D: Parent Learning Profile as a flashcard/iterative sequence — same
// interaction language as ParentSchoolProfileWizard.tsx (CardFrame, navy
// CTA, GlobiculumIconTile badges, summary/edit phase), but simpler (4 cards,
// one flat nav list, no conditional branching). Per the user's explicit
// instruction, every question's wording is reused verbatim from the
// original ParentStep3.tsx (labels/tooltips) — only the presentation
// changed. "How does your child learn best?" and "Strengthen for Indian
// Schooling" are genuinely multi-select, so — matching the lesson from the
// Language Exposure redesign — they do NOT auto-advance per click; each has
// its own explicit "Next" button instead.

const PREVIOUS_GRADES_OPTIONS = [
  { value: "excellent", label: "Excellent (A/90%+)" },
  { value: "good", label: "Good (B+/80-89%)" },
  { value: "average", label: "Average (B/70-79%)" },
  { value: "below-average", label: "Below Average (C+/60-69%)" },
  { value: "struggling", label: "Struggling (<60%)" },
];

const OVERALL_PERFORMANCE_OPTIONS = [
  { value: "excelling", label: "Excelling" },
  { value: "above-average", label: "Above Average" },
  { value: "on-track", label: "On Track" },
  { value: "needs-support", label: "Needs Support" },
];

// Verbatim from ParentStep3.tsx's boardSubjects() — same target-goal-based
// subject list, same trailing skills, same de-duplication.
const buildBoardSubjects = (targetGoal: string): string[] => {
  const goal = targetGoal?.toLowerCase() || "";
  let subjects: string[];

  if (goal.includes("icse") || goal.includes("isc")) {
    subjects = ["Mathematics", "Physics / Chemistry / Biology", "English", "Second Language (Hindi / Regional)", "History / Civics / Geography"];
  } else if (goal === "ib" || goal.includes("international")) {
    subjects = ["Mathematics", "Sciences", "Language and Literature", "Language Acquisition", "Individuals and Societies"];
  } else if (goal.includes("igcse") || goal.includes("cambridge")) {
    subjects = ["Mathematics", "Coordinated Science / Separate Sciences", "English Language", "Humanities / Global Perspectives", "Foreign Language"];
  } else {
    subjects = ["Mathematics", "Science", "English", "Hindi / Second Language", "Social Science"];
  }

  return [...subjects, "Exam Writing", "Revision Methods", "NCERT Practice", "Study habits for Indian curriculum"].filter((v, i, a) => a.indexOf(v) === i);
};

const SKILL_LABELS = new Set(["Exam Writing", "Revision Methods", "NCERT Practice"]);

type CardId = "learningStyles" | "previousGrades" | "overallPerformance" | "strengthenGoals";
const ORDER: CardId[] = ["learningStyles", "previousGrades", "overallPerformance", "strengthenGoals"];

const ADVANCE_DELAY_MS = 420;

interface ParentLearningProfileWizardProps {
  formData: ParentFormData;
  onFieldChange: <K extends keyof ParentFormData>(field: K, value: ParentFormData[K]) => void;
  onArrayToggle: (field: keyof ParentFormData, value: string) => void;
  fieldErrors: Record<string, string>;
}

const isCardAnswered = (id: CardId, formData: ParentFormData): boolean => {
  switch (id) {
    case "learningStyles":
      return formData.learningStyles.length > 0;
    case "previousGrades":
      return !!formData.previousGrades;
    case "overallPerformance":
      return !!formData.overallPerformance;
    case "strengthenGoals":
      return formData.strengthenGoals.length > 0;
  }
};

const cardErrorField = (id: CardId): keyof ParentFormData | null =>
  id === "previousGrades" ? null : (id as keyof ParentFormData);

const ParentLearningProfileWizard = ({ formData, onFieldChange, onArrayToggle, fieldErrors }: ParentLearningProfileWizardProps) => {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const boardSubjects = buildBoardSubjects(formData.targetGoal);

  const hasExistingAnswers = ORDER.some((id) => isCardAnswered(id, formData));
  const firstUnansweredId = (): CardId => ORDER.find((id) => !isCardAnswered(id, formData)) ?? "strengthenGoals";

  const [phase, setPhase] = useState<"cards" | "summary">(hasExistingAnswers ? "summary" : "cards");
  const [currentId, setCurrentId] = useState<CardId>(firstUnansweredId());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [editingSingleCard, setEditingSingleCard] = useState(false);

  const currentIndex = ORDER.indexOf(currentId);
  const total = ORDER.length;
  const position = currentIndex + 1;

  useLayoutEffect(() => {
    const firstInvalidId = ORDER.find((id) => {
      const field = cardErrorField(id);
      return field && fieldErrors[field as string];
    });
    if (!firstInvalidId) return;
    if (phase === "cards" && currentId === firstInvalidId) return;
    setEditingSingleCard(false);
    setPhase("cards");
    setCurrentId(firstInvalidId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldErrors]);

  const advance = () => {
    setIsTransitioning(true);
    window.setTimeout(
      () => {
        setIsTransitioning(false);
        const nextId = ORDER[currentIndex + 1];
        if (!nextId || editingSingleCard) {
          setEditingSingleCard(false);
          setPhase("summary");
        } else {
          setCurrentId(nextId);
        }
      },
      shouldReduceMotion ? 0 : ADVANCE_DELAY_MS
    );
  };

  const selectSingle = (field: keyof ParentFormData, value: string) => {
    if (isTransitioning) return;
    onFieldChange(field, value as ParentFormData[typeof field]);
    advance();
  };

  const goBack = () => {
    if (isTransitioning || currentIndex === 0) return;
    setEditingSingleCard(false);
    setCurrentId(ORDER[currentIndex - 1]);
  };

  const editCard = (id: CardId) => {
    setEditingSingleCard(true);
    setPhase("cards");
    setCurrentId(id);
  };

  const navItems = ORDER.map((id, idx) => {
    const answered = isCardAnswered(id, formData);
    const status = answered ? "completed" : phase === "summary" ? "skipped" : idx === currentIndex ? "current" : idx < currentIndex ? "skipped" : "upcoming";
    const label = { learningStyles: "Learning style", previousGrades: "Grade range", overallPerformance: "Performance", strengthenGoals: "Strengthen goals" }[id];
    return { id, label, status, onClick: status === "completed" || status === "skipped" ? () => editCard(id) : undefined };
  });

  if (phase === "summary") {
    const learningStyleLabels = formData.learningStyles.map((id) => learningStyleOptions.find((o) => o.id === id)?.label ?? id);
    const gradeLabel = PREVIOUS_GRADES_OPTIONS.find((o) => o.value === formData.previousGrades)?.label;
    const performanceLabel = OVERALL_PERFORMANCE_OPTIONS.find((o) => o.value === formData.overallPerformance)?.label;

    const sections = [
      { key: "learningStyles", icon: GlobiculumStudentIcon, tone: "violet" as const, label: "Learning Style", value: learningStyleLabels.length > 0 ? learningStyleLabels.join(", ") : undefined, editId: "learningStyles" as CardId },
      { key: "previousGrades", icon: GlobiculumGradeIcon, tone: "violet" as const, label: "Typical Grade Range", value: gradeLabel, editId: "previousGrades" as CardId },
      { key: "overallPerformance", icon: GlobiculumSuccessIcon, tone: "teal" as const, label: "Overall Performance", value: performanceLabel, editId: "overallPerformance" as CardId },
      { key: "strengthenGoals", icon: GlobiculumCurriculumIcon, tone: "violet" as const, label: "Strengthen Goals", value: formData.strengthenGoals.length > 0 ? formData.strengthenGoals.join(", ") : undefined, editId: "strengthenGoals" as CardId },
    ];
    const answeredCount = sections.filter((s) => s.value).length;

    return (
      <FlashcardShell accent="teal">
        <div className="flex flex-col items-center text-center">
          <div className="mb-3">
            <GlobiculumIconTile tone="teal" size={52}>
              <GlobiculumChecklistIcon size={28} />
            </GlobiculumIconTile>
          </div>
          <h3 className="text-lg font-bold text-foreground">Learning Profile is ready.</h3>
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
                onClick={() => editCard(section.editId)}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-left transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <GlobiculumIconTile tone={section.tone} size={36} accent={false}>
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
      </FlashcardShell>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5" role="img" aria-label={`Progress: ${position} of ${total}`}>
        {navItems.map((item) => (
          <span
            key={item.id}
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
      <p className="text-xs font-medium text-muted-foreground">
        {position} of {total} · Learning Profile
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentId}
          initial={shouldReduceMotion ? undefined : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={shouldReduceMotion ? undefined : { opacity: 0, x: -24 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          <FlashcardShell accent="teal">
          {currentId === "learningStyles" && (
            <>
              <div className="relative flex flex-col items-center text-center">
                <div className="mb-4">
                  <GlobiculumIconTile tone="violet" size={72}>
                    <GlobiculumStudentIcon size={40} />
                  </GlobiculumIconTile>
                </div>
                <h4 className="text-xl font-bold text-foreground">How does your child learn best?</h4>
                <p className="mt-1.5 text-sm text-muted-foreground">Understanding your child's learning style helps us tailor recommendations in the report.</p>
              </div>
              <div className="relative mt-6">
                <LearningStyleObservations selectedStyles={formData.learningStyles} onToggle={(styleId) => onArrayToggle("learningStyles", styleId)} />
              </div>
              <FieldError message={fieldErrors.learningStyles} />
              <div className="relative mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={advance}
                  disabled={formData.learningStyles.length === 0}
                  className="group inline-flex items-center gap-2 rounded-full bg-secondary py-2.5 pl-5 pr-2 text-sm font-semibold text-secondary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                >
                  Next
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 transition-transform duration-200 group-hover:translate-x-0.5">
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </button>
              </div>
            </>
          )}

          {currentId === "previousGrades" && (
            <>
              <div className="relative flex flex-col items-center text-center">
                <div className="mb-4">
                  <GlobiculumIconTile tone="violet" size={72}>
                    <GlobiculumGradeIcon size={40} />
                  </GlobiculumIconTile>
                </div>
                <h4 className="text-xl font-bold text-foreground">Typical Grade Range</h4>
                <p className="mt-1.5 text-sm text-muted-foreground">Your child's typical academic performance range at their current school.</p>
              </div>
              <div role="radiogroup" aria-label="Typical Grade Range" className="relative mt-6 flex flex-wrap justify-center gap-2">
                {PREVIOUS_GRADES_OPTIONS.map((opt) => (
                  <InputCard
                    key={opt.value}
                    variant="chip"
                    mode="radio"
                    label={opt.label}
                    selected={formData.previousGrades === opt.value}
                    onClick={() => selectSingle("previousGrades", opt.value)}
                  />
                ))}
              </div>
            </>
          )}

          {currentId === "overallPerformance" && (
            <>
              <div className="relative flex flex-col items-center text-center">
                <div className="mb-4">
                  <GlobiculumIconTile tone="teal" size={72}>
                    <GlobiculumSuccessIcon size={40} />
                  </GlobiculumIconTile>
                </div>
                <h4 className="text-xl font-bold text-foreground">Overall Performance</h4>
                <p className="mt-1.5 text-sm text-muted-foreground">A general sense of how your child is performing academically overall.</p>
              </div>
              <div role="radiogroup" aria-label="Overall Performance" className="relative mt-6 flex flex-wrap justify-center gap-2">
                {OVERALL_PERFORMANCE_OPTIONS.map((opt) => (
                  <InputCard
                    key={opt.value}
                    variant="chip"
                    mode="radio"
                    label={opt.label}
                    selected={formData.overallPerformance === opt.value}
                    onClick={() => selectSingle("overallPerformance", opt.value)}
                  />
                ))}
              </div>
              <FieldError message={fieldErrors.overallPerformance} />
            </>
          )}

          {currentId === "strengthenGoals" && (
            <>
              <div className="relative flex flex-col items-center text-center">
                <div className="mb-4">
                  <GlobiculumIconTile tone="violet" size={72}>
                    <GlobiculumCurriculumIcon size={40} />
                  </GlobiculumIconTile>
                </div>
                <h4 className="text-xl font-bold text-foreground">Strengthen for Indian Schooling</h4>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Which subjects would you most like the student to strengthen? Select all that apply — helps identify priority transition goals.
                </p>
              </div>
              <div role="group" aria-label="Subjects to strengthen" className="relative mt-6 flex flex-wrap justify-center gap-2">
                {boardSubjects.map((goal) => (
                  <InputCard
                    key={goal}
                    variant="chip"
                    selected={formData.strengthenGoals.includes(goal)}
                    onClick={() => onArrayToggle("strengthenGoals", goal)}
                    label={
                      SKILL_LABELS.has(goal) ? (
                        <span className="inline-flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {goal}
                        </span>
                      ) : (
                        goal
                      )
                    }
                  />
                ))}
              </div>
              <FieldError message={fieldErrors.strengthenGoals} />
              <p className="relative mt-4 text-center text-xs font-medium text-muted-foreground">
                {formData.strengthenGoals.length} selected
              </p>
              <div className="relative mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={advance}
                  disabled={formData.strengthenGoals.length === 0}
                  className="group inline-flex items-center gap-2 rounded-full bg-secondary py-2.5 pl-5 pr-2 text-sm font-semibold text-secondary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                >
                  Next
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 transition-transform duration-200 group-hover:translate-x-0.5">
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </button>
              </div>
            </>
          )}
          </FlashcardShell>
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={goBack}
          disabled={currentIndex === 0}
          className={cn("flex items-center gap-1 text-xs font-medium", currentIndex === 0 ? "invisible" : "text-muted-foreground hover:text-foreground")}
        >
          <img src={backIcon} className="h-3.5 w-3.5 object-contain" alt="" aria-hidden="true" draggable={false} /> Back
        </button>
        <span className="text-xs font-medium text-muted-foreground">
          {position} of {total}
        </span>
        <span className="w-10" aria-hidden="true" />
      </div>
    </div>
  );
};

export default ParentLearningProfileWizard;
