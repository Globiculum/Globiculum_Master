import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Reusable container for a Globiculum icon — flat tint per tone, no
// gradient (CTA/icon gradients live only on the flashcard shell, not here).
// Every current call site sits on the dark-navy flashcard shell, so tones
// are tuned for contrast against #0F172A rather than a light card.

export type GlobiculumIconTileTone = "teal" | "mint" | "violet" | "amber";

const TONE_STYLE: Record<GlobiculumIconTileTone, { surface: string; accentDot: string }> = {
  teal: { surface: "border-secondary/50 bg-secondary/20", accentDot: "bg-secondary" },
  mint: { surface: "border-mint/50 bg-mint/20", accentDot: "bg-mint" },
  violet: { surface: "border-violet/50 bg-violet/20", accentDot: "bg-violet" },
  amber: { surface: "border-accent/40 bg-accent/15", accentDot: "bg-accent" },
};

interface GlobiculumIconTileProps {
  tone: GlobiculumIconTileTone;
  /** Visual size in px — 44 to 56 is the intended range. Default 48. */
  size?: number;
  /** Show the small decorative corner accent. Default true. */
  accent?: boolean;
  children: ReactNode;
  className?: string;
}

const GlobiculumIconTile = ({ tone, size = 48, accent = true, children, className }: GlobiculumIconTileProps) => {
  const style = TONE_STYLE[tone];
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-2xl border shadow-sm transition-transform duration-200 ease-out hover:-translate-y-0.5",
        style.surface,
        className
      )}
      style={{ width: size, height: size }}
    >
      {children}
      {accent && <span className={cn("absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full", style.accentDot)} aria-hidden="true" />}
    </div>
  );
};

export default GlobiculumIconTile;
