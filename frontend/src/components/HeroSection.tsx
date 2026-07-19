import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import TypewriterCycle from "@/components/TypewriterCycle";

const HeroSection = () => {
  return (
    <section className="py-12 sm:py-16 md:py-28 bg-gradient-hero relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />

      <div className="container mx-auto px-4 sm:px-6 relative">
        <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
          <div className="space-y-4 sm:space-y-6">
            <p className="text-sm sm:text-lg md:text-xl text-accent font-semibold tracking-wide uppercase">
              Don't Let the Move Set Your Child Behind
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold leading-tight sm:leading-snug md:leading-snug text-primary-foreground text-center">
              Bridge Your Child's Education
              <br />
              Between{" "}
              <TypewriterCycle />
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-primary-foreground/85 leading-relaxed max-w-3xl mx-auto text-center">
              Seamless academic transitions to India — Globiculum ensures a seamless shift with tailored gap analysis and customized learning pathways designed for long-term success.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-center px-4 sm:px-0">
            <Button
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90 transition-all duration-300 rounded-full font-semibold text-sm sm:text-base px-6 sm:px-8 w-full sm:w-auto"
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
              className="border-accent text-accent hover:bg-accent/10 transition-colors rounded-full font-semibold w-full sm:w-auto"
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
