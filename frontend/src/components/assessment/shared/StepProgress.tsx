// Minimal, structural-only step progress indicator (no visual polish per
// Sprint 2 scope). Shared so any future flow (Parent included, later) can
// reuse it without duplicating step-count math.

interface StepProgressProps {
  steps: string[];
  currentStep: number;
}

const StepProgress = ({ steps, currentStep }: StepProgressProps) => {
  return (
    <div className="mb-6">
      <p className="text-sm text-muted-foreground mb-2">
        Step {currentStep + 1} of {steps.length}: {steps[currentStep]}
      </p>
      <div className="flex gap-2">
        {steps.map((step, index) => (
          <div
            key={step}
            className={`h-1.5 flex-1 rounded ${index <= currentStep ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>
    </div>
  );
};

export default StepProgress;
