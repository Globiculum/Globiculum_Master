// Extracted verbatim from AssessmentForm.tsx's dot-progress indicator,
// generalized from a hardcoded 4-step array to any step count.

interface ProgressBarProps {
  totalSteps: number;
  currentStep: number; // 0-indexed
}

const ProgressBar = ({ totalSteps, currentStep }: ProgressBarProps) => {
  return (
    <div className="flex justify-center space-x-2 mb-8">
      {Array.from({ length: totalSteps }, (_, step) => (
        <div
          key={step}
          className={`w-3 h-3 rounded-full transition-all duration-300 ${
            step <= currentStep ? "bg-primary" : "bg-muted"
          }`}
        />
      ))}
    </div>
  );
};

export default ProgressBar;
