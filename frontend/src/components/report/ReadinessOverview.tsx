import { motion } from "framer-motion";
import { AlertTriangle, CalendarClock, Hourglass, Layers } from "lucide-react";
import { deriveRiskLevel, subjectPercent, timeFit, type ReportAnalysis } from "@/lib/reportContent";
import { readinessVerdict, SUBJECT_DOT } from "@/lib/reportDesign";
import { InfoNote, Panel, ProgressBar } from "./ReportPrimitives";

const MOVE_LABEL: Record<string, string> = {
  "within-3-months": "Within 3 months",
  "3-6-months": "In 3–6 months",
  "6-12-months": "In 6–12 months",
  "1-2-years": "In 1–2 years",
  exploring: "Not decided yet",
};

function ReadinessRing({ percentage }: { percentage: number }) {
  const size = 148;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, Number.isFinite(percentage) ? percentage : 0));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(var(--secondary))"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct / 100) }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-heading text-4xl font-bold tracking-tight text-primary">{Math.round(pct)}%</span>
        <span className="font-heading text-xs font-medium text-muted-foreground">ready today</span>
      </div>
    </div>
  );
}

// Teal, amber and indigo tiles with a coloured top edge, as in the earlier report design.
const FACT_TONE = {
  teal: { box: "border-secondary bg-secondary/10", icon: "text-secondary", value: "text-secondary-contrast" },
  amber: { box: "border-accent bg-accent/10", icon: "text-accent-contrast", value: "text-accent-contrast" },
  violet: { box: "border-violet bg-violet/10", icon: "text-violet", value: "text-primary" },
} as const;

function Fact({ icon: Icon, label, value, tone }: { icon: typeof Layers; label: string; value: string; tone: keyof typeof FACT_TONE }) {
  const t = FACT_TONE[tone];
  return (
    <div className={`flex items-start gap-3 rounded-lg border-t-2 px-3.5 py-3 ${t.box}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${t.icon}`} aria-hidden="true" />
      <div>
        <p className="font-heading text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`font-heading text-base font-bold ${t.value}`}>{value}</p>
      </div>
    </div>
  );
}

/** Each subject's alignment as a bar, in the order of the subject cards. */
function AlignmentBySubject({ subjects }: { subjects: { subject: string; pct: number }[] }) {
  return (
    <div>
      <p className="font-heading text-sm font-semibold text-secondary-contrast">Alignment by Subject</p>
      <ul className="mt-2.5 space-y-2.5">
        {subjects.map((s, i) => (
          <li key={s.subject} className="flex items-center gap-2.5">
            <span className={`h-2 w-2 shrink-0 rounded-full ${SUBJECT_DOT[i % SUBJECT_DOT.length]}`} aria-hidden="true" />
            <span className="w-28 shrink-0 truncate font-heading text-sm font-medium text-foreground" title={s.subject}>
              {s.subject}
            </span>
            <ProgressBar value={s.pct} barClass={s.pct >= 70 ? "bg-secondary" : "bg-accent"} label={`${s.subject} alignment`} height="h-2" />
            <span className="w-10 shrink-0 text-right font-heading text-sm font-semibold tabular-nums text-primary">{s.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ReadinessOverviewProps {
  analysis: ReportAnalysis;
  /** analysis.subjectAnalysis in subject card order. */
  orderedSubjects: ReportAnalysis["subjectAnalysis"];
  summary: string;
  takeaways: string[];
  notes: string[];
  timeline?: string;
}

/** The answer first: how ready, what it means, how long, and anything the parent must know. */
export function ReadinessOverview({ analysis, orderedSubjects, summary, takeaways, notes, timeline }: ReadinessOverviewProps) {
  const pct = analysis.overallAlignment.percentage;
  const risk = deriveRiskLevel(pct);
  const assessed = analysis.subjectAnalysis.filter(
    (s) => s.totalTopics > 0 && !s.keyGaps.some((g) => typeof g !== "string" && g.topic === "Assessment unavailable")
  );
  const toBridge = assessed.filter((s) => s.alignmentLevel !== "strong").length;
  const bars = orderedSubjects.filter((s) => assessed.includes(s)).map((s) => ({ subject: s.subject, pct: subjectPercent(s) }));
  const fit = timeFit(analysis, timeline);
  const riskChip =
    risk === "High"
      ? "bg-accent/10 text-accent-contrast ring-accent/30"
      : risk === "Medium"
        ? "bg-muted text-foreground/80 ring-border"
        : "bg-secondary/10 text-secondary-contrast ring-secondary/25";

  return (
    <div className="space-y-3">
      <Panel className="p-5 sm:p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex flex-col items-center gap-2.5 rounded-xl border border-mint/40 bg-mint/15 px-6 py-4">
            <p className="font-heading text-xs font-semibold uppercase tracking-wide text-muted-foreground">Overall readiness</p>
            <ReadinessRing percentage={pct} />
            <span className={`rounded-full px-2.5 py-0.5 font-heading text-xs font-medium ring-1 ring-inset ${riskChip}`}>{risk} transition risk</span>
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-lg font-semibold text-primary sm:text-xl">{readinessVerdict(pct)}</h3>
            <p className="mt-2 font-body text-[16px] leading-relaxed text-foreground/85">{summary}</p>
            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <Fact icon={Layers} tone="teal" label="Subjects to bridge" value={`${toBridge} of ${assessed.length}`} />
              <Fact icon={Hourglass} tone="amber" label="Estimated preparation" value={analysis.overallAlignment.estimatedDuration} />
              <Fact icon={CalendarClock} tone="violet" label="Planned move" value={MOVE_LABEL[timeline ?? ""] ?? "Not set"} />
            </div>
          </div>
        </div>

        {fit?.fit === "short" && (
          <p className="mt-5 flex gap-2.5 rounded-lg border border-accent/30 bg-accent/10 px-3.5 py-2.5 font-body text-[15px] leading-snug text-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent-contrast" aria-hidden="true" />
            <span>
              <strong className="font-semibold">Preparation runs longer than the time before the move.</strong> Start now with the subjects
              below, and plan to finish the remaining topics alongside school after the move.
            </span>
          </p>
        )}

        {(bars.length > 0 || takeaways.length > 0) && (
          <div className="mt-5 grid grid-cols-1 gap-x-10 gap-y-5 border-t border-border pt-4 lg:grid-cols-2">
            {bars.length > 0 && <AlignmentBySubject subjects={bars} />}
            {takeaways.length > 0 && (
              <div>
                <p className="font-heading text-sm font-semibold text-secondary-contrast">Key takeaways</p>
                <ul className="mt-2.5 space-y-1.5">
                  {takeaways.map((t, i) => (
                    <li key={t} className="flex gap-2.5 font-body text-[15px] leading-snug text-foreground/85">
                      <span className={`mt-[0.5rem] h-1.5 w-1.5 shrink-0 rounded-full ${i % 2 === 0 ? "bg-secondary" : "bg-violet"}`} aria-hidden="true" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Panel>

      {notes.map((n) => (
        <InfoNote key={n}>{n}</InfoNote>
      ))}
    </div>
  );
}
