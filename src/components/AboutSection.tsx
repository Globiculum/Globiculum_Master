import { Card } from "@/components/ui/card";
import { Globe, Shield, Award, Users, Cpu } from "lucide-react";

const stats = [
  { icon: Globe, value: "24/7", label: "Expert Support" },
  { icon: Shield, value: "100%", label: "Secure & Compliant" },
  { icon: Award, value: "Boards", label: "Excellence" },
  { icon: Cpu, value: "AI-Powered", label: "Personalized Plans" },
  { icon: Users, value: "Global", label: "Family Community" },
];

const AboutSection = () => {
  return (
    <section id="about" className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap justify-center gap-4 max-w-5xl mx-auto">
          {stats.map((s) => (
            <Card
              key={s.label}
              className="px-6 py-5 flex items-center gap-3 bg-card border border-border shadow-soft hover:shadow-medium transition-shadow"
            >
              <s.icon className="h-6 w-6 text-secondary flex-shrink-0" />
              <div>
                <div className="text-lg font-bold text-foreground leading-tight">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
