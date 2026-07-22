import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  <div className={cn("space-y-2.5", className)}>
    <Label htmlFor={htmlFor} className="text-sm font-semibold text-foreground">
      {label}
      {required && <span className="ml-1 text-warning">*</span>}
    </Label>
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
