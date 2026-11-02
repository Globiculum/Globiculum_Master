import { ArrowUpRight, FileQuestion, Globe2, GraduationCap, PlayCircle, School, type LucideIcon } from "lucide-react";
import type { LearningResource } from "@/hooks/useLearningResources";
import type { ActionPlan } from "@/lib/reportContent";
import { Panel, ResourceRow } from "./ReportPrimitives";

/** NCERT links point at a whole book ("=0-7") or one chapter ("=3-7"). */
const linkLabel = (url: string) => (/textbook\.php\?[a-z]+\d+=0-\d+/i.test(url) ? "Open book" : /textbook\.php/i.test(url) ? "Open chapter" : "Open");

// Tinted cards as in the earlier report: mint for the child, indigo for the teacher.
const TIP_TONE = {
  mint: { card: "border-mint/50 bg-mint/10", icon: "bg-mint/30 text-secondary-contrast", title: "text-secondary-contrast", dot: "bg-secondary" },
  violet: { card: "border-violet/30 bg-violet/10", icon: "bg-violet/20 text-primary", title: "text-primary", dot: "bg-violet" },
  teal: { card: "border-secondary/25 bg-secondary/5", icon: "bg-secondary/15 text-secondary-contrast", title: "text-secondary-contrast", dot: "bg-secondary" },
} as const;

function TipCard({ icon: Icon, title, items, tone }: { icon: LucideIcon; title: string; items: string[]; tone: keyof typeof TIP_TONE }) {
  if (items.length === 0) return null;
  const t = TIP_TONE[tone];
  return (
    <div className={`rounded-xl border p-4 ${t.card}`}>
      <div className="flex items-center gap-2.5">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${t.icon}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className={`font-heading text-sm font-semibold ${t.title}`}>{title}</p>
      </div>
      <ul className="mt-3 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5 font-body text-[15px] leading-snug text-foreground/85">
            <span className={`mt-[0.5rem] h-1.5 w-1.5 shrink-0 rounded-full ${t.dot}`} aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ThisWeekProps {
  plan: ActionPlan;
  learningChannels: LearningResource[];
  questionBanks: LearningResource[];
  sameCurriculumNote?: string;
}

/**
 * What to do first: three concrete steps with the place to study each, then
 * the AI's tips (each said once) and more channels to study with.
 */
export function ThisWeek({ plan, learningChannels, questionBanks, sameCurriculumNote }: ThisWeekProps) {
  return (
    <div className="space-y-4">
      {sameCurriculumNote && (
        <Panel className="px-5 py-4">
          <p className="font-heading text-sm font-semibold text-primary">Same curriculum detected</p>
          <p className="mt-1 font-body text-[15px] text-foreground/85">{sameCurriculumNote}</p>
        </Panel>
      )}

      {plan.thisWeek.length > 0 && (
        <Panel>
          <ol className="divide-y divide-border">
            {plan.thisWeek.map((step, i) => (
              <li key={step.label} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
                <div className="flex min-w-0 flex-1 items-start gap-3.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary font-heading text-sm font-semibold text-white">
                    {i + 1}
                  </span>
                  <p className="pt-0.5 font-body text-[16px] leading-snug text-foreground">{step.label}</p>
                </div>
                {step.url && (
                  <a
                    href={step.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group ml-10 inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-border bg-background px-3 py-1.5 font-heading text-sm font-medium text-primary transition-colors hover:border-secondary/50 hover:bg-secondary/5 hover:text-secondary-contrast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 sm:ml-0 sm:self-center"
                  >
                    {linkLabel(step.url)}
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-px group-hover:translate-x-px" aria-hidden="true" />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                )}
              </li>
            ))}
          </ol>
        </Panel>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <TipCard icon={GraduationCap} tone="mint" title="For your child" items={plan.student} />
        <TipCard icon={School} tone="violet" title="For the tutor or teacher" items={plan.teacher} />
        <TipCard icon={Globe2} tone="teal" title="Culture & language" items={plan.culture} />
      </div>

      {(learningChannels.length > 0 || questionBanks.length > 0) && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            { title: "Video lessons", Icon: PlayCircle, items: learningChannels },
            { title: "Practice and question banks", Icon: FileQuestion, items: questionBanks },
          ].map(({ title, Icon, items }) =>
            items.length > 0 ? (
              <Panel key={title} className="p-3">
                <p className="flex items-center gap-2 px-2 pb-1 pt-1 font-heading text-sm font-semibold text-secondary-contrast">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {title}
                </p>
                {items.map((r) => (
                  <ResourceRow key={r.url} resource={r} />
                ))}
              </Panel>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
