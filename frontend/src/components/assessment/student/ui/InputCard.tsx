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
}

const InputCard = ({ label, description, selected, onClick, mode = "radio", variant = "chip" }: InputCardProps) => {
  if (variant === "large") {
    return (
      <button
        type="button"
        role={mode}
        aria-checked={selected}
        onClick={onClick}
        className={cn(
          "group relative flex flex-col items-start gap-1 rounded-xl border-2 p-4 text-left transition-all duration-200 ease-smooth",
          "hover:-translate-y-0.5 hover:shadow-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          selected ? "border-secondary bg-secondary/5 shadow-soft" : "border-border bg-card hover:border-secondary/40"
        )}
      >
        <span
          className={cn(
            "absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border transition-all duration-200",
            selected
              ? "border-secondary bg-secondary text-secondary-foreground"
              : "border-border bg-transparent opacity-0 group-hover:opacity-40"
          )}
        >
          <Check className="h-3 w-3" />
        </span>
        <span className="pr-6 text-base font-semibold text-foreground">{label}</span>
        {description && <span className="text-xs text-muted-foreground">{description}</span>}
      </button>
    );
  }

  return (
    <button
      type="button"
      role={mode}
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border-2 px-4 py-2 text-sm font-medium transition-all duration-200 ease-smooth",
        "hover:-translate-y-0.5 hover:shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected
          ? "border-secondary bg-secondary text-secondary-foreground shadow-soft"
          : "border-border bg-card text-foreground hover:border-secondary/50"
      )}
    >
      {selected && <Check className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
};

export default InputCard;
