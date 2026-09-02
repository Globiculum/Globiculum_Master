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
    <section id="main-content" tabIndex={-1} className="bg-primary relative overflow-hidden outline-none">
      {/* Hero band — the image (with its own baked-in badges) is sized only to this
          band, not the whole section, so it never has to stretch/crop to also cover
          the stats strip below. That's what was pushing the badges into collision
          with the real stats row. Height is viewport-relative (clamped, not a fixed
          px value) so the band adapts to laptop/desktop/large-monitor heights instead
          of over- or under-filling the screen; content is centered within it so the
          adaptive height doesn't just pad out empty space below the text. */}
      {/* The 860px ceiling only binds on screens taller than ~1011px, which is
          most desktop monitors — so on those, band height was effectively
          fixed while width kept growing with the viewport, making the crop
          more severe (eating into the badges/icons near the top of the
          image) the wider/larger the screen. max(860px, 35vw) leaves normal
          screens untouched (35vw < 860px below ~2457px wide) but raises the
          ceiling in step with width beyond that, so very large/wide monitors
          get a taller band instead of an ever-worse crop. */}
      <div className="relative flex min-h-[clamp(560px,85vh,max(860px,35vw))] flex-col justify-center overflow-hidden py-12 sm:py-16 md:py-20">
        {/* Full-bleed — spans the whole section width (no max-width cap) so the
            image reaches the viewport edges on wide screens instead of leaving
            bg-primary strips on either side. Going full-bleed makes the band's
            aspect ratio much wider relative to its height than the image's own
            source ratio, so object-cover has to crop more vertically to still
            fill the width — that crop was eating the badges baked into the
            bottom of the image. The taller min-height above (and the object-
            position Y nudged down here) both exist to give it enough vertical
            room that the crop doesn't reach that far down. */}
        <div className="absolute inset-0">
          <img
            src={bgHeroImage}
            alt=""
            aria-hidden="true"
            className="h-full w-full bg-primary object-cover object-[80%_38%]"
          />
        </div>
        {/* Below lg, the text column (max-w-2xl) exceeds the viewport width, so the
            left-to-right desktop gradient (tuned for text confined to the left ~45%)
            leaves the right portion of wrapped text sitting over a barely-dimmed part
            of the image. A top-to-bottom scrim reads correctly once text spans the
            full width; the left-to-right treatment only takes over once there's
            actually room for the image to read as a distinct right-hand visual.
            The mid stop leans on Academic Teal rather than navy so the band
            reads as branded teal, not a flat navy wash over the footage. */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/85 via-secondary/25 to-primary/10 lg:bg-gradient-to-r lg:from-primary/85 lg:via-secondary/15 lg:to-transparent" />

        {/* Bottom fade — dissolves the footage into solid bg-primary right before
            the band ends, so it blends into the stats section below instead of
            cutting off hard against it (the seam became far more visible once the
            video went full-bleed edge-to-edge instead of sitting in a 1400px column
            with navy on either side to soften it). */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-primary to-transparent sm:h-14" aria-hidden="true" />

        <div className="relative mx-auto w-full max-w-[1920px] px-[clamp(1rem,4vw,5rem)]">
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
                className="border-accent bg-transparent text-accent hover:bg-accent/10 hover:text-accent transition-colors rounded-full font-semibold w-full sm:w-auto"
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
      <div className="relative mx-auto w-full max-w-[1920px] px-[clamp(1rem,4vw,5rem)]">
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
