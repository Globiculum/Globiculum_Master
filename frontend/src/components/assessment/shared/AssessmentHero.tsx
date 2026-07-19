import type { ReactNode } from "react";
import { ArrowLeft, GraduationCap, Sparkles, Users } from "lucide-react";

// Presentational hero for the Parent assessment. Copy/conditional logic
// (retake vs. new, grade-restriction notice) stays owned by the caller
// (BeginJourney.tsx) — this component only arranges the visuals.

interface AssessmentHeroProps {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  notice?: ReactNode;
  showChangePersona?: boolean;
  onChangePersona?: () => void;
}

const AssessmentHero = ({ eyebrow, title, subtitle, notice, showChangePersona, onChangePersona }: AssessmentHeroProps) => {
  return (
    <div className="relative mx-auto mb-12 max-w-5xl">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-16 -left-16 h-64 w-64 rounded-full bg-secondary/10 blur-3xl" />
        <div className="absolute -top-10 -right-10 h-64 w-64 rounded-full bg-violet/10 blur-3xl" />
      </div>

      {showChangePersona && (
        <div className="mb-4 text-center">
          <button
            type="button"
            onClick={onChangePersona}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
            Change persona
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-[1fr_auto]">
        <div className="text-center md:text-left">
          <div className="mb-4 flex items-center justify-center gap-2 md:justify-start">
            <Sparkles className="h-4 w-4 text-secondary" />
            <span className="text-sm font-semibold uppercase tracking-wide text-secondary">{eyebrow}</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">{title}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground md:mx-0 md:text-xl">{subtitle}</p>
          {notice && (
            <div className="mx-auto mt-5 max-w-xl rounded-xl border border-secondary/20 bg-secondary/5 px-4 py-3 md:mx-0">
              <p className="text-sm text-foreground">{notice}</p>
            </div>
          )}
        </div>

        <div className="hidden md:block">
          <div className="relative flex h-40 w-40 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-gradient-cta opacity-10 blur-2xl" />
            <div className="relative flex h-32 w-32 items-center justify-center rounded-3xl bg-gradient-cta shadow-strong">
              <Users className="h-14 w-14 text-white" />
            </div>
            <span className="absolute -bottom-2 -right-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-mint shadow-medium">
              <GraduationCap className="h-6 w-6 text-primary" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentHero;
