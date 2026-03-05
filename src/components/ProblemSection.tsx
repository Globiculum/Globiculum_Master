import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Globe, X, Check } from "lucide-react";
import bridgeIcon from "@/assets/bridge-icon.png";

const ProblemSection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <p className="text-secondary font-semibold text-sm uppercase tracking-wider mb-3">
            The Globiculum Difference
          </p>
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-foreground">
            Your child doesn't have to choose between two worlds.
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Our unique AI-driven approach ensures your child excels in Indian education standards and stays aligned with global academic competitiveness.
          </p>
        </div>

        <div className="relative max-w-6xl mx-auto">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden lg:block">
            <div className="bg-card rounded-full p-6 shadow-strong border-4 border-background">
              <img
                src={bridgeIcon}
                alt="Educational bridge connecting pathways"
                className="w-20 h-20 object-contain"
              />
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">
            {/* Indian Curriculum */}
            <Card className="bg-card border-2 border-primary/20 shadow-strong hover:shadow-medium transition-all duration-300">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-primary p-3 rounded-xl">
                    <BookOpen className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-2xl text-foreground">
                    Build a Strong Academic Core
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground font-medium">
                  Master the depth and rigor of Indian education systems. A foundation built for academic excellence and cultural rootedness.
                </p>
                <div className="space-y-3">
                  {[
                    { title: "CBSE & ICSE Excellence", desc: "Deep conceptual mastery, not just exam readiness" },
                    { title: "Mathematical Rigour", desc: "Advanced computation and analytical reasoning" },
                    { title: "Cultural & Language Foundation", desc: "Language proficiency and cultural context" },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                      <div>
                        <h4 className="font-semibold text-foreground">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Global Curriculum */}
            <Card className="bg-card border-2 border-secondary/20 shadow-strong hover:shadow-medium transition-all duration-300">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-secondary p-3 rounded-xl">
                    <Globe className="h-8 w-8 text-secondary-foreground" />
                  </div>
                  <CardTitle className="text-2xl text-foreground">
                    Stay Ahead for Global Pathways
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground font-medium">
                  Maintain US curriculum flexibility and competitive edge. Equip your child for international admissions and global careers.
                </p>
                <div className="space-y-3">
                  {[
                    { title: "SAT / AP Preparation", desc: "Strategic readiness for US college admissions success" },
                    { title: "Critical Thinking & Creativity", desc: "Project-based, inquiry-led learning approaches" },
                    { title: "Global Competitiveness", desc: "Skills that travel, whichever country they live in next" },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-secondary rounded-full mt-2" />
                      <div>
                        <h4 className="font-semibold text-foreground">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Traditional vs Globiculum Comparison */}
        <div className="mt-20">
          <div className="text-center mb-10">
            <p className="text-secondary font-semibold text-sm uppercase tracking-wider mb-3">
              Why Choose Globiculum
            </p>
            <h3 className="text-2xl md:text-4xl font-bold mb-3 text-foreground">Traditional vs. Globiculum</h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Traditional approaches treat every child the same. Globiculum starts from where they actually are, not where the textbook assumes.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card className="bg-card border-2 border-destructive/20">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <X className="h-6 w-6 text-destructive" />
                  <CardTitle className="text-xl text-foreground">Traditional Approach</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  ["Generic curriculum overview", "Curriculum Analysis"],
                  ["One-size-fits-all approach", "Learning Pathway"],
                  ["Manual assessment process", "Assessment"],
                  ["Limited follow-up support", "Follow-up"],
                  ["Static learning materials", "Materials"],
                  ["Rote learning", "Method"],
                ].map(([desc, label]) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="bg-destructive/10 text-destructive rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <X className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-card border-2 border-secondary/20">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Check className="h-6 w-6 text-secondary" />
                  <CardTitle className="text-xl text-foreground">Globiculum Advantage</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  "Personalized AI-powered gap analysis",
                  "AI-powered customized pathways",
                  "Instant digital assessment",
                  "Continuous progress tracking",
                  "Dynamic, adaptive resources",
                  "Pocket friendly",
                ].map((desc) => (
                  <div key={desc} className="flex items-start gap-3">
                    <div className="bg-secondary/10 text-secondary rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
