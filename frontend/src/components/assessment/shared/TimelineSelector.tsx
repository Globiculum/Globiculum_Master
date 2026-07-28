import { Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TimelineOption {
  value: string;
  label: string;
  description?: string;
}

interface TimelineSelectorProps {
  options: TimelineOption[];
  value: string;
  onChange: (value: string) => void;
}

// Beautiful selectable "timeline cards" for few-option, single-select fields
// (e.g. Preparation Timeline) — a thin, named wrapper around the same visual
// language as OptionCard's "large" variant, kept separate for readability at
// call sites and to match the component naming requested for this redesign.
const TimelineSelector = ({ options, value, onChange }: TimelineSelectorProps) => {
  return (
    <div role="radiogroup" aria-label="Timeline" className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "group relative flex flex-col items-center gap-1.5 rounded-2xl border-2 p-4 text-center transition-all duration-200 ease-smooth",
              "hover:-translate-y-0.5 hover:shadow-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              selected ? "border-secondary bg-secondary/5 shadow-soft" : "border-border bg-card hover:border-secondary/40"
            )}
          >
            <span
              className={cn(
                "absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border transition-all duration-200",
                selected
                  ? "border-secondary bg-secondary text-secondary-foreground"
                  : "border-border bg-transparent opacity-0 group-hover:opacity-40"
              )}
            >
              <Check className="h-3 w-3" />
            </span>
            <Clock className={cn("h-5 w-5", selected ? "text-secondary" : "text-muted-foreground")} />
            <span className="text-sm font-semibold text-foreground">{option.label}</span>
            {option.description && <span className="text-xs text-muted-foreground">{option.description}</span>}
          </button>
        );
      })}
    </div>
  );
};

export default TimelineSelector;
