import { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Same prop contract as before (selected/onClick/variant/className/children)
// so every existing call site across ParentStep1/ParentStep2 keeps working
// unchanged — only the visual treatment is new.

type OptionCardVariant = "large" | "block" | "pill" | "compact-pill";

const VARIANT_CLASSES: Record<OptionCardVariant, { base: string; selected: string; unselected: string }> = {
  large: {
    base: "relative p-6 rounded-2xl border-2 transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:shadow-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    selected: "border-secondary bg-secondary/5 shadow-soft",
    unselected: "border-border bg-card hover:border-secondary/40",
  },
  block: {
    base: "relative p-4 rounded-xl border-2 transition-all duration-200 ease-smooth font-medium text-sm hover:-translate-y-0.5 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    selected: "border-secondary bg-secondary/5 text-secondary",
    unselected: "border-border bg-card hover:border-secondary/40",
  },
  pill: {
    base: "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border-2 text-sm font-medium transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    selected: "border-secondary bg-secondary text-secondary-foreground shadow-soft",
    unselected: "border-border bg-card hover:border-secondary/50",
  },
  "compact-pill": {
    base: "px-3 py-1.5 rounded-full border-2 text-xs md:text-sm font-medium transition-all duration-200 ease-smooth hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    selected: "border-secondary bg-secondary text-secondary-foreground shadow-soft",
    unselected: "border-border bg-card hover:border-secondary/40",
  },
};

interface OptionCardProps {
  selected: boolean;
  onClick: () => void;
  variant?: OptionCardVariant;
  /** ARIA role — "checkbox" (default) for multi-select groups, "radio" for mutually-exclusive single-select groups. */
  mode?: "checkbox" | "radio";
  className?: string;
  children: ReactNode;
}

const OptionCard = ({ selected, onClick, variant = "block", mode = "checkbox", className, children }: OptionCardProps) => {
  const classes = VARIANT_CLASSES[variant];
  const showCheckBadge = variant === "large" || variant === "block";

  return (
    <button
      type="button"
      role={mode}
      aria-checked={selected}
      onClick={onClick}
      className={cn(classes.base, selected ? classes.selected : classes.unselected, className)}
    >
      {showCheckBadge && (
        <span
          className={cn(
            "absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border transition-all duration-200",
            selected
              ? "border-secondary bg-secondary text-secondary-foreground"
              : "border-border bg-transparent opacity-0"
          )}
        >
          <Check className="h-3 w-3" />
        </span>
      )}
      {(variant === "pill" || variant === "compact-pill") && selected && <Check className="h-3.5 w-3.5 shrink-0" />}
      {children}
    </button>
  );
};

export default OptionCard;
