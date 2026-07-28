import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import AssessmentBackground from "./AssessmentBackground";

// Presentational shell shared by both assessments: soft decorative
// background + a responsive two-column grid (main content / sticky
// sidebar). No form state or business logic lives here.

interface AssessmentContainerProps {
  children: ReactNode;
  sidebar?: ReactNode;
}

const AssessmentContainer = ({ children, sidebar }: AssessmentContainerProps) => {
  return (
    <div className="relative">
      <AssessmentBackground />

      <div className={cn("grid grid-cols-1 items-start gap-8 lg:gap-10", sidebar && "lg:grid-cols-[1fr_336px]")}>
        <div className="min-w-0">{children}</div>
        {sidebar && <div className="lg:sticky lg:top-24">{sidebar}</div>}
      </div>
    </div>
  );
};

export default AssessmentContainer;
