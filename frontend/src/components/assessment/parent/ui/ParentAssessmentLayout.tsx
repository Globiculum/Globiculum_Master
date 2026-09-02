import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import AssessmentFooter from "../../shared/AssessmentFooter";
import type { AssessmentStepperStep as StepperStep } from "../../shared/AssessmentStepper";
import backIcon from "@/assets/icons-3d/back.png";

// Parent-only chrome, forked from the shared AssessmentHeader/
// AssessmentStepper/ProgressSidebar/AssessmentContainer/AssessmentBackground
// — mirrors student/ui/AssessmentLayout.tsx exactly (same "Your Progress"
// removal, same compact stepper, same A4-style canvas) so Parent and
// Student read as one product. The shared chrome files themselves stay
// untouched — nothing else references this file.

const SubtlePageGlow = () => (
  <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
    <div className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-mint/10 blur-3xl" />
    <div className="absolute -bottom-32 -right-32 h-[420px] w-[420px] rounded-full bg-violet/10 blur-3xl" />
  </div>
);

// Short labels for the compact stepper — presentational only, keyed off
// ParentAssessment.tsx's own STEPPER_STEPS ids (not modified here).
const SHORT_STEP_LABELS: Record<string, string> = {
  "school-profile": "School",
  "academic-path": "Academic",
  "learning-profile": "Learning",
  support: "Support",
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

const RetakeBar = ({ onSkipToReview }: { onSkipToReview: () => void }) => (
  <div className="mb-4 flex items-center justify-between rounded-xl border border-secondary/25 bg-secondary/5 px-4 py-2.5">
    <div className="flex items-center gap-2 text-sm">
      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground">↺</span>
      <span className="text-muted-foreground">
        <span className="font-semibold text-foreground">Retake mode</span> — your previous answers are pre-filled. Edit what you need, then regenerate.
      </span>
    </div>
    <button
      type="button"
      onClick={onSkipToReview}
      className="ml-4 shrink-0 text-sm font-semibold text-secondary transition-colors hover:text-secondary/80"
    >
      Back to Review →
    </button>
  </div>
);

const ParentAssessmentHeader = ({
  onChangePersona,
  showChangePersona,
  title,
  subtitle,
}: {
  onChangePersona: () => void;
  showChangePersona: boolean;
  title: string;
  subtitle: string;
}) => (
  <div className="min-w-0 flex-1">
    {showChangePersona ? <ChangePersonaLink onClick={onChangePersona} /> : <span />}
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
const ParentAssessmentStepper = ({ steps, currentIndex }: { steps: StepperStep[]; currentIndex: number }) => {
  const percent = Math.round(((currentIndex + 1) / steps.length) * 100);
  return (
    <div className="relative shrink-0 overflow-hidden rounded-2xl border border-secondary/15 bg-card px-5 py-4 shadow-soft sm:w-[320px]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-secondary/[0.07] blur-2xl"
      />
      <div className="relative mb-3 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[1.5px] text-muted-foreground">Your Process</p>
        <span className="flex items-baseline gap-0.5 tabular-nums">
          <span className="text-lg font-extrabold leading-none text-secondary">{percent}</span>
          <span className="text-[11px] font-bold text-secondary">%</span>
        </span>
      </div>

      <div className="relative mb-3 flex gap-1">
        {steps.map((step, index) => (
          <div key={step.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
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
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-200",
                  isCurrent
                    ? "bg-secondary text-secondary-foreground ring-4 ring-secondary/20"
                    : isReached
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {isReached && !isCurrent ? <Check className="h-3 w-3" aria-hidden="true" /> : index + 1}
              </span>
              <span
                className={cn(
                  "text-center text-[10px] leading-tight",
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

interface ParentAssessmentLayoutProps {
  onChangePersona: () => void;
  showChangePersona?: boolean;
  steps: StepperStep[];
  currentIndex: number;
  onBack: () => void;
  onNext: () => void;
  saveStatus?: "idle" | "saving" | "saved";
  isFirstStep: boolean;
  isLastStep: boolean;
  /** True when the user arrived from the Reports History "Retake" button. */
  isRetake?: boolean;
  /** When set (retake + not on last step), a "Back to Review" shortcut appears. */
  onSkipToReview?: () => void;
  children: ReactNode;
}

const ParentAssessmentLayout = ({
  onChangePersona,
  showChangePersona = true,
  steps,
  currentIndex,
  onBack,
  onNext,
  saveStatus,
  isFirstStep,
  isLastStep,
  isRetake = false,
  onSkipToReview,
  children,
}: ParentAssessmentLayoutProps) => (
  <div className="relative">
    <SubtlePageGlow />
    <div className="mx-auto max-w-[1180px] rounded-[20px] border border-border bg-card px-6 py-8 shadow-soft sm:px-10 sm:py-12">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <ParentAssessmentHeader
          onChangePersona={onChangePersona}
          showChangePersona={showChangePersona}
          title={isRetake ? "Update & Retake" : "Parent Assessment"}
          subtitle={
            isRetake
              ? "Your previous answers are pre-filled — change what you need, then regenerate the report."
              : "Answer a few questions to generate your child's personalized curriculum transition report."
          }
        />
        <ParentAssessmentStepper steps={steps} currentIndex={currentIndex} />
      </div>
      {/* Retake banner with "Back to Review" shortcut — only on non-review steps */}
      {isRetake && !isLastStep && onSkipToReview && <RetakeBar onSkipToReview={onSkipToReview} />}
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
      {/* Hidden on the Review step (isLastStep) — ParentStep5 supplies its own
          sticky ReviewActionBar instead, mirroring Student's equivalent gate. */}
      {!isLastStep && <AssessmentFooter onPrev={onBack} onNext={onNext} saveStatus={saveStatus} isFirstStep={isFirstStep} canProceed />}
    </div>
  </div>
);

export default ParentAssessmentLayout;
