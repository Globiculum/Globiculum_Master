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
      {/* The hero picture has its badges (CBSE · ICSE · IB, NCERT Chapter Map,
          10-Minute) and the family baked in, so text must never sit on them and
          the crop must never cut them.
          - Below lg there's no room beside the text: the text comes first on the
            plain background and the picture follows as its own block.
          - From lg the picture is the band's background, the family on the
            right. The band is never taller than the picture's own 16:9 shape
            (56.25vw), so object-cover only trims a little off the top and
            bottom, which keeps the bottom badges in view at every width (it
            was 35vw-capped before, which cut them off on large monitors); and
            no taller than 85vh, so it still fits the screen. */}
      <div className="relative flex flex-col justify-center overflow-hidden pt-10 sm:pt-14 lg:min-h-[max(560px,min(56.25vw,85vh))] lg:py-12 xl:py-16">
        <div className="absolute inset-0 hidden lg:block">
          {/* Ultrawide screens (wider than 21:10) can't fit the 16:9 picture's
              top and bottom: there it is shown whole on the right, its empty
              left side fading into the background, instead of cropped. */}
          <img
            src={bgHeroImage}
            alt=""
            aria-hidden="true"
            className="h-full w-full bg-primary object-cover object-[80%_38%] [@media(min-aspect-ratio:21/10)]:object-contain [@media(min-aspect-ratio:21/10)]:object-right [@media(min-aspect-ratio:21/10)]:[mask-image:linear-gradient(to_right,transparent,#000_30%)]"
          />
        </div>
        {/* Darkens the picture's left side under the text. */}
        <div className="absolute inset-0 hidden bg-gradient-to-r from-primary/85 via-secondary/15 to-transparent lg:block" />

        {/* Bottom fade — dissolves the picture into solid bg-primary right before
            the band ends, so it blends into the stats section below. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-14 bg-gradient-to-t from-primary to-transparent lg:block" aria-hidden="true" />

        <div className="container relative mx-auto px-4 sm:px-6">
          <div className="max-w-2xl space-y-6 sm:space-y-8">
            <div className="space-y-4 sm:space-y-6">
              {/* lg steps down to 5xl: beside the picture at 1024-1279px, 6xl
                  would run into the family. Very large screens step up to 7xl
                  so the text keeps up with the picture. */}
              <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-5xl xl:text-6xl min-[1800px]:text-7xl font-bold leading-[1.08] text-primary-foreground text-left">
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
              {/* Beside the picture (lg+) the line length is capped so the text
                  stays clear of the family and the NCERT badge. */}
              <p className="text-base sm:text-lg md:text-xl min-[1800px]:text-2xl text-primary-foreground/85 leading-relaxed max-w-3xl lg:max-w-md xl:max-w-xl min-[1800px]:max-w-2xl text-left">
                A 10-minute assessment. Subject-by-subject gap analysis mapped to your target board's curriculum. A personalised bridge plan — before your child sets foot in an Indian school.
              </p>
            </div>

            {/* StickyMobileCTA watches this: it shows only once these buttons have scrolled away. */}
            <div id="hero-cta" className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-start px-4 sm:px-0">
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

        {/* Below lg: the picture under the text, framed on the family and all
            three badges (its left part is empty sky meant for the desktop
            text). Phones get a 4:3 crop from the right, tablets the whole 16:9.
            Its top and bottom fade into the background. */}
        <div className="relative mt-8 sm:mt-10 lg:hidden" aria-hidden="true">
          <img
            src={bgHeroImage}
            alt=""
            className="aspect-[4/3] w-full object-cover object-right [mask-image:linear-gradient(to_bottom,transparent_0%,#000_10%,#000_93%,transparent_100%)] sm:aspect-[16/9]"
          />
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
