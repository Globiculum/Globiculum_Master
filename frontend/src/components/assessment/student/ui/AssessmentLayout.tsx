import type { ReactNode } from "react";
import AssessmentContainer from "./AssessmentContainer";
import AssessmentHeader from "./AssessmentHeader";
import ProgressStepper, { type StepperStep } from "./ProgressStepper";
import FloatingSidebar from "./FloatingSidebar";
import BottomNavigation from "./BottomNavigation";

interface AssessmentLayoutProps {
  onChangePersona: () => void;
  steps: StepperStep[];
  currentIndex: number;
  onBack: () => void;
  onNext: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  children: ReactNode;
}

// Composes the chrome around whichever step is currently active. The step
// itself (passed as `children`) owns all of its own fields/state/validation —
// this component only arranges header, stepper, sidebar and bottom nav.
const AssessmentLayout = ({
  onChangePersona,
  steps,
  currentIndex,
  onBack,
  onNext,
  isFirstStep,
  isLastStep,
  children,
}: AssessmentLayoutProps) => (
  <AssessmentContainer sidebar={<FloatingSidebar steps={steps} currentIndex={currentIndex} />}>
    <AssessmentHeader
      onChangePersona={onChangePersona}
      title="Student Assessment"
      subtitle="Answer a few questions to generate your personalized readiness report."
    />
    <ProgressStepper steps={steps} currentIndex={currentIndex} />
    <div key={steps[currentIndex]?.id} className="animate-in fade-in-0 slide-in-from-right-2 duration-300">
      {children}
    </div>
    <BottomNavigation onBack={onBack} onNext={onNext} backDisabled={isFirstStep} showNext={!isLastStep} />
  </AssessmentContainer>
);

export default AssessmentLayout;
