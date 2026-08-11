import { Button } from "@/components/ui/button";
import { ArrowRight, GraduationCap, Globe, ShieldCheck, Zap } from "lucide-react";
import bgHeroImage from "@/assets/bg-hero-image.png";

const STATS = [
  { icon: GraduationCap, value: "25+", label: "Families interviewed", color: "hsl(var(--mint))" },
  { icon: Globe, value: "3", label: "Boards: CBSE · ICSE · IB", color: "hsl(var(--secondary))" },
  { icon: ShieldCheck, value: "4.5/5", label: "Educator-reviewed score", color: "hsl(var(--violet))" },
  { icon: Zap, value: "10 min", label: "Assessment to report", color: "hsl(var(--accent))" },
];

const HeroSection = () => {
  return (
    <section className="bg-primary relative overflow-hidden">
      {/* Hero band — the image (with its own baked-in badges) is sized only to this
          band, not the whole section, so it never has to stretch/crop to also cover
          the stats strip below. That's what was pushing the badges into collision
          with the real stats row. */}
      <div className="relative overflow-hidden py-12 sm:py-16 md:py-28">
        <img
          src={bgHeroImage}
          alt=""
          role="presentation"
          loading="eager"
          className="absolute inset-0 h-full w-full object-cover object-[80%_38%]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/70 to-primary/10" />

        <div className="container relative mx-auto px-4 sm:px-6">
          <div className="max-w-2xl space-y-6 sm:space-y-8">
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
        </div>
      </div>

      {/* Trust stats — separate band on plain background, below the image entirely
          so it can never overlap the badges baked into the hero art above. */}
      <div className="container relative mx-auto px-4 sm:px-6">
        <div className="border-t border-white/10 py-8 sm:py-10">
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
