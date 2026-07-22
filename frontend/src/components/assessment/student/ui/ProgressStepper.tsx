import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepperStep {
  id: string;
  title: string;
  icon: LucideIcon;
}

interface ProgressStepperProps {
  steps: StepperStep[];
  currentIndex: number;
}

// Purely presentational status display — not interactive/clickable, so step
// navigation still flows exclusively through Back/Continue as before.
const ProgressStepper = ({ steps, currentIndex }: ProgressStepperProps) => {
  const percent = ((currentIndex + 1) / steps.length) * 100;

  return (
    <div className="mb-8">
      {/* Compact bar for small screens */}
      <div className="mb-2 md:hidden">
        <p className="text-sm font-semibold text-secondary">
          Step {currentIndex + 1} of {steps.length}: {steps[currentIndex]?.title}
        </p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-gradient-cta"
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>

      {/* Full stepper for md+ */}
      <ol className="hidden items-start md:flex" aria-label="Assessment progress">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <li key={step.id} className={cn("flex items-center", index !== steps.length - 1 && "flex-1")}>
              <div className="flex flex-col items-center gap-2">
                <motion.div
                  aria-current={isCurrent ? "step" : undefined}
                  animate={{ scale: isCurrent ? 1.08 : 1 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-full border-2 transition-colors duration-300 ease-smooth",
                    isCompleted && "border-secondary bg-secondary text-secondary-foreground",
                    isCurrent && "border-violet bg-gradient-cta text-white shadow-glow-sm",
                    !isCompleted && !isCurrent && "border-border bg-card text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 22 }}>
                      <Check className="h-5 w-5" />
                    </motion.span>
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </motion.div>
                <span
                  className={cn(
                    "max-w-[92px] text-center text-xs font-medium",
                    isCurrent ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.title}
                </span>
              </div>

              {index !== steps.length - 1 && (
                <div className="mx-2 mb-6 h-0.5 flex-1 overflow-hidden rounded bg-border">
                  <motion.div
                    className="h-full bg-secondary"
                    animate={{ width: isCompleted ? "100%" : "0%" }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default ProgressStepper;
