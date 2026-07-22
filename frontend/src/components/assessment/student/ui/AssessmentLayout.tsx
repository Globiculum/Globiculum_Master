import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
      currentIndex={currentIndex}
      totalSteps={steps.length}
    />
    <ProgressStepper steps={steps} currentIndex={currentIndex} />
    <AnimatePresence mode="wait">
      <motion.div
        key={steps[currentIndex]?.id}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -16 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
    <BottomNavigation onBack={onBack} onNext={onNext} backDisabled={isFirstStep} showNext={!isLastStep} />
  </AssessmentContainer>
);

export default AssessmentLayout;
