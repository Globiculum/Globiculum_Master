import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Per-field wrapper (label + hint + error + input) used across all 5 Parent
// steps for a consistent, premium field layout. Previously unused in this
// file with a different (section-heading) contract — no existing call sites
// depended on the old shape, so this redefinition is safe.

interface QuestionCardProps {
  label?: string;
  htmlFor?: string;
  hint?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
}

const QuestionCard = ({ label, htmlFor, hint, required, error, children, className }: QuestionCardProps) => (
  <div className={cn("space-y-2", className)}>
    {label && (
      <Label htmlFor={htmlFor} className="text-sm font-semibold text-foreground">
        {label}
        {required && <span className="ml-1 text-warning">*</span>}
      </Label>
    )}
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    {children}
    {error && (
      <p role="alert" className="text-sm font-medium text-destructive">
        {error}
      </p>
    )}
  </div>
);

export default QuestionCard;
