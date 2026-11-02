import { MessageCircleQuestion } from "lucide-react";
import { Panel } from "./ReportPrimitives";

/** Questions parents ask, answered from this report, as readable cards (two columns on wide screens). */
export function ParentQuestions({ items }: { items: { question: string; answer: string }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {items.map((q) => (
        <Panel key={q.question} className="border-l-4 border-l-secondary p-4 sm:p-5">
          <dt className="flex gap-2.5 font-heading text-[15px] font-semibold leading-snug text-primary">
            <MessageCircleQuestion className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
            {q.question}
          </dt>
          <dd className="mt-2 pl-[1.625rem] font-body text-[15px] leading-relaxed text-foreground/85">{q.answer}</dd>
        </Panel>
      ))}
    </dl>
  );
}
