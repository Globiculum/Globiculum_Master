import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import InfoTooltip from "./InfoTooltip";

// Per-field wrapper (label + tooltip + hint + error + input) shared by every
// step in both the Parent and Student assessments — same label/required/
// optional treatment, same animated error, same caption-scale hint text.

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
  error?: string;
  children: ReactNode;
  className?: string;
}

const QuestionCard = ({ label, htmlFor, tooltip, hint, required, optional, error, children, className }: QuestionCardProps) => (
  <div className={cn("space-y-2.5", className)}>
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
    {children}
    <AnimatePresence>
      {error && (
        <motion.p
          role="alert"
          className="text-sm font-medium text-destructive"
          initial={{ opacity: 0, y: -4, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {error}
        </motion.p>
      )}
    </AnimatePresence>
  </div>
);

export default QuestionCard;
