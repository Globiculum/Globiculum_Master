import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import heroChild from "@/assets/hero-child.webp";

const HeroSection = () => {
  return (
    <section className="py-12 sm:py-16 md:py-28 bg-gradient-hero relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />

      <div className="container mx-auto px-4 sm:px-6 relative">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-8">
          <div className="max-w-4xl space-y-6 sm:space-y-8">
            <div className="space-y-3 sm:space-y-4">
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold leading-[1.05] text-primary-foreground text-left">
                <span className="text-primary-foreground">Moving back</span>
                <br />
                <span className="bg-gradient-mint bg-clip-text text-transparent font-extrabold">to India?</span>
                <br />
                <span className="text-primary-foreground">Know</span> <span className="bg-gradient-mint bg-clip-text text-transparent font-extrabold">exactly</span>
                <br />
                where your child
                <br />
                <span className="bg-gradient-mint bg-clip-text text-transparent">stands.</span>
              </h1>
              <div className="space-y-2">
                <p className="text-base sm:text-lg md:text-xl text-primary-foreground/85 leading-relaxed max-w-3xl text-left">
                  A 10-minute assessment that maps your child's learning subject-by-subject against the Indian curriculum.
                </p>
                <p className="text-base sm:text-lg md:text-xl text-primary-foreground/85 leading-relaxed max-w-3xl text-left">
                  Receive a personalized curriculum gap report before your child enters an Indian school.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-start">
              <Button
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90 transition-all duration-300 rounded-full font-semibold text-sm sm:text-base px-6 sm:px-8 w-full sm:w-auto"
                asChild
              >
                <a href="/begin-journey">
                  Get Free Report
                  <ArrowRight className="ml-2 h-5 w-5" />
                </a>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-accent text-accent hover:bg-accent/10 transition-colors rounded-full font-semibold w-full sm:w-auto"
                asChild
              >
                <a href="#how-it-works">See how it works</a>
              </Button>
            </div>
          </div>

          {/* Hero image — decorative, presentational only */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative w-[85%] sm:w-[75%] lg:w-full lg:max-w-md">
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
