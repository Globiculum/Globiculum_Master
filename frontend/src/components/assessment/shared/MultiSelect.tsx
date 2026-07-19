import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Same prop contract as before (idPrefix/options/selected/onToggle/columns)
// so every existing call site keeps working unchanged — internal rendering
// is now premium chip buttons instead of raw checkbox+label rows.

interface MultiSelectProps {
  idPrefix: string;
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
  columns?: string;
}

const MultiSelect = ({ idPrefix, options, selected, onToggle }: MultiSelectProps) => {
  return (
    <div role="group" aria-label={idPrefix} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <button
            key={`${idPrefix}-${option}`}
            type="button"
            role="checkbox"
            aria-checked={isSelected}
            onClick={() => onToggle(option)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border-2 px-3.5 py-2 text-sm font-medium transition-all duration-200 ease-smooth",
              "hover:-translate-y-0.5 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isSelected
                ? "border-secondary bg-secondary text-secondary-foreground shadow-soft"
                : "border-border bg-card text-foreground hover:border-secondary/50"
            )}
          >
            {isSelected && <Check className="h-3.5 w-3.5" />}
            {option}
          </button>
        );
      })}
    </div>
  );
};

export default MultiSelect;
