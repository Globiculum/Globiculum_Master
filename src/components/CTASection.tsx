import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const bullets = [
  "Full gap analysis in minutes",
  "CBSE & ICSE supported",
  "Personalised study plan",
  "Progress tracking included",
  "Pocket-friendly pricing",
];

const CTASection = () => {
  return (
    <section className="py-12 sm:py-16 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6">
        <Card className="max-w-4xl mx-auto bg-gradient-hero text-primary-foreground border-0 shadow-strong p-6 sm:p-8 md:p-12">
          <div className="text-center space-y-6">
            <p className="text-secondary font-semibold text-sm uppercase tracking-wider">
              Free to start · No credit card needed
            </p>
            <h2 className="text-3xl md:text-4xl font-bold">
              In 5 minutes, know exactly where your child stands.
            </h2>
            <p className="text-lg text-primary-foreground/85 max-w-2xl mx-auto">
              Stop guessing. Stop worrying. Get an AI-powered curriculum gap analysis that tells you — chapter by chapter, subject by subject — what your child needs before the move to India.
            </p>

            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-primary-foreground/80">
              {bullets.map((b) => (
                <span key={b} className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-secondary" />
                  {b}
                </span>
              ))}
            </div>

            <Button
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90 text-lg px-8 py-6 h-auto group font-semibold"
              asChild
            >
              <Link to="/begin-journey" aria-label="Begin Your Journey — It's Free">
                Begin Your Journey — It's Free
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>

            <p className="text-sm text-primary-foreground/60">
              Join 2,400+ families who've made the move with confidence
            </p>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default CTASection;
