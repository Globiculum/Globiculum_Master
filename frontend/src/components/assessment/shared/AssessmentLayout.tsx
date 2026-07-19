import { ReactNode } from "react";
import { Card } from "@/components/ui/card";

// Faithful extraction of the outer wrapper markup that used to live inline
// at the bottom of AssessmentForm.tsx — same classes, same structure, no
// visual changes.

interface AssessmentLayoutProps {
  title: ReactNode;
  subtitle: ReactNode;
  children: ReactNode;
}

const AssessmentLayout = ({ title, subtitle, children }: AssessmentLayoutProps) => {
  return (
    <section id="assessment" className="py-10 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4 overflow-y-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{title}</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>
        </div>

        <Card className="max-w-4xl mx-auto shadow-medium bg-gradient-card border-0">{children}</Card>
      </div>
    </section>
  );
};

export default AssessmentLayout;
