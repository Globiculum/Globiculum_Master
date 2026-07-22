import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssessmentStepperStep } from "./AssessmentStepper";

interface ProgressSidebarProps {
  steps: AssessmentStepperStep[];
  currentStep: number; // 0-indexed
}

const WHAT_YOU_GET = ["Curriculum Gap Report", "Personalized Roadmap", "AI Recommendations", "Downloadable PDF"];

// Presentational only — the step list is a status display, not a navigation
// shortcut, so the only way to move between steps is still Previous/Continue.
const ProgressSidebar = ({ steps, currentStep }: ProgressSidebarProps) => {
  const total = steps.length;
  const percent = Math.round(((currentStep + 1) / total) * 100);

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Your Progress</h3>

        <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
          <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
            <circle cx="50" cy="50" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="url(#parent-sidebar-progress-gradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 0.5s ease" }}
            />
            <defs>
              <linearGradient id="parent-sidebar-progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--secondary))" />
                <stop offset="100%" stopColor="hsl(var(--violet))" />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute text-xl font-bold text-foreground">{percent}%</span>
        </div>

        <p className="mt-3 text-center text-sm text-muted-foreground">
          Step {currentStep + 1} of {total}
        </p>

        <ul className="mt-5 space-y-2.5 border-t border-border pt-4">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            return (
              <li key={step.title} className="flex items-center gap-2.5 text-sm">
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                    isCompleted && "bg-secondary text-secondary-foreground",
                    isCurrent && "bg-gradient-cta text-white",
                    !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                <span className={cn(isCurrent ? "font-semibold text-foreground" : "text-muted-foreground")}>
                  {step.title}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          What <span className="text-secondary">you'll get</span>
        </h3>
        <ul className="space-y-2.5">
          {WHAT_YOU_GET.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center gap-2 rounded-2xl border border-border bg-mint/10 p-4 text-xs text-muted-foreground">
        <Lock className="h-4 w-4 shrink-0 text-secondary" />
        Your child's information is encrypted and securely processed.
      </div>
    </div>
  );
};

export default ProgressSidebar;
