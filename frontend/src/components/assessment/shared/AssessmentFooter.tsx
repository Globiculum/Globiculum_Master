import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import PremiumButton from "./PremiumButton";

interface AssessmentFooterProps {
  onPrev: () => void;
  onNext: () => void;
  onSaveProgress?: () => void;
  isFirstStep: boolean;
  canProceed: boolean;
}

// Previous always calls onPrev; Continue always calls onNext (which is
// gated by canProceedFromStep) — shared bottom nav for both assessments,
// plus an optional "Save Progress" action that only persists formData
// locally (sessionStorage) and never touches Supabase/validation/payload
// logic.
const AssessmentFooter = ({ onPrev, onNext, onSaveProgress, isFirstStep, canProceed }: AssessmentFooterProps) => (
  <div className="sticky bottom-0 z-10 -mx-4 mt-8 border-t border-border bg-background/90 px-4 py-4 backdrop-blur-sm sm:mx-0 sm:rounded-2xl sm:border sm:shadow-soft">
    <div className="flex items-center justify-between gap-3">
      <PremiumButton variant="secondary" size="lg" onClick={onPrev} disabled={isFirstStep} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Previous
      </PremiumButton>

      <div className="flex items-center gap-2">
        {onSaveProgress && (
          <PremiumButton
            variant="secondary"
            size="lg"
            onClick={onSaveProgress}
            className="hidden gap-2 border-transparent shadow-none hover:bg-secondary/5 sm:inline-flex"
          >
            <Save className="h-4 w-4" />
            Save Progress
          </PremiumButton>
        )}
        <PremiumButton variant="primary" size="lg" onClick={onNext} disabled={!canProceed} className="gap-2 px-8">
          Continue
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </PremiumButton>
      </div>
    </div>
  </div>
);

export default AssessmentFooter;
