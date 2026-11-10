import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import backIcon from "@/assets/icons-3d/back.png";

interface CardNavProps {
  /** Omitted on the first question of a step: the page's Previous button covers it. */
  onBack?: () => void;
  /** Omitted when the card has no way forward of its own. */
  onNext?: () => void;
  nextLabel?: string;
  /** True until a required answer is in. */
  nextDisabled?: boolean;
  className?: string;
}

// The Back / Next row at the bottom of every question card in both
// assessments, always in the same place: Back on the left, Next on the right.
// It moves between the questions of a step; the page's Continue button below
// moves between steps.
const CardNav = ({ onBack, onNext, nextLabel = "Next", nextDisabled = false, className }: CardNavProps) => (
  <div className={cn("relative mt-6 flex items-center justify-between gap-3 border-t border-border/60 pt-4", className)}>
    {onBack ? (
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <img src={backIcon} className="h-3.5 w-3.5 object-contain" alt="" aria-hidden="true" draggable={false} />
        Back
      </button>
    ) : (
      <span aria-hidden="true" />
    )}
    {onNext ? (
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="group inline-flex items-center gap-2 rounded-full bg-secondary py-2.5 pl-5 pr-2 text-sm font-semibold text-secondary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:bg-secondary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
      >
        {nextLabel}
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 transition-transform duration-200 group-hover:translate-x-0.5">
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </button>
    ) : (
      <span aria-hidden="true" />
    )}
  </div>
);

export default CardNav;
