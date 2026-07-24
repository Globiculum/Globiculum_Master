import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
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

// Tiny celebratory burst that pops once when a "large" card is freshly
// selected — rewards the tap without adding noise to the smaller, more
// numerous chip pills.
const SelectSparkle = ({ fire }: { fire: boolean }) => (
  <AnimatePresence>
    {fire && (
      <>
        {[0, 1, 2].map((i) => {
          const angle = (i / 3) * Math.PI * 2 - Math.PI / 2;
          return (
            <motion.span
              key={i}
              className="pointer-events-none absolute left-1/2 top-1/2 text-mint"
              initial={{ opacity: 0, scale: 0.4, x: 0, y: 0 }}
              animate={{ opacity: [1, 0], scale: [0.6, 1], x: Math.cos(angle) * 34, y: Math.sin(angle) * 34 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <Sparkles className="h-3.5 w-3.5" />
            </motion.span>
          );
        })}
      </>
    )}
  </AnimatePresence>
);

const useFreshSelection = (selected: boolean) => {
  const [justSelected, setJustSelected] = useState(false);
  const prevSelected = useRef(selected);

  useEffect(() => {
    const freshlySelected = selected && !prevSelected.current;
    prevSelected.current = selected;
    if (!freshlySelected) return;

    setJustSelected(true);
    const id = window.setTimeout(() => setJustSelected(false), 550);
    return () => window.clearTimeout(id);
  }, [selected]);

  return justSelected;
};

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
  const shouldReduceMotion = useReducedMotion() ?? false;
  const interactive = !disabled;
  const justSelected = useFreshSelection(selected) && !shouldReduceMotion;

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
        whileHover={interactive ? { y: -4, scale: 1.02 } : undefined}
        whileTap={interactive ? { scale: 0.96 } : undefined}
        transition={{ type: "spring", stiffness: 420, damping: 18 }}
        className={cn(
          "group relative flex flex-col items-start gap-1 rounded-xl border-2 p-4 text-left transition-colors duration-200 ease-smooth",
          "hover:shadow-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          selected ? "border-secondary bg-secondary/5 shadow-glow-sm" : "border-border bg-card hover:border-secondary/40",
          disabled && "cursor-not-allowed opacity-40 hover:shadow-none"
        )}
      >
        <SelectSparkle fire={justSelected} />
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
      whileHover={interactive ? { y: -3, scale: 1.06 } : undefined}
      whileTap={interactive ? { scale: 0.9 } : undefined}
      transition={{ type: "spring", stiffness: 460, damping: 17 }}
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
