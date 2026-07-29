import { useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CustomEntryListProps {
  entries: string[];
  onAdd: (entry: string) => void;
  onRemove: (entry: string) => void;
  placeholder?: string;
}

// Add-multiple-and-remove chip list for free-text "Other" entries — shared by
// every "Other" selection in both assessments (current subjects, languages,
// and any future one) so they all get the same input row, chip styling, and
// Enter/Add/remove behavior. `mt-4` gives clear separation from whatever
// option grid/chip row sits above it, so the input row never reads as
// overlapping the selected cards. Callers own where the resulting strings
// are stored — both flows fold them straight into the existing string-array
// field (academicPath, selectedLanguages) rather than a separate field.
const CustomEntryList = ({ entries, onAdd, onRemove, placeholder = "Enter a value" }: CustomEntryListProps) => {
  const [draft, setDraft] = useState("");

  const handleAdd = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (entries.some((entry) => entry.toLowerCase() === trimmed.toLowerCase())) {
      setDraft("");
      return;
    }
    onAdd(trimmed);
    setDraft("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="flex gap-2">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={handleKeyDown} placeholder={placeholder} />
        <Button type="button" variant="outline" onClick={handleAdd} disabled={!draft.trim()} className="shrink-0 gap-1.5">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      {entries.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {entries.map((entry) => (
            <span
              key={entry}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-secondary bg-secondary/10 px-3.5 py-1.5 text-sm font-medium text-secondary"
            >
              {entry}
              <button
                type="button"
                onClick={() => onRemove(entry)}
                aria-label={`Remove ${entry}`}
                className="rounded-full p-0.5 transition-colors hover:bg-secondary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomEntryList;
