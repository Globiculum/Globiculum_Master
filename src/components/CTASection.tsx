import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const CTASection = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <Card className="max-w-4xl mx-auto bg-gradient-hero text-primary-foreground border-0 shadow-strong p-12 text-center">
          <Sparkles className="h-12 w-12 text-secondary mx-auto mb-6 animate-pulse" />
          
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Curious to know how your child aligns across US and Indian syllabi?
          </h2>
          
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Start your personalized curriculum mapping journey today and receive an AI-powered gap analysis in minutes.
          </p>
          
          <Button 
            size="lg" 
            className="bg-accent text-accent-foreground hover:bg-accent/90 text-lg px-8 py-6 h-auto group font-semibold"
            asChild
          >
            <Link to="/begin-journey" aria-label="Begin My Journey">
              Begin My Journey
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </Card>
      </div>
    </section>
  );
};

export default CTASection;
