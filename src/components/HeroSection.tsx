import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import TypewriterCycle from "@/components/TypewriterCycle";

const HeroSection = () => {
  return (
    <section className="py-20 md:py-28 bg-gradient-hero relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />

      <div className="container mx-auto px-4 relative">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-6">
            <p className="text-lg md:text-xl text-accent font-semibold tracking-wide uppercase">
              Don't Let the Move Set Your Child Behind
            </p>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight text-primary-foreground">
              Bridge Your Child's Education
              <br />
              Between{" "}
              <TypewriterCycle />
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/85 leading-relaxed max-w-3xl mx-auto">
              Seamless academic transitions to India — Globiculum ensures a seamless shift with tailored gap analysis and customized learning pathways designed for long-term success.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90 transition-all duration-300 rounded-full font-semibold text-base px-8"
              asChild
            >
              <a href="/begin-journey">
                Get Curriculum Gap Analysis Report
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 transition-colors rounded-full"
              asChild
            >
              <a href="#how-it-works">How It Works</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
