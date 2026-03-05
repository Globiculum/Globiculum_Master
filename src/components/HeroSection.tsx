import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, BookOpen, Target, TrendingUp } from "lucide-react";
import heroImage from "@/assets/hero-bridge-mission.jpg";
import alignmentReportPreview from "@/assets/alignment-report-preview.png";
import TypewriterCycle from "@/components/TypewriterCycle";

const HeroSection = () => {
  return (
    <section className="py-20 bg-gradient-hero relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
      
      <div className="container mx-auto px-4 relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold leading-tight text-primary-foreground">
                Prepare for{" "}
                <TypewriterCycle />
                <br />
                with Confidence
              </h1>
              <p className="text-xl text-primary-foreground/90 leading-relaxed">
                Equip your child with the confidence to transition back to India — and give them the best of both worlds: Indian foundational rigor and US-style conceptual mastery.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 transition-all duration-300 rounded-full font-semibold" asChild>
                <a href="/begin-journey">
                  Get My Curriculum Gap Analysis Report
                  <ArrowRight className="ml-2 h-5 w-5" />
                </a>
              </Button>
              <Button variant="outline" size="lg" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 transition-colors rounded-full" asChild>
                <a href="/begin-journey">How It Works</a>
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-8">
              <Card className="p-4 text-center bg-card/95 backdrop-blur-sm border-0 shadow-soft">
                <BookOpen className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-primary">US↔India</div>
                <div className="text-sm text-muted-foreground">Dual Prep</div>
              </Card>
              <Card className="p-4 text-center bg-card/95 backdrop-blur-sm border-0 shadow-soft">
                <Target className="h-8 w-8 text-secondary mx-auto mb-2" />
                <div className="text-2xl font-bold text-secondary">SAT+Boards</div>
                <div className="text-sm text-muted-foreground">Excellence</div>
              </Card>
              <Card className="p-4 text-center bg-card/95 backdrop-blur-sm border-0 shadow-soft">
                <TrendingUp className="h-8 w-8 text-accent mx-auto mb-2" />
                <div className="text-2xl font-bold text-accent">24/7</div>
                <div className="text-sm text-muted-foreground">Family Support</div>
              </Card>
            </div>
          </div>

          <div className="space-y-6">
            {/* Mission-Centric Hero Image */}
            <div className="relative rounded-2xl overflow-hidden shadow-strong">
              <img 
                src={heroImage} 
                alt="EduSetu — bridging US and Indian education: alignment, dual-path learning, and repatriation readiness."
                className="w-full h-auto"
                role="img"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent" />
            </div>

            {/* Sample Alignment Report Preview */}
            <div className="relative">
              <div className="bg-card rounded-2xl shadow-strong p-4 border border-border overflow-hidden">
                <img 
                  src={alignmentReportPreview}
                  srcSet={`${alignmentReportPreview} 1x, ${alignmentReportPreview} 2x`}
                  alt="Sample Alignment Report preview"
                  role="img"
                  className="w-full h-auto rounded-lg"
                />
              </div>
              
              <div className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-xs px-3 py-1 rounded-full font-semibold shadow-lg">
                Sample Report
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
