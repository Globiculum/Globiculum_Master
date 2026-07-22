import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface EducationHistoryEntry {
  fromGrade: string;
  toGrade: string;
  country: string;
  curriculum: string;
}

interface EducationHistoryListProps {
  entries: EducationHistoryEntry[];
  onChange: (entries: EducationHistoryEntry[]) => void;
}

const GRADES = Array.from({ length: 12 }, (_, i) => String(i + 1));

const EMPTY_ENTRY: EducationHistoryEntry = { fromGrade: "", toGrade: "", country: "", curriculum: "" };

// Parent-only repeatable section — each row captures a prior schooling
// stretch (From Grade / To Grade / Country / Curriculum). Composed entirely
// from existing shared UI primitives, no new visual language introduced.
const EducationHistoryList = ({ entries, onChange }: EducationHistoryListProps) => {
  const updateEntry = (index: number, field: keyof EducationHistoryEntry, value: string) => {
    const next = entries.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry));
    onChange(next);
  };

  const addEntry = () => onChange([...entries, { ...EMPTY_ENTRY }]);
  const removeEntry = (index: number) => onChange(entries.filter((_, i) => i !== index));

  return (
    <div className="space-y-3">
      {entries.map((entry, index) => (
        <div key={index} className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-card/50 p-4 shadow-soft sm:grid-cols-[1fr_1fr_1.4fr_1.4fr_auto] sm:items-end">
          <div>
            <Label htmlFor={`edu-history-from-${index}`} className="text-xs">From Grade</Label>
            <Select value={entry.fromGrade} onValueChange={(value) => updateEntry(index, "fromGrade", value)}>
              <SelectTrigger id={`edu-history-from-${index}`}>
                <SelectValue placeholder="Grade" />
              </SelectTrigger>
              <SelectContent>
                {GRADES.map((g) => (
                  <SelectItem key={g} value={g}>Grade {g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor={`edu-history-to-${index}`} className="text-xs">To Grade</Label>
            <Select value={entry.toGrade} onValueChange={(value) => updateEntry(index, "toGrade", value)}>
              <SelectTrigger id={`edu-history-to-${index}`}>
                <SelectValue placeholder="Grade" />
              </SelectTrigger>
              <SelectContent>
                {GRADES.map((g) => (
                  <SelectItem key={g} value={g}>Grade {g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor={`edu-history-country-${index}`} className="text-xs">Country</Label>
            <Input
              id={`edu-history-country-${index}`}
              placeholder="e.g. India"
              value={entry.country}
              onChange={(e) => updateEntry(index, "country", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`edu-history-curriculum-${index}`} className="text-xs">Curriculum</Label>
            <Input
              id={`edu-history-curriculum-${index}`}
              placeholder="e.g. CBSE"
              value={entry.curriculum}
              onChange={(e) => updateEntry(index, "curriculum", e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeEntry(index)}
            aria-label="Remove this entry"
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addEntry} className="gap-1.5 rounded-full">
        <Plus className="h-4 w-4" />
        Add another school
      </Button>
    </div>
  );
};

export default EducationHistoryList;
