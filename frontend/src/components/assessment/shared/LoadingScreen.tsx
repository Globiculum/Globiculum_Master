import { Loader2 } from "lucide-react";

// The exact Validating/Analyzing button-content states used by the
// original submit button — extracted so both flows show identical
// in-progress states without duplicating the conditional.

interface LoadingScreenProps {
  isValidating: boolean;
  isSubmitting: boolean;
  idleLabel: string;
}

const LoadingScreen = ({ isValidating, isSubmitting, idleLabel }: LoadingScreenProps) => {
  if (isValidating) {
    return (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Validating...
      </>
    );
  }
  if (isSubmitting) {
    return (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Analyzing...
      </>
    );
  }
  return <>{idleLabel}</>;
};

export default LoadingScreen;
