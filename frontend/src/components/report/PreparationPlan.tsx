import { Sparkles } from "lucide-react";

export interface PlanMonth {
  phase: string;
  month: number;
  focusAreas: string[];
}

/** Indigo marks AI-generated content (brand rule); the dot carries the colour, text stays navy for contrast. */
export function AiSuggestedTag() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet/10 px-2.5 py-1 font-heading text-xs font-medium text-primary ring-1 ring-inset ring-violet/25">
      <Sparkles className="h-3.5 w-3.5 text-violet" aria-hidden="true" />
      AI-suggested from the gaps above
    </span>
  );
}

// Phase colours follow the earlier report's stepper: teal, then indigo, and mint
// for the final phase, which is tinted as the finish line.
const PHASE_TONE = [
  { card: "border-t-secondary bg-card", num: "bg-secondary text-white", rule: "border-secondary/40" },
  { card: "border-t-violet bg-card", num: "bg-violet text-primary", rule: "border-violet/40" },
  { card: "border-t-mint bg-secondary/5", num: "bg-mint text-primary", rule: "border-mint" },
];

/**
 * The plan as three phases rather than one card per month: a parent reads the
 * shape first (what each stretch is for), then the step for each month. Why to
 * start now is said once, in the overview, not repeated here.
 */
export function PreparationPlan({ months }: { months: PlanMonth[] }) {
  const phases: { name: string; months: PlanMonth[] }[] = [];
  for (const m of months) {
    const last = phases[phases.length - 1];
    if (last && last.name === m.phase) last.months.push(m);
    else phases.push({ name: m.phase, months: [m] });
  }
  const span = (ms: PlanMonth[]) => (ms.length === 1 ? `Month ${ms[0].month}` : `Months ${ms[0].month}–${ms[ms.length - 1].month}`);

  return (
    <div>
      <ol className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {phases.map((phase, i) => {
          const tone = PHASE_TONE[Math.min(i, PHASE_TONE.length - 1)];
          return (
            <li key={`${phase.name}-${i}`}>
              <div className={`h-full rounded-xl border border-t-4 border-border p-4 shadow-soft ${tone.card}`}>
                <div className="flex items-center gap-2.5">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-heading text-sm font-semibold ${tone.num}`}>
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-heading text-sm font-semibold text-primary">{phase.name}</p>
                    <p className="font-heading text-xs font-medium text-muted-foreground">{span(phase.months)}</p>
                  </div>
                </div>
                <ul className={`mt-3 space-y-2.5 border-l-2 pl-3.5 ${tone.rule}`}>
                  {phase.months.map((m) => (
                    <li key={m.month}>
                      {/* A one-month phase already names its month under the phase name. */}
                      {phase.months.length > 1 && <p className="font-heading text-xs font-medium text-secondary-contrast">Month {m.month}</p>}
                      {m.focusAreas.map((f) => (
                        <p key={f} className="font-body text-[15px] leading-snug text-foreground/85">{f}</p>
                      ))}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
