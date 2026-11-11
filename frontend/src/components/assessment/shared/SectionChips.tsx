import type { Ref } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionChipsProps<T extends string> {
  sections: T[];
  labels: Record<T, string>;
  activeIndex: number;
  isComplete: (id: T) => boolean;
  onSelect: (id: T) => void;
  /** From useSectionFlow: kept in view when the section changes. */
  chipsRef: Ref<HTMLDivElement>;
}

// The row of section chips above the Academic Path step (see useSectionFlow):
// done sections ticked, the open one filled. Earlier sections can always be
// reopened; a later one only once every section before it has its required
// answers.
const SectionChips = <T extends string>({ sections, labels, activeIndex, isComplete, onSelect, chipsRef }: SectionChipsProps<T>) => (
  <div ref={chipsRef} className="scroll-mt-24">
    <ol aria-label="Academic Path sections" className="flex flex-wrap items-center gap-2">
      {sections.map((id, i) => {
        const current = i === activeIndex;
        const done = i < activeIndex && isComplete(id);
        const reachable = i <= activeIndex || sections.slice(0, i).every(isComplete);
        return (
          <li key={id}>
            <button
              type="button"
              onClick={() => !current && onSelect(id)}
              disabled={!reachable}
              aria-current={current ? "step" : undefined}
              title={reachable ? undefined : "Answer the sections before this one first"}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                current
                  ? "border-secondary bg-secondary text-secondary-foreground"
                  : done
                    ? "border-secondary/40 bg-secondary/10 text-secondary hover:bg-secondary/15"
                    : reachable
                      ? "border-border bg-card text-foreground hover:bg-muted"
                      : "cursor-not-allowed border-border bg-muted/40 text-muted-foreground"
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <span className="tabular-nums" aria-hidden="true">{i + 1}</span>}
              {labels[id]}
            </button>
          </li>
        );
      })}
    </ol>
  </div>
);

export default SectionChips;
