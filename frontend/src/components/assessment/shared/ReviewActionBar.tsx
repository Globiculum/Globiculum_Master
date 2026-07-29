import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import PremiumButton from "./PremiumButton";

// Sticky bottom action bar for the Review step of both assessments —
// Previous (always enabled unless a submission is in flight) + a single
// primary submit action whose label/loading state is owned by the caller.

interface ReviewActionBarProps {
  onPrev: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitLabel: ReactNode;
  disabled?: boolean;
}

const ReviewActionBar = ({ onPrev, onSubmit, isSubmitting, submitLabel, disabled }: ReviewActionBarProps) => (
  <div className="sticky bottom-0 z-10 -mx-4 mt-8 border-t border-border bg-background/90 px-4 py-4 backdrop-blur-sm sm:mx-0 sm:rounded-2xl sm:border sm:shadow-soft">
    <div className="flex items-center justify-between gap-3">
      <PremiumButton variant="secondary" size="lg" onClick={onPrev} disabled={isSubmitting || disabled} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Previous
      </PremiumButton>
      <PremiumButton variant="primary" size="lg" onClick={onSubmit} loading={isSubmitting} disabled={disabled} className="gap-2 px-8">
        {submitLabel}
      </PremiumButton>
    </div>
  </div>
);

export default ReviewActionBar;
