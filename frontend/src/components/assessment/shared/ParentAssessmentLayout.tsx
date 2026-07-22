import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Presentational shell for the Parent assessment — deliberately identical to
// the Student assessment's AssessmentContainer (student/ui/AssessmentContainer.tsx):
// soft decorative background + a responsive two-column grid (main content /
// sticky sidebar), no outer card wrapping the whole flow. Each step supplies
// its own card via SectionContainer's "card" variant, matching Student's
// per-step SectionCard pattern exactly.

interface ParentAssessmentLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
}

const ParentAssessmentLayout = ({ children, sidebar }: ParentAssessmentLayoutProps) => {
  return (
    <div className="relative">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-violet/10 blur-3xl" />
        <div className="absolute top-40 -right-32 h-96 w-96 rounded-full bg-secondary/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-mint/10 blur-3xl" />
      </div>

      <div className={cn("grid grid-cols-1 items-start gap-8", sidebar && "lg:grid-cols-[1fr_320px]")}>
        <div className="min-w-0">{children}</div>
        {sidebar && <div className="lg:sticky lg:top-24">{sidebar}</div>}
      </div>
    </div>
  );
};

export default ParentAssessmentLayout;
