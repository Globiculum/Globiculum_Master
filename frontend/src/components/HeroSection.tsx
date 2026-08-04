import { Button } from "@/components/ui/button";
import { ArrowRight, GraduationCap, Globe, ShieldCheck, Zap } from "lucide-react";
import heroChild from "@/assets/family_hero image.jpeg";

const STATS = [
  { icon: GraduationCap, value: "25+", label: "Families interviewed", color: "hsl(var(--mint))" },
  { icon: Globe, value: "3", label: "Boards: CBSE · ICSE · IB", color: "hsl(var(--secondary))" },
  { icon: ShieldCheck, value: "4.5/5", label: "Educator-reviewed score", color: "hsl(var(--violet))" },
  { icon: Zap, value: "10 min", label: "Assessment to report", color: "hsl(var(--accent))" },
];

const HeroSection = () => {
  return (
    <section className="py-12 sm:py-16 md:py-28 bg-gradient-hero relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />

      <div className="container mx-auto px-4 sm:px-6 relative">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-8">
          <div className="max-w-4xl space-y-6 sm:space-y-8">
            <div className="space-y-4 sm:space-y-6">
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold leading-[1.08] text-primary-foreground text-left">
                <span className="text-primary-foreground">Moving back</span>
                <br />
                <span className="bg-gradient-mint bg-clip-text text-transparent font-extrabold">to India?</span>
                <br />
                <span className="text-primary-foreground">Know</span>{" "}
                <span className="bg-gradient-mint bg-clip-text text-transparent font-extrabold">exactly</span>
                <br />
                <span className="text-primary-foreground">where your child</span>
                <br />
                <span className="bg-gradient-mint bg-clip-text text-transparent font-extrabold">stands.</span>
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-primary-foreground/85 leading-relaxed max-w-3xl text-left">
                A 10-minute assessment. Subject-by-subject gap analysis mapped to your target board's curriculum. A personalised bridge plan — before your child sets foot in an Indian school.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-start px-4 sm:px-0">
              <Button
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/30 transition-all duration-300 rounded-full font-semibold text-sm sm:text-base px-6 sm:px-8 w-full sm:w-auto"
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
            <div className="relative w-[95%] sm:w-[85%] lg:w-full lg:max-w-2xl">
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

        {/* Trust stats — full-width strip beneath the two-column hero content */}
        <div className="mt-12 border-t border-white/10 pt-8 sm:mt-16 sm:pt-10">
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4 sm:gap-y-0">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-3 sm:border-l sm:border-white/10 sm:pl-6 sm:first:border-l-0 sm:first:pl-0"
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${stat.color}26`, color: stat.color }}
                >
                  <stat.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-xl font-bold leading-tight text-primary-foreground">{stat.value}</div>
                  <div className="text-xs text-primary-foreground/70 sm:text-sm">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
