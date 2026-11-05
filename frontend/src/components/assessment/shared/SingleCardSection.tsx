import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import FlashcardShell from "./FlashcardShell";

/**
 * A one-card section in the Academic Path step's layout: the left rail with the
 * section name and one entry (desktop), the card on the right. The same
 * markup as ParentStep2's High School & AP Courses and Overall Performance
 * sections, so a section built with it lines up with Core Subjects and
 * Language Exposure.
 */
interface SingleCardSectionProps {
  /** Rail heading, e.g. "Courses". */
  railTitle: string;
  /** The rail's one entry, e.g. "High School & AP Courses". */
  itemLabel: string;
  /** Small line under the entry, e.g. "2 added". */
  itemDetail?: string;
  complete: boolean;
  accent?: "violet" | "teal";
  invalid?: boolean;
  ariaLabel: string;
  children: ReactNode;
}

const SingleCardSection = ({ railTitle, itemLabel, itemDetail, complete, accent = "violet", invalid, ariaLabel, children }: SingleCardSectionProps) => (
  <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
    <nav aria-label={ariaLabel} className="hidden lg:block lg:w-[232px] lg:shrink-0">
      <div className="lg:sticky lg:top-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{railTitle}</h3>
        <ol className="mt-3">
          <li className="pb-3 last:pb-0">
            <div className="relative z-10 flex items-center gap-2.5 rounded-lg p-0.5">
              <span
                className={cn(
                  "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2",
                  complete ? "border-secondary bg-secondary text-secondary-foreground" : "border-violet bg-violet"
                )}
              >
                {complete ? <Check className="h-3 w-3" aria-hidden="true" /> : <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />}
              </span>
              <span className="min-w-0">
                <span className={cn("block text-sm", complete ? "font-medium text-secondary" : "font-semibold text-foreground")}>{itemLabel}</span>
                {itemDetail && (
                  <span className={cn("block text-xs", complete ? "font-medium text-secondary" : "text-muted-foreground/70")}>{itemDetail}</span>
                )}
              </span>
            </div>
          </li>
        </ol>
      </div>
    </nav>

    <div className="min-w-0 flex-1">
      <FlashcardShell accent={accent} invalid={invalid}>
        {children}
      </FlashcardShell>
    </div>
  </div>
);

export default SingleCardSection;
