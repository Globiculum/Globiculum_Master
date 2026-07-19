import { Target } from "lucide-react";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// Extracted verbatim from AssessmentForm.tsx's CardHeader block.

interface AssessmentHeaderProps {
  stepNumber: number;
  totalSteps: number;
  title: string;
  description: string;
}

const AssessmentHeader = ({ stepNumber, totalSteps, title, description }: AssessmentHeaderProps) => {
  return (
    <CardHeader className="text-center pb-6">
      <CardTitle className="flex items-center justify-center gap-2 text-2xl">
        <Target className="h-6 w-6 text-primary" />
        {title} - Step {stepNumber} of {totalSteps}
      </CardTitle>
      <CardDescription className="text-base">{description}</CardDescription>
    </CardHeader>
  );
};

export default AssessmentHeader;
