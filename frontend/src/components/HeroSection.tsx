import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import TypewriterCycle from "@/components/TypewriterCycle";
import heroChild from "@/assets/hero-child.webp";

const HeroSection = () => {
  return (
    <section className="py-12 sm:py-16 md:py-28 bg-gradient-hero relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />

      <div className="container mx-auto px-4 sm:px-6 relative">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-8">
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

          {/* Hero image — decorative, presentational only */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative w-[80%] sm:w-[70%] lg:w-full lg:max-w-sm">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10 scale-125"
                style={{
                  background:
                    "radial-gradient(circle at center, hsl(var(--secondary) / 0.28) 0%, hsl(var(--secondary) / 0.12) 35%, transparent 75%)",
                }}
              />

              <img
                src={heroChild}
                alt=""
                role="presentation"
                loading="lazy"
                className="relative mx-auto w-full select-none animate-hero-float"
                style={{
                  objectFit: "contain",
                  WebkitMaskImage:
                    "radial-gradient(circle, rgba(0,0,0,1) 38%, rgba(0,0,0,0.85) 52%, rgba(0,0,0,0.4) 68%, transparent 88%)",
                  maskImage:
                    "radial-gradient(circle, rgba(0,0,0,1) 38%, rgba(0,0,0,0.85) 52%, rgba(0,0,0,0.4) 68%, transparent 88%)",
                  filter: "drop-shadow(0 35px 80px rgba(0,0,0,0.35)) contrast(1.05) saturate(1.05)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
