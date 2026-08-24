import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import bgFlashcard from "@/assets/BG-flashcard.png";

// Shared outer shell for every flashcard across Student + Parent. One
// surface, not a card floating on a card: BG-flashcard.png is the
// flashcard's actual surface, with only a soft translucent wash over it
// (never an opaque boxed panel) so the globe/wave artwork stays visible
// through the content. `accent` shifts which part of the artwork the crop
// favors — kept fixed per wizard/section (not per individual card) so a
// single question flow doesn't visually jump between crops, while
// different sections of the assessment read as distinct.
export type FlashcardShellAccent = "globe" | "teal" | "violet";

const ACCENT_POSITION: Record<FlashcardShellAccent, string> = {
  globe: "object-[75%_15%]",
  teal: "object-[15%_10%]",
  violet: "object-[85%_85%]",
};

interface FlashcardShellProps {
  invalid?: boolean;
  accent?: FlashcardShellAccent;
  /** Opt-in 1px Academic Teal border instead of the default neutral border —
   * off by default so existing callers (Parent's wizard, other flashcards)
   * render exactly as before; only Student Profile's cards request it. */
  accentBorder?: boolean;
  children: ReactNode;
}

const FlashcardShell = ({ invalid, accent = "globe", accentBorder = false, children }: FlashcardShellProps) => (
  <div
    className={cn(
      "relative overflow-hidden rounded-2xl shadow-soft",
      accentBorder ? "border border-secondary" : "border border-border",
      invalid && "ring-2 ring-destructive/60 ring-offset-2 ring-offset-background transition-shadow duration-200"
    )}
    data-field-invalid={invalid ? "true" : undefined}
    tabIndex={invalid ? -1 : undefined}
  >
    <img
      src={bgFlashcard}
      alt=""
      aria-hidden="true"
      className={cn("absolute inset-0 h-full w-full object-cover", ACCENT_POSITION[accent])}
    />
    <div className="absolute inset-0 bg-white/40" aria-hidden="true" />
    <div className="relative p-7 sm:p-10">{children}</div>
  </div>
);

export default FlashcardShell;
