import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface InputCardProps {
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
  /** ARIA role — "radio" for single-select groups, "checkbox" for multi-select groups. */
  mode?: "radio" | "checkbox";
  /** "chip" = compact pill (default), "large" = bigger card with room for a description. */
  variant?: "chip" | "large";
  /** Visible but unselectable — greyed out, no hover lift, click is a no-op. */
  disabled?: boolean;
  /** Native tooltip shown on hover while disabled, e.g. "Coming Soon". */
  disabledHint?: string;
}

const CheckBadge = ({ selected, size = "h-3 w-3" }: { selected: boolean; size?: string }) => (
  <motion.span
    animate={selected ? { scale: 1, opacity: 1 } : { scale: 0.6, opacity: 0 }}
    transition={{ type: "spring", stiffness: 500, damping: 24 }}
  >
    <Check className={size} />
  </motion.span>
);

const InputCard = ({
  label,
  description,
  selected,
  onClick,
  mode = "radio",
  variant = "chip",
  disabled = false,
  disabledHint,
}: InputCardProps) => {
  const interactive = !disabled;

  if (variant === "large") {
    return (
      <motion.button
        type="button"
        role={mode}
        aria-checked={selected}
        aria-disabled={disabled}
        disabled={disabled}
        title={disabled ? disabledHint : undefined}
        onClick={disabled ? undefined : onClick}
        whileHover={interactive ? { y: -3 } : undefined}
        whileTap={interactive ? { scale: 0.98 } : undefined}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className={cn(
          "group relative flex flex-col items-start gap-1 rounded-xl border-2 p-4 text-left transition-colors duration-200 ease-smooth",
          "hover:shadow-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          selected ? "border-secondary bg-secondary/5 shadow-glow-sm" : "border-border bg-card hover:border-secondary/40",
          disabled && "cursor-not-allowed opacity-40 hover:shadow-none"
        )}
      >
        <span
          className={cn(
            "absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border transition-colors duration-200",
            selected
              ? "border-secondary bg-secondary text-secondary-foreground"
              : "border-border bg-transparent opacity-0 group-hover:opacity-40"
          )}
        >
          <CheckBadge selected={selected} />
        </span>
        <span className="pr-6 text-base font-semibold text-foreground">{label}</span>
        {description && <span className="text-caption text-muted-foreground">{description}</span>}
      </motion.button>
    );
  }

  return (
    <motion.button
      type="button"
      role={mode}
      aria-checked={selected}
      aria-disabled={disabled}
      disabled={disabled}
      title={disabled ? disabledHint : undefined}
      onClick={disabled ? undefined : onClick}
      whileHover={interactive ? { y: -2 } : undefined}
      whileTap={interactive ? { scale: 0.96 } : undefined}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border-2 px-4 py-2 text-sm font-medium transition-colors duration-200 ease-smooth",
        "hover:shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected
          ? "border-secondary bg-secondary text-secondary-foreground shadow-soft"
          : "border-border bg-card text-foreground hover:border-secondary/50",
        disabled && "cursor-not-allowed opacity-40 hover:shadow-none"
      )}
    >
      {selected && <CheckBadge selected={selected} size="h-3.5 w-3.5" />}
      {label}
    </motion.button>
  );
};

export default InputCard;
