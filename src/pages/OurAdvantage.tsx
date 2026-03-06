import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Route, Users, BookOpen, MessageCircle, Trophy, Sparkles } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI Curriculum Gap Mapping",
    description: "Intelligent analysis of US ↔ India ↔ SAT/AP gaps with personalized bridge recommendations.",
    color: "text-primary",
    badge: "AI-Powered"
  },
  {
    icon: Route,
    title: "Personalized Learning Pathways",
    description: "Custom study routes combining US breadth with Indian rigor for optimal exam performance.",
    color: "text-secondary",
    badge: "Adaptive"
  },
  {
    icon: BookOpen,
    title: "Cultural & Language Immersion",
    description: "Support for Hindi, Telugu, Tamil, Kannada, or any home-country Indian language your family prefers.",
    color: "text-secondary",
    badge: "Cultural"
  },
  {
    icon: Users,
    title: "Parent Counseling Hub",
    description: "24/7 support portal for Indian migrant parents with expert guidance and community support.",
    color: "text-accent",
    badge: "Family Focus"
  },
  {
    icon: Trophy,
    title: "Dual-Prep Excellence",
    description: "Simultaneous preparation for US SAT/AP and Indian Board exams with proven methodologies.",
    color: "text-primary",
    badge: "Competitive Edge"
  },
  {
    icon: MessageCircle,
    title: "Always-On Educational Companion",
    description: "Trusted AI assistant for any educational query, academic need, or transition support.",
    color: "text-secondary",
    badge: "24/7 Support"
  }
];

const OurAdvantage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Sparkles className="h-10 w-10 text-secondary" />
              <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                What Makes <span className="text-secondary">Globiculum</span> Unique
              </h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Discover what makes Globiculum unique — AI precision meets human care for every learner's journey.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card 
                  key={index} 
                  className="bg-card border border-border shadow-soft hover:shadow-strong transition-all duration-300 hover:-translate-y-2 group"
                >
                  <CardHeader className="space-y-3">
                    <div className="flex items-center justify-between">
                      <IconComponent className={`h-10 w-10 ${feature.color} transition-transform duration-300 group-hover:scale-110`} />
                      <Badge variant="secondary" className="text-xs bg-secondary/10 text-secondary">
                        {feature.badge}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl group-hover:text-secondary transition-colors text-foreground">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default OurAdvantage;
