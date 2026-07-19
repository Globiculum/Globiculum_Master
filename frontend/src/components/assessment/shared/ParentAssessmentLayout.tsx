import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Presentational shell for the Parent assessment: soft decorative background
// + a responsive two-column grid (main assessment card / sticky sidebar). No
// form state or business logic lives here — the single-heading hero now
// lives in AssessmentHero (rendered once by BeginJourney.tsx), so this layout
// no longer duplicates a second title/subtitle above the card.

interface ParentAssessmentLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
}

const ParentAssessmentLayout = ({ children, sidebar }: ParentAssessmentLayoutProps) => {
  return (
    <div className="relative">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 left-1/4 h-80 w-80 rounded-full bg-mint/10 blur-3xl" />
        <div className="absolute bottom-0 -right-24 h-80 w-80 rounded-full bg-violet/10 blur-3xl" />
      </div>

      <div className={cn("grid grid-cols-1 items-start gap-8", sidebar && "lg:grid-cols-[1fr_320px]")}>
        <Card className="min-w-0 rounded-2xl border-0 bg-gradient-card p-6 shadow-medium md:p-10">{children}</Card>
        {sidebar && <div className="lg:sticky lg:top-24">{sidebar}</div>}
      </div>
    </div>
  );
};

export default ParentAssessmentLayout;
