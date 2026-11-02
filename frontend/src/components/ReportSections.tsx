import { Clock, FileQuestion, Gauge, Globe2, GraduationCap, Info, Layers, ListChecks, School, Youtube } from "lucide-react";
import type { LearningResource } from "@/hooks/useLearningResources";
import { deriveRiskLevel, type ActionPlan, type ReportAnalysis } from "@/lib/reportContent";

/**
 * Report sections shared by ReportPreview (the report page) and ReportView
 * (shared links). `linkClassName` lets the report page hide links in print,
 * as it does elsewhere.
 */

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div>
    <h3 className="text-lg font-bold text-primary">{children}</h3>
    <div className="mt-1 flex items-center gap-1.5">
      <div className="h-0.5 w-10 rounded-full bg-secondary" />
      <div className="h-1.5 w-1.5 rounded-full bg-mint" />
    </div>
  </div>
);

/**
 * Below the readiness donut. The donut already shows the percentage, so the
 * strip says how many subjects need bridging, the risk band and the prep time
 * instead of repeating it (the old "Ready Now" tile and "Risk at a Glance"
 * bars were the same number four times).
 */
export function ReadinessStrip({ analysis }: { analysis: ReportAnalysis }) {
  // "Assessment unavailable" cards (no source data) are not subjects to bridge.
  const assessed = analysis.subjectAnalysis.filter(
    (s) => s.totalTopics > 0 && !s.keyGaps.some((g) => typeof g !== "string" && g.topic === "Assessment unavailable")
  );
  const needingBridge = assessed.filter((s) => s.alignmentLevel !== "strong").length;
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
      <div className="flex items-center gap-2.5 rounded-md border-t-2 border-secondary bg-secondary/10 px-4 py-2.5">
        <Layers className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
        <div>
          <div className="text-lg font-bold leading-none text-secondary">
            {needingBridge} of {assessed.length}
          </div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Subjects to Bridge</div>
        </div>
      </div>
      <div className="flex items-center gap-2.5 rounded-md border-t-2 border-accent bg-accent/10 px-4 py-2.5">
        <Gauge className="h-4 w-4 shrink-0 text-accent-contrast" aria-hidden="true" />
        <div>
          <div className="text-lg font-bold leading-none text-accent-contrast">{deriveRiskLevel(analysis.overallAlignment.percentage)}</div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Risk Level</div>
        </div>
      </div>
      <div className="flex items-center gap-2.5 rounded-md border-t-2 border-violet bg-violet/10 px-4 py-2.5">
        <Clock className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <div className="text-lg font-bold leading-none text-primary">{analysis.overallAlignment.estimatedDuration}</div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Estimated Prep Time</div>
        </div>
      </div>
    </div>
  );
}

/** Notes on what was compared: ICSE via NCERT, a Hindi/Sanskrit left out. */
export function ReportNotes({ notes }: { notes: string[] }) {
  if (notes.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {notes.map((note) => (
        <p key={note} className="flex gap-1.5 rounded-md border border-secondary/25 bg-secondary/5 px-3 py-2 text-xs text-foreground/90">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" aria-hidden="true" />
          <span>{note}</span>
        </p>
      ))}
    </div>
  );
}

const Bullets = ({ items, marker = "•", markerClass = "text-secondary" }: { items: string[]; marker?: string; markerClass?: string }) => (
  <ul className="space-y-0.5 text-xs text-foreground/90">
    {items.map((item, i) => (
      <li key={i} className="flex gap-1.5">
        <span className={markerClass} aria-hidden="true">{marker}</span>
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

interface ActionPlanSectionProps {
  plan: ActionPlan;
  /** Video courses and channels for the report's subjects (catalogue type 'video'). */
  learningChannels: LearningResource[];
  /** Practice material (catalogue type 'practice'). */
  questionBanks: LearningResource[];
  /** Same-curriculum note (e.g. IB -> IB), shown above the plan. */
  sameCurriculumNote?: string;
  linkClassName?: string;
}

/**
 * One Action Plan (T07) in place of Immediate Actions, Student Checklist,
 * Teacher Recommendations and Cultural Adaptation, which showed the same AI
 * tips up to four times. Textbooks are in each subject card, so the shared
 * list keeps only learning channels and question banks (T05).
 */
export function ActionPlanSection({ plan, learningChannels, questionBanks, sameCurriculumNote, linkClassName = "" }: ActionPlanSectionProps) {
  const link = (label: string, url?: string) =>
    url ? (
      <a href={url} target="_blank" rel="noopener noreferrer" className={`underline hover:text-secondary ${linkClassName}`}>
        {label}
      </a>
    ) : (
      <span>{label}</span>
    );

  return (
    <div className="space-y-4">
      <SectionTitle>Action Plan</SectionTitle>

      {sameCurriculumNote && (
        <div className="rounded-md border border-border bg-muted/30 p-2.5">
          <div className="mb-0.5 text-xs font-medium text-foreground">Same Curriculum Detected</div>
          <p className="text-xs text-muted-foreground">{sameCurriculumNote}</p>
        </div>
      )}

      {plan.thisWeek.length > 0 && (
        <div className="rounded-md border border-secondary/30 bg-secondary/5 p-3">
          <h4 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-secondary">
            <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
            This Week
          </h4>
          <ol className="space-y-1 text-xs text-foreground/90">
            {plan.thisWeek.map((step, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="font-semibold text-secondary">{i + 1}.</span>
                {link(step.label, step.url)}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {plan.student.length > 0 && (
          <div className="rounded-md border border-mint/40 bg-mint/10 p-2.5">
            <h4 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-secondary">
              <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
              For the Student
            </h4>
            <Bullets items={plan.student} marker="▪" />
          </div>
        )}
        {plan.teacher.length > 0 && (
          <div className="rounded-md border border-violet/30 bg-violet/10 p-2.5">
            <h4 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              <School className="h-3.5 w-3.5" aria-hidden="true" />
              For the Teacher or Tutor
            </h4>
            <Bullets items={plan.teacher} marker="▪" markerClass="text-violet" />
          </div>
        )}
      </div>

      {plan.culture.length > 0 && (
        <div>
          <h4 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-secondary">
            <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />
            Culture &amp; Language
          </h4>
          <Bullets items={plan.culture} markerClass="text-violet" />
        </div>
      )}

      {(learningChannels.length > 0 || questionBanks.length > 0) && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {[
            { title: "Learning Channels", Icon: Youtube, items: learningChannels },
            { title: "Question Banks", Icon: FileQuestion, items: questionBanks },
          ].map(({ title, Icon, items }) => (
            <div key={title} className="rounded-md border border-border bg-muted/20 p-2.5">
              <h5 className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-secondary">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {title}
              </h5>
              {items.length > 0 ? (
                <ul className="space-y-1 text-xs text-foreground/90">
                  {items.map((r) => (
                    <li key={r.url}>{link(r.title, r.url)}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">None available yet for this board and class.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
