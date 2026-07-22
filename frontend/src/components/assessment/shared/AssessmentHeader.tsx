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
        className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-sm font-semibold text-accent-foreground shadow-soft transition-colors hover:bg-accent/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
