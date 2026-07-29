import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ReviewRow {
  label: string;
  value: string;
}

export interface ReviewSectionData {
  stepIndex: number;
  title: string;
  rows: ReviewRow[];
}

interface ReviewSectionProps {
  section: ReviewSectionData;
  onEditStep: (index: number) => void;
}

// Presentational card for one Review-page section — shared by both the
// Parent and Student Review steps so the card layout, spacing, and Edit
// action are identical across both flows.
const ReviewSection = ({ section, onEditStep }: ReviewSectionProps) => (
  <div className="rounded-xl border border-border bg-muted/40 p-4">
    <div className="mb-3 flex items-center justify-between">
      <h4 className="text-sm font-semibold text-foreground">{section.title}</h4>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onEditStep(section.stepIndex)}
        className="h-auto gap-1 px-2 py-1 text-xs text-secondary hover:text-secondary"
      >
        <Pencil className="h-3 w-3" />
        Edit
      </Button>
    </div>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {section.rows.map((row) => (
        <div key={row.label}>
          <p className="text-xs text-muted-foreground">{row.label}</p>
          <p className="text-sm font-medium text-foreground">{row.value}</p>
        </div>
      ))}
    </div>
  </div>
);

export default ReviewSection;
