import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import AssessmentContainer from "../../shared/AssessmentContainer";
import AssessmentHeader from "../../shared/AssessmentHeader";
import AssessmentStepper, { type AssessmentStepperStep as StepperStep } from "../../shared/AssessmentStepper";
import ProgressSidebar from "../../shared/ProgressSidebar";
import AssessmentFooter from "../../shared/AssessmentFooter";
import StepCelebrationToast from "./StepCelebrationToast";

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
  <AssessmentContainer sidebar={<ProgressSidebar steps={steps} currentIndex={currentIndex} />}>
    <StepCelebrationToast stepIndex={currentIndex} />
    <AssessmentHeader
      onChangePersona={onChangePersona}
      title="Student Assessment"
      subtitle="Answer a few questions to generate your personalized readiness report."
      currentIndex={currentIndex}
      totalSteps={steps.length}
    />
    <AssessmentStepper steps={steps} currentIndex={currentIndex} />
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
    {/* Hidden on the Review step (isLastStep) — StudentReviewStep supplies its
        own sticky ReviewActionBar instead, mirroring Parent's equivalent gate. */}
    {!isLastStep && <AssessmentFooter onPrev={onBack} onNext={onNext} isFirstStep={isFirstStep} canProceed />}
  </AssessmentContainer>
);

export default AssessmentLayout;
