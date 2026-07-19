import { Button } from "@/components/ui/button";
import StepFooter from "./StepFooter";

// Previous/Next button pair, extracted verbatim from AssessmentForm.tsx's
// navigation row (used for the non-final steps; the final step's submit
// button has different label/disabled logic and is composed separately).

interface StepNavigationProps {
  onPrev: () => void;
  onNext: () => void;
  isFirstStep: boolean;
  canProceed: boolean;
}

const StepNavigation = ({ onPrev, onNext, isFirstStep, canProceed }: StepNavigationProps) => {
  return (
    <StepFooter>
      <Button variant="outline" onClick={onPrev} disabled={isFirstStep} className="min-w-24">
        Previous
      </Button>
      <Button onClick={onNext} disabled={!canProceed}>
        Next Step
      </Button>
    </StepFooter>
  );
};

export default StepNavigation;
