import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SupportOption {
  value: string;
  icon: LucideIcon;
}

interface SupportCardsProps {
  options: SupportOption[];
  selected: string[];
  onToggle: (value: string) => void;
}

// Selectable "support need" cards replacing a raw checkbox grid — the exact
// support-need strings (and therefore payload values) stay owned by the
// caller (ParentStep4.tsx); this component only supplies the icon + chrome.
const SupportCards = ({ options, selected, onToggle }: SupportCardsProps) => (
  <div role="group" aria-label="Support Needs Priority" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    {options.map(({ value, icon: Icon }) => {
      const isSelected = selected.includes(value);
      return (
        <button
          key={value}
          type="button"
          role="checkbox"
          aria-checked={isSelected}
          onClick={() => onToggle(value)}
          className={cn(
            "group relative flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200 ease-smooth",
            "hover:-translate-y-0.5 hover:shadow-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            isSelected ? "border-secondary bg-secondary/5 shadow-soft" : "border-border bg-card hover:border-secondary/40"
          )}
        >
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              isSelected ? "bg-secondary/15 text-secondary" : "bg-muted text-muted-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
          <span className="text-sm font-medium text-foreground">{value}</span>
          <span
            className={cn(
              "ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
              isSelected
                ? "border-secondary bg-secondary text-secondary-foreground"
                : "border-border bg-transparent opacity-0 group-hover:opacity-40"
            )}
          >
            <Check className="h-3 w-3" />
          </span>
        </button>
      );
    })}
  </div>
);

export default SupportCards;
