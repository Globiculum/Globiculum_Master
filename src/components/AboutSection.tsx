import { Card } from "@/components/ui/card";
import { Users, Globe, Award, Shield } from "lucide-react";

const AboutSection = () => {
  return (
    <section id="about" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <p className="text-2xl md:text-3xl font-semibold max-w-3xl mx-auto text-foreground">
            Your trusted partner in <span className="text-secondary">seamless educational transitions</span> and curriculum bridging.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          <Card className="p-6 text-center bg-card border border-border shadow-soft hover:shadow-medium transition-shadow">
            <Globe className="h-12 w-12 text-secondary mx-auto mb-4" />
            <div className="text-2xl font-bold text-foreground mb-2">24/7</div>
            <div className="text-sm text-muted-foreground">Expert Support</div>
          </Card>
          <Card className="p-6 text-center bg-card border border-border shadow-soft hover:shadow-medium transition-shadow">
            <Shield className="h-12 w-12 text-secondary mx-auto mb-4" />
            <div className="text-2xl font-bold text-foreground mb-2">100%</div>
            <div className="text-sm text-muted-foreground">Secure & Compliant</div>
          </Card>
          <Card className="p-6 text-center bg-card border border-border shadow-soft hover:shadow-medium transition-shadow">
            <Award className="h-12 w-12 text-primary mx-auto mb-4" />
            <div className="text-2xl font-bold text-foreground mb-2">AI-Powered</div>
            <div className="text-sm text-muted-foreground">Personalized Plans</div>
          </Card>
          <Card className="p-6 text-center bg-card border border-border shadow-soft hover:shadow-medium transition-shadow">
            <Users className="h-12 w-12 text-accent mx-auto mb-4" />
            <div className="text-2xl font-bold text-foreground mb-2">Global</div>
            <div className="text-sm text-muted-foreground">Family Community</div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
