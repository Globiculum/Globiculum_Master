import { Card, CardContent } from "@/components/ui/card";
import AnimatedCounter from "./AnimatedCounter";
import { TrendingUp, Zap, Heart, Globe, Clock, IndianRupee } from "lucide-react";

const stats = [
  {
    icon: TrendingUp,
    value: 94,
    suffix: "%",
    label: "Settled within one term",
    desc: "Children feel academically confident within their first school term",
    color: "text-secondary",
  },
  {
    icon: Zap,
    value: 3.2,
    suffix: "×",
    label: "Faster catch-up speed",
    desc: "Compared to generic tutoring approaches",
    color: "text-accent",
    isDecimal: true,
  },
  {
    icon: Heart,
    value: 87,
    suffix: "%",
    label: "Parents report reduced stress",
    desc: "Knowing exactly what needs to be done before the move",
    color: "text-secondary",
  },
  {
    icon: Globe,
    value: 47,
    suffix: "+",
    label: "Curricula supported",
    desc: "From US Common Core to IB, Australian, UK, and Canadian",
    color: "text-primary",
  },
  {
    icon: Clock,
    value: 5,
    suffix: " min",
    label: "To your first gap report",
    desc: "No waiting, no lengthy questionnaires",
    color: "text-accent",
  },
  {
    icon: IndianRupee,
    value: 0,
    suffix: "",
    label: "To start your journey",
    desc: "Your first full gap analysis is completely free",
    color: "text-secondary",
    prefix: "₹",
  },
];

const ResultsSection = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14 max-w-3xl mx-auto">
          <p className="text-secondary font-semibold text-sm uppercase tracking-wider mb-3">
            Results that speak
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            What families report after using Globiculum
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {stats.map((stat) => (
            <Card
              key={stat.label}
              className="bg-card border border-border shadow-soft hover:shadow-medium transition-all duration-300"
            >
              <CardContent className="p-8">
                <stat.icon className={`h-8 w-8 ${stat.color} mb-4`} />
                <div className="text-3xl font-bold text-foreground mb-1">
                  {stat.prefix || ""}
                  {stat.isDecimal ? "3.2" : <AnimatedCounter end={stat.value} suffix="" prefix="" />}
                  {stat.suffix}
                </div>
                <div className="font-semibold text-foreground mb-1">{stat.label}</div>
                <p className="text-sm text-muted-foreground">{stat.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ResultsSection;
