import { HeartHandshake } from "lucide-react";
import { Panel } from "@/components/report/ReportPrimitives";
import { AiSuggestedTag } from "@/components/report/PreparationPlan";

/**
 * The AI's reply to the student form's "What makes you nervous?" (T72), written
 * to the student. Only on reports whose form had a worry ticked
 * (analyze-curriculum drops the field otherwise), so parent reports and older
 * reports don't show it. `worries` are the ticks themselves, when the form data
 * has them (a shared link doesn't).
 */
export function WorriesResponse({ text, worries = [] }: { text: string; worries?: string[] }) {
  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-heading text-sm font-semibold text-secondary-contrast">
          <HeartHandshake className="h-4 w-4 text-secondary" aria-hidden="true" />
          About what makes you nervous
        </p>
        <AiSuggestedTag label="AI-written from your answers" />
      </div>
      {worries.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="What you said makes you nervous">
          {worries.map((w) => (
            <li key={w} className="rounded-full border border-secondary/25 bg-secondary/[0.06] px-2.5 py-0.5 text-xs font-semibold text-secondary-contrast">
              {w}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2.5 font-body text-[15px] leading-relaxed text-foreground/85">{text}</p>
    </Panel>
  );
}
