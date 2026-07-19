import { ReactNode } from "react";

// Generalizes the repeated toggle-button pattern used throughout
// AssessmentForm.tsx for single/multi-select "cards". Each variant's
// className is copied verbatim from the original inline usage so visuals
// don't change — only the repetition is removed.

type OptionCardVariant = "large" | "block" | "pill" | "compact-pill";

const VARIANT_CLASSES: Record<OptionCardVariant, { base: string; selected: string; unselected: string }> = {
  large: {
    base: "p-6 rounded-lg border-2 transition-all hover:border-primary",
    selected: "border-primary bg-primary/5",
    unselected: "border-border bg-card",
  },
  block: {
    base: "p-4 rounded-lg border-2 transition-all font-medium text-sm",
    selected: "border-primary bg-primary/5 text-primary",
    unselected: "border-border bg-card hover:border-primary/50",
  },
  pill: {
    base: "px-3 py-2 rounded-md border text-sm transition-all",
    selected: "border-primary bg-primary/10 text-primary",
    unselected: "border-border hover:border-primary/50",
  },
  "compact-pill": {
    base: "px-3 py-1.5 rounded-md border text-xs md:text-sm transition-all",
    selected: "border-primary bg-primary/10 text-primary font-medium",
    unselected: "border-border bg-card hover:border-primary/50",
  },
};

interface OptionCardProps {
  selected: boolean;
  onClick: () => void;
  variant?: OptionCardVariant;
  className?: string;
  children: ReactNode;
}

const OptionCard = ({ selected, onClick, variant = "block", className, children }: OptionCardProps) => {
  const classes = VARIANT_CLASSES[variant];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${classes.base} ${selected ? classes.selected : classes.unselected} ${className ?? ""}`}
    >
      {children}
    </button>
  );
};

export default OptionCard;
