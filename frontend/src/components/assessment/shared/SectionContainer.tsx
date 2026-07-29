import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import InfoTooltip from "./InfoTooltip";
import FieldError from "./FieldError";

// Compact, left-aligned sub-heading used to group fields *within* a step's
// SectionCard. Parent steps have more distinct field groups per step than
// Student's, so this exists purely to keep those groups readable without
// stacking a card-inside-a-card. Also doubles as a validated field-group
// wrapper (required indicator + invalid ring + error message) for groups
// that already have their own heading here and don't need a second
// QuestionCard label above them (e.g. School Stage cards, Biggest Concerns).

interface SectionContainerProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  required?: boolean;
  /** Validation message — also marks the group invalid (red ring +
   * scroll/focus target) and renders the message beneath it. */
  error?: string;
}

const SectionContainer = ({ icon: Icon, title, description, children, className, required, error }: SectionContainerProps) => (
  <div className={className ?? "space-y-4"} data-field-invalid={error ? "true" : undefined} tabIndex={error ? -1 : undefined}>
    <div className="flex items-center gap-2">
      {Icon && <Icon className="h-4 w-4 text-secondary" />}
      <h3 className="text-base font-bold text-foreground">
        {title}
        {required && <span className="ml-1 text-warning">*</span>}
      </h3>
      {description && <InfoTooltip description={description} />}
    </div>
    <div className={cn(error && "rounded-xl ring-2 ring-destructive/60 ring-offset-2 ring-offset-background transition-shadow duration-200")}>
      {children}
    </div>
    <FieldError message={error} />
  </div>
);

export default SectionContainer;
