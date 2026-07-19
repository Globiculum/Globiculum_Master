import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Brain, Route } from "lucide-react";

const steps = [
  {
    icon: MapPin,
    number: "01",
    title: "Tell us where your child is coming from",
    description:
      "Select your child's current grade, country, and curriculum (US Common Core, IB, and more).",
    color: "text-primary" as const,
    bg: "bg-primary/10" as const,
  },
  {
    icon: Brain,
    number: "02",
    title: "Our AI maps and bridges the gaps instantly",
    description:
      "Globiculum cross-references thousands of syllabus data points to pinpoint exactly which topics your child already knows — and which need attention before they start school in India.",
    color: "text-secondary" as const,
    bg: "bg-secondary/10" as const,
  },
  {
    icon: Route,
    number: "03",
    title: "Get a personalised learning pathway",
    description:
      "Receive a week-by-week study plan with curated resources, milestone check-ins, and progress tracking — tailored to your timeline before the move.",
    color: "text-accent" as const,
    bg: "bg-accent/10" as const,
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-12 sm:py-16 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-14 max-w-3xl mx-auto">
          <p className="text-secondary font-semibold text-sm uppercase tracking-wider mb-3">
            Simple · Fast · Personalised
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            From signup to study plan in under 10 minutes
          </h2>
          <p className="text-lg text-muted-foreground">
            No lengthy intake forms. No waiting. Just three steps between you and a clear, actionable roadmap.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-5xl mx-auto">
          {steps.map((step) => (
            <Card
              key={step.number}
              className="bg-card border border-border shadow-soft hover:shadow-medium transition-all duration-300 relative overflow-hidden"
            >
              <CardContent className="p-8">
                <span className="absolute top-4 right-4 text-5xl font-extrabold text-muted/60 select-none">
                  {step.number}
                </span>
                <div className={`${step.bg} p-3 rounded-xl w-fit mb-5`}>
                  <step.icon className={`h-7 w-7 ${step.color}`} />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3 pr-10">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
