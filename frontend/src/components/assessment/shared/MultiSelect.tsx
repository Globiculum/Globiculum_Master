import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// Generalizes the repeated Checkbox+Label grid pattern used throughout
// AssessmentForm.tsx (languages at home, extracurriculars, transition
// concerns, support needs, etc.). `columns` matches the exact grid class
// each original usage had, so layouts don't shift.

interface MultiSelectProps {
  idPrefix: string;
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
  columns?: string; // e.g. "grid-cols-2 md:grid-cols-3"
}

const MultiSelect = ({ idPrefix, options, selected, onToggle, columns = "grid-cols-2 md:grid-cols-3" }: MultiSelectProps) => {
  return (
    <div className={`grid ${columns} gap-3`}>
      {options.map((option) => {
        const id = `${idPrefix}-${option}`;
        return (
          <div key={option} className="flex items-center space-x-2">
            <Checkbox id={id} checked={selected.includes(option)} onCheckedChange={() => onToggle(option)} />
            <Label htmlFor={id} className="text-sm cursor-pointer">
              {option}
            </Label>
          </div>
        );
      })}
    </div>
  );
};

export default MultiSelect;
