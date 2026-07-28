import { useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CustomSubjectListProps {
  subjects: string[];
  onAdd: (subject: string) => void;
  onRemove: (subject: string) => void;
  placeholder?: string;
}

// Add-multiple-and-remove chip list for free-text "Other" subjects — shared
// by both the Parent and Student Academic Path steps so custom subjects get
// the same input row, chip styling, and Enter/Add/remove behavior in both
// flows. Callers own where the resulting subject strings are stored (both
// flows fold them straight into the existing academicPath string array).
const CustomSubjectList = ({ subjects, onAdd, onRemove, placeholder = "Enter a subject" }: CustomSubjectListProps) => {
  const [draft, setDraft] = useState("");

  const handleAdd = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (subjects.some((subject) => subject.toLowerCase() === trimmed.toLowerCase())) {
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
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={handleKeyDown} placeholder={placeholder} />
        <Button type="button" variant="outline" onClick={handleAdd} disabled={!draft.trim()} className="shrink-0 gap-1.5">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      {subjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {subjects.map((subject) => (
            <span
              key={subject}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-secondary bg-secondary/10 px-3.5 py-1.5 text-sm font-medium text-secondary"
            >
              {subject}
              <button
                type="button"
                onClick={() => onRemove(subject)}
                aria-label={`Remove ${subject}`}
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

export default CustomSubjectList;
