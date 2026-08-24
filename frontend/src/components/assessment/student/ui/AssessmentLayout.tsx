import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import AssessmentFooter from "../../shared/AssessmentFooter";
import type { AssessmentStepperStep as StepperStep } from "../../shared/AssessmentStepper";
import StepCelebrationToast from "./StepCelebrationToast";
import backIcon from "@/assets/icons-3d/back.png";

// Sprint 1.1/1.2: Student-only chrome, forked from the shared
// AssessmentHeader/AssessmentStepper/ProgressSidebar/AssessmentContainer/
// AssessmentBackground so Parent Assessment's chrome is unaffected — Parent
// still renders the original shared components unchanged. AssessmentFooter
// stays shared since it didn't need to change.

// Two static, very-low-opacity glows — calmer than the shared
// AssessmentBackground (which drifts 3 orbs + 5 floating icons + grain);
// this sprint's goal is "less UI," so no motion, no icons, no grain here.
const SubtlePageGlow = () => (
  <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
    <div className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-mint/10 blur-3xl" />
    <div className="absolute -bottom-32 -right-32 h-[420px] w-[420px] rounded-full bg-violet/10 blur-3xl" />
  </div>
);

// Short labels for the compact stepper — presentational only, keyed off the
// existing step `id`s from StudentAssessmentController.tsx (not modified
// here); the step objects' own `.title` (used elsewhere, e.g. document
// titles) is untouched.
const SHORT_STEP_LABELS: Record<string, string> = {
  profile: "Profile",
  academic: "Academic",
  wrapup: "Wrap-up",
  review: "Review",
};

const ChangePersonaLink = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
  >
    <img src={backIcon} className="h-3.5 w-3.5 object-contain" alt="" aria-hidden="true" draggable={false} />
    Change persona
  </button>
);

const StudentAssessmentHeader = ({ onChangePersona, title, subtitle }: { onChangePersona: () => void; title: string; subtitle: string }) => (
  <div className="min-w-0 flex-1">
    <ChangePersonaLink onClick={onChangePersona} />
    <motion.h1
      key={title}
      className="text-h2 mt-3 text-foreground"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {title}
    </motion.h1>
    <p className="font-body mt-1.5 text-body text-muted-foreground">{subtitle}</p>
  </div>
);

// "Your Process" — a bordered card of its own, sitting beside the header,
// with checkmark nodes joined by dotted connector lines: reached steps
// (current + completed) get a filled teal node, upcoming stays a plain
// outline. Purely a status display, not interactive/clickable, and still
// the only progress indicator in the layout (no separate sidebar/donut).
const StudentAssessmentStepper = ({ steps, currentIndex }: { steps: StepperStep[]; currentIndex: number }) => {
  const percent = Math.round(((currentIndex + 1) / steps.length) * 100);
  return (
    <div className="relative w-full shrink-0 overflow-hidden rounded-2xl border border-secondary/20 bg-card px-6 py-5 shadow-soft sm:w-[420px] lg:w-[480px]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-secondary/[0.08] blur-2xl"
      />
      <div className="relative mb-4 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[1.5px] text-muted-foreground">Your Process</p>
        <span className="flex items-baseline gap-0.5 tabular-nums">
          <span className="text-2xl font-extrabold leading-none text-secondary">{percent}</span>
          <span className="text-xs font-bold text-secondary">%</span>
        </span>
      </div>

      <div className="relative mb-4 flex gap-1.5">
        {steps.map((step, index) => (
          <div key={step.id} className="h-2 flex-1 overflow-hidden rounded-full bg-border">
            <div
              className={cn(
                "h-full rounded-full bg-gradient-to-r from-secondary to-mint transition-all duration-500 ease-out",
                index <= currentIndex ? "w-full" : "w-0"
              )}
            />
          </div>
        ))}
      </div>

      <ol className="relative flex items-start justify-between" aria-label="Assessment progress">
        {steps.map((step, index) => {
          const isReached = index <= currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <li key={step.id} className="flex flex-col items-center gap-1.5">
              <span
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-200",
                  isCurrent
                    ? "bg-secondary text-secondary-foreground ring-4 ring-secondary/20"
                    : isReached
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {isReached && !isCurrent ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : index + 1}
              </span>
              <span
                className={cn(
                  "text-center text-[11px] leading-tight",
                  isCurrent ? "font-bold text-primary" : isReached ? "font-medium text-secondary" : "text-muted-foreground"
                )}
              >
                {SHORT_STEP_LABELS[step.id] ?? step.title}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

interface AssessmentLayoutProps {
  onChangePersona: () => void;
  steps: StepperStep[];
  currentIndex: number;
  onBack: () => void;
  onNext: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  children: ReactNode;
}

// Composes the chrome around whichever step is currently active. The step
// itself (passed as `children`) owns all of its own fields/state/validation —
// this component only arranges header, stepper and bottom nav inside a
// centered, paper-like "canvas" (Sprint 1.2 — an A4-worksheet-inspired
// object rather than content stretched across the viewport).
const AssessmentLayout = ({
  onChangePersona,
  steps,
  currentIndex,
  onBack,
  onNext,
  isFirstStep,
  isLastStep,
  children,
}: AssessmentLayoutProps) => (
  <div className="relative">
    <SubtlePageGlow />
    <div className="mx-auto max-w-[1180px] rounded-[20px] border border-border bg-card px-6 py-8 shadow-soft sm:px-10 sm:py-12">
      <StepCelebrationToast stepIndex={currentIndex} />
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <StudentAssessmentHeader
          onChangePersona={onChangePersona}
          title="Student Assessment"
          subtitle="Answer a few questions to generate your personalized readiness report."
        />
        <StudentAssessmentStepper steps={steps} currentIndex={currentIndex} />
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={steps[currentIndex]?.id}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
      {/* Hidden on the Review step (isLastStep) — StudentReviewStep supplies its
          own sticky ReviewActionBar instead, mirroring Parent's equivalent gate. */}
      {!isLastStep && <AssessmentFooter onPrev={onBack} onNext={onNext} isFirstStep={isFirstStep} canProceed />}
    </div>
  </div>
);

export default AssessmentLayout;
