import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import InfoTooltip from "./InfoTooltip";
import FieldError from "./FieldError";

// Per-field wrapper (label + tooltip + hint + error + input) shared by every
// step in both the Parent and Student assessments — same label/required/
// optional treatment, same animated error, same caption-scale hint text,
// same invalid-state ring around the field's content.

interface QuestionCardProps {
  label?: string;
  htmlFor?: string;
  /** Short 1-2 sentence explanation shown in an info-icon tooltip next to
   * the label — the only place question-level guidance should live. Keeps
   * the field itself uncluttered instead of stacking helper copy below it. */
  tooltip?: string;
  hint?: string;
  required?: boolean;
  /** Renders "(Optional)" inline next to the label instead of as a separate
   * line below it — keeps this field's header the same height as sibling
   * fields in the same row that have neither a hint nor this flag, so
   * inputs placed side-by-side (e.g. in a grid) stay vertically aligned. */
  optional?: boolean;
  /** Validation message — also marks the field invalid (red ring + scroll/
   * focus target) and renders the message beneath the field. */
  error?: string;
  /** Marks the field invalid (red ring + scroll/focus target) without
   * rendering its own message — for composite fields (e.g. first/last name)
   * whose sub-parts each render their own FieldError instead. */
  invalid?: boolean;
  children: ReactNode;
  className?: string;
}

const QuestionCard = ({
  label,
  htmlFor,
  tooltip,
  hint,
  required,
  optional,
  error,
  invalid,
  children,
  className,
}: QuestionCardProps) => {
  const isInvalid = invalid || !!error;

  return (
    <div
      className={cn("space-y-2.5", className)}
      data-field-invalid={isInvalid ? "true" : undefined}
      tabIndex={isInvalid ? -1 : undefined}
    >
      {label && (
        <div className="flex items-center gap-1.5">
          <Label htmlFor={htmlFor} className="text-sm font-semibold text-foreground">
            {label}
            {required && <span className="ml-1 text-warning">*</span>}
            {optional && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(Optional)</span>}
          </Label>
          {tooltip && <InfoTooltip description={tooltip} />}
        </div>
      )}
      {hint && <p className="text-caption text-muted-foreground">{hint}</p>}
      <div
        className={cn(
          isInvalid && "rounded-xl ring-2 ring-destructive/60 ring-offset-2 ring-offset-background transition-shadow duration-200"
        )}
      >
        {children}
      </div>
      <FieldError message={error} />
    </div>
  );
};

export default QuestionCard;
