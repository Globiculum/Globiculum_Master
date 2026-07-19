import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface QuestionCardProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
}

const QuestionCard = ({ label, htmlFor, hint, required, error, children, className }: QuestionCardProps) => (
  <div className={cn("space-y-2", className)}>
    <Label htmlFor={htmlFor} className="text-sm font-semibold text-foreground">
      {label}
      {required && <span className="ml-1 text-warning">*</span>}
    </Label>
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
