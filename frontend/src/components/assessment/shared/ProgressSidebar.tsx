import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssessmentStepperStep } from "./AssessmentStepper";

interface ProgressSidebarProps {
  steps: AssessmentStepperStep[];
  currentIndex: number; // 0-indexed
  /** Optional persona mascot/illustration slot next to "Your Progress" — unused by default. */
  avatar?: ReactNode;
}

const WHAT_YOU_GET = [
  "Curriculum Gap Report",
  "Subject-wise Readiness",
  "Personalized Learning Roadmap",
  "AI-Powered Recommendations",
  "Downloadable PDF Report",
];

// Presentational only — the step list is a status display, not a navigation
// shortcut, so the only way to move between steps is still Previous/Continue.
const ProgressSidebar = ({ steps, currentIndex, avatar }: ProgressSidebarProps) => {
  const total = steps.length;
  const percent = Math.round(((currentIndex + 1) / total) * 100);

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="space-y-4">
      <motion.div
        className="rounded-2xl border border-border bg-card p-6 shadow-soft"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className="mb-4 flex items-center gap-3">
          {avatar}
          <h3 className="text-sm font-semibold text-foreground">Your Progress</h3>
        </div>

        <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
          <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
            <circle cx="50" cy="50" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <motion.circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="url(#sidebar-progress-gradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            />
            <defs>
              <linearGradient id="sidebar-progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--secondary))" />
                <stop offset="100%" stopColor="hsl(var(--violet))" />
              </linearGradient>
            </defs>
          </svg>
          <motion.span
            key={percent}
            className="absolute text-xl font-bold text-foreground"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {percent}%
          </motion.span>
        </div>

        <p className="mt-3 text-center text-sm text-muted-foreground">
          Step {currentIndex + 1} of {total}
        </p>

        <ul className="mt-5 space-y-2.5 border-t border-border pt-4">
          {steps.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            return (
              <li key={step.id} className="flex items-center gap-2.5 text-sm">
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors duration-300",
                    isCompleted && "bg-secondary text-secondary-foreground",
                    isCurrent && "bg-gradient-cta text-white",
                    !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <motion.span initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 500, damping: 20 }}>
                      <Check className="h-3 w-3" />
                    </motion.span>
                  ) : (
                    index + 1
                  )}
                </span>
                <span className={cn(isCurrent ? "font-semibold text-foreground" : "text-muted-foreground")}>
                  {step.title}
                </span>
              </li>
            );
          })}
        </ul>
      </motion.div>

      <motion.div
        className="rounded-2xl border border-border bg-card p-6 shadow-soft"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08, ease: "easeOut" }}
      >
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          What <span className="text-secondary">You'll Get</span>
        </h3>
        <ul className="space-y-2.5">
          {WHAT_YOU_GET.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" />
              {item}
            </li>
          ))}
        </ul>
      </motion.div>

      <motion.div
        className="flex items-center gap-2 rounded-2xl border border-border bg-mint/10 p-4 text-xs text-muted-foreground"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.16, ease: "easeOut" }}
      >
        <Lock className="h-4 w-4 shrink-0 text-secondary" />
        Your information is encrypted and used only to personalize your assessment.
      </motion.div>
    </div>
  );
};

export default ProgressSidebar;
