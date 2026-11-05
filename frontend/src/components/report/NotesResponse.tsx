import { MessageSquareText } from "lucide-react";
import { Panel } from "@/components/report/ReportPrimitives";
import { AiSuggestedTag } from "@/components/report/PreparationPlan";

/**
 * The AI's reply to the form's "Additional notes": how the report and plan take
 * them into account. Only on reports whose form had notes (analyze-curriculum
 * drops the field otherwise), so older reports don't show it.
 */
export function NotesResponse({ text }: { text: string }) {
  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-heading text-sm font-semibold text-secondary-contrast">
          <MessageSquareText className="h-4 w-4 text-secondary" aria-hidden="true" />
          About your notes
        </p>
        <AiSuggestedTag label="AI-written from your notes" />
      </div>
      <p className="mt-2.5 font-body text-[15px] leading-relaxed text-foreground/85">{text}</p>
    </Panel>
  );
}
