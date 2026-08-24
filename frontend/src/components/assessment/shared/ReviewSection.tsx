import editIcon from "@/assets/icons-3d/edit.png";

export interface ReviewRow {
  label: string;
  value: string;
}

export interface ReviewSectionData {
  stepIndex: number;
  title: string;
  rows: ReviewRow[];
  /** Optional 3D icon (frontend/src/assets/icons-3d/) shown in a small badge
   * next to the title — matches the icon already used for this step's own
   * SectionCard header elsewhere in the flow, so Review reads as the same
   * step, not a generic summary list. */
  icon?: string;
}

interface ReviewSectionProps {
  section: ReviewSectionData;
  onEditStep: (index: number) => void;
}

// Presentational card for one Review-page section — shared by both the
// Parent and Student Review steps so the card layout, spacing, and Edit
// action are identical across both flows.
const ReviewSection = ({ section, onEditStep }: ReviewSectionProps) => (
  <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {section.icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary/10">
            <img src={section.icon} className="h-5 w-5 object-contain" alt="" aria-hidden="true" draggable={false} />
          </span>
        )}
        <h4 className="truncate text-base font-bold text-foreground">{section.title}</h4>
      </div>
      <button
        type="button"
        onClick={() => onEditStep(section.stepIndex)}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-secondary/30 px-3 py-1.5 text-xs font-semibold text-secondary transition-colors hover:bg-secondary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <img src={editIcon} className="h-3 w-3 object-contain" alt="" draggable={false} />
        Edit
      </button>
    </div>
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
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
