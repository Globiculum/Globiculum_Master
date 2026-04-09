import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, BookOpen, Clock } from "lucide-react";

const ChallengeSection = () => {
  return (
    <section className="py-12 sm:py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-12 max-w-3xl mx-auto">
          <p className="text-secondary font-semibold text-sm uppercase tracking-wider mb-3">
            The challenge families face
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-foreground mb-4 sm:mb-6 leading-tight">
            Every year, thousands of children land in India academically unprepared.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            The excitement of returning home quickly turns to anxiety when parents realise that CBSE Grade 7 Math is two years ahead of what their child studied in the US — and that no one told them in advance.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="bg-card border border-border shadow-soft hover:shadow-medium transition-all duration-300">
            <CardContent className="p-8">
              <div className="bg-destructive/10 p-3 rounded-xl w-fit mb-5">
                <AlertTriangle className="h-7 w-7 text-destructive" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Curriculum shock is real</h3>
              <p className="text-muted-foreground leading-relaxed">
                Indian boards cover topics earlier and deeper. Without a plan, your child is thrown into a class where everyone else already knows what they don't.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border shadow-soft hover:shadow-medium transition-all duration-300">
            <CardContent className="p-8">
              <div className="bg-accent/10 p-3 rounded-xl w-fit mb-5">
                <BookOpen className="h-7 w-7 text-accent" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Generic tutors don't help enough</h3>
              <p className="text-muted-foreground leading-relaxed">
                Most tutors don't know both curricula. They teach rote answers — not how to close specific gaps from a US to Indian curriculum transition.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border shadow-soft hover:shadow-medium transition-all duration-300">
            <CardContent className="p-8">
              <div className="bg-secondary/10 p-3 rounded-xl w-fit mb-5">
                <Clock className="h-7 w-7 text-secondary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Every week of delay costs confidence</h3>
              <p className="text-muted-foreground leading-relaxed">
                The longer your child struggles silently, the harder it becomes to catch up. Early intervention is the single biggest predictor of a successful transition.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default ChallengeSection;
