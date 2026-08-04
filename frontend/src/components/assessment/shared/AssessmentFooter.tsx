import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import PremiumButton from "./PremiumButton";

interface AssessmentFooterProps {
  onPrev: () => void;
  onNext: () => void;
  /** Auto-save indicator — progress now persists to sessionStorage automatically
   * as the user types, so there's no manual "Save Progress" action to trigger. */
  saveStatus?: "idle" | "saving" | "saved";
  isFirstStep: boolean;
  canProceed: boolean;
}

// Previous always calls onPrev; Continue always calls onNext (which is
// gated by canProceedFromStep) — shared bottom nav for both assessments.
const AssessmentFooter = ({ onPrev, onNext, saveStatus = "idle", isFirstStep, canProceed }: AssessmentFooterProps) => (
  <div className="sticky bottom-0 z-10 -mx-4 mt-8 border-t border-border bg-background/90 px-4 py-4 backdrop-blur-sm sm:mx-0 sm:rounded-2xl sm:border sm:shadow-soft">
    <div className="flex items-center justify-between gap-3">
      <PremiumButton variant="secondary" size="lg" onClick={onPrev} disabled={isFirstStep} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Previous
      </PremiumButton>

      <div className="flex items-center gap-3">
        <span
          role="status"
          aria-live="polite"
          className={cn(
            "hidden items-center gap-1.5 text-sm text-muted-foreground transition-opacity duration-300 sm:inline-flex",
            saveStatus === "idle" ? "opacity-0" : "opacity-100"
          )}
        >
          {saveStatus === "saving" && (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Saving…
            </>
          )}
          {saveStatus === "saved" && (
            <>
              <Check className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
              Saved
            </>
          )}
        </span>
        <PremiumButton variant="primary" size="lg" onClick={onNext} disabled={!canProceed} className="gap-2 px-8">
          Continue
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </PremiumButton>
      </div>
    </div>
  </div>
);

export default AssessmentFooter;
