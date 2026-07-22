import { ArrowLeft } from "lucide-react";

// Compact header — deliberately identical to the Student assessment's
// AssessmentHeader (student/ui/AssessmentHeader.tsx). No illustration, no
// long paragraph, no info box: just the "Change persona" link, title, and
// subtitle, matching Student's visual rhythm exactly.

interface AssessmentHeaderProps {
  onChangePersona: () => void;
  title: string;
  subtitle: string;
  showChangePersona?: boolean;
}

const AssessmentHeader = ({ onChangePersona, title, subtitle, showChangePersona = true }: AssessmentHeaderProps) => (
  <div className="mb-8">
    {showChangePersona && (
      <button
        type="button"
        onClick={onChangePersona}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-secondary"
      >
        <ArrowLeft className="h-4 w-4" />
        Change persona
      </button>
    )}
    <h1 className="mt-3 text-3xl font-bold text-foreground md:text-4xl">{title}</h1>
    <p className="mt-2 text-base text-muted-foreground md:text-lg">{subtitle}</p>
  </div>
);

export default AssessmentHeader;
