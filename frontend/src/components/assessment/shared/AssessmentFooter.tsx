import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AssessmentFooterProps {
  onPrev: () => void;
  onNext: () => void;
  onSaveProgress?: () => void;
  isFirstStep: boolean;
  canProceed: boolean;
}

// Previous always calls onPrev; Continue always calls onNext (which is
// gated by canProceedFromStep exactly as before) — identical behavior to
// the original StepNavigation, just restyled and pinned to the bottom, plus
// an optional "Save Progress" action that only persists formData locally
// (sessionStorage) and never touches Supabase/validation/payload logic.
const AssessmentFooter = ({ onPrev, onNext, onSaveProgress, isFirstStep, canProceed }: AssessmentFooterProps) => (
  <div className="sticky bottom-0 z-10 -mx-4 mt-8 border-t border-border bg-background/90 px-4 py-4 backdrop-blur-sm sm:mx-0 sm:rounded-2xl sm:border sm:shadow-soft">
    <div className="flex items-center justify-between gap-3">
      <Button type="button" variant="outline" size="lg" onClick={onPrev} disabled={isFirstStep} className="gap-2 rounded-full">
        <ArrowLeft className="h-4 w-4" />
        Previous
      </Button>

      <div className="flex items-center gap-2">
        {onSaveProgress && (
          <Button type="button" variant="ghost" size="lg" onClick={onSaveProgress} className="hidden gap-2 rounded-full sm:inline-flex">
            <Save className="h-4 w-4" />
            Save Progress
          </Button>
        )}
        <Button
          type="button"
          size="lg"
          onClick={onNext}
          disabled={!canProceed}
          className="group gap-2 rounded-full bg-gradient-cta px-8 shadow-medium transition-all duration-300 hover:shadow-strong hover:brightness-105"
        >
          Continue
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Button>
      </div>
    </div>
  </div>
);

export default AssessmentFooter;
