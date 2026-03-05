import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Globe, Users, AlertTriangle, TrendingDown, DollarSign, X, Check } from "lucide-react";
import bridgeIcon from "@/assets/bridge-icon.png";
import AnimatedCounter from "./AnimatedCounter";

const ProblemSection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-foreground">
            The <span className="text-secondary">Dual Path Advantage</span> for Global Learners
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-6">
            Give your child the best of both worlds with a curriculum that builds depth and maintains global flexibility.
          </p>
          <p className="text-2xl font-semibold text-primary">
            Empower your child to thrive anywhere — and stay fully prepared if you return to India.
          </p>
        </div>

        <div className="relative max-w-6xl mx-auto">
          {/* Bridge Illustration - centered between cards */}
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
            {/* Left Card - Indian Boards */}
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
                  Master the depth and rigor of Indian education systems
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                    <div>
                      <h4 className="font-semibold text-foreground">CBSE & ICSE Excellence</h4>
                      <p className="text-sm text-muted-foreground">Deep conceptual understanding and problem-solving skills</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                    <div>
                      <h4 className="font-semibold text-foreground">Mathematical Rigor</h4>
                      <p className="text-sm text-muted-foreground">Advanced computation and analytical thinking</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                    <div>
                      <h4 className="font-semibold text-foreground">Cultural Foundation</h4>
                      <p className="text-sm text-muted-foreground">Language proficiency and cultural context</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right Card - US Curriculum */}
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
                  Maintain US curriculum flexibility and competitive edge
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-secondary rounded-full mt-2" />
                    <div>
                      <h4 className="font-semibold text-foreground">SAT/AP Preparation</h4>
                      <p className="text-sm text-muted-foreground">Strategic prep for college admissions success</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-secondary rounded-full mt-2" />
                    <div>
                      <h4 className="font-semibold text-foreground">Critical Thinking Skills</h4>
                      <p className="text-sm text-muted-foreground">Holistic learning and creative problem-solving</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-secondary rounded-full mt-2" />
                    <div>
                      <h4 className="font-semibold text-foreground">Global Competitiveness</h4>
                      <p className="text-sm text-muted-foreground">Stay ahead in international opportunities</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Animated Statistics */}
        <div className="grid md:grid-cols-4 gap-6 mt-16">
          <Card className="text-center bg-card border border-border shadow-soft hover:shadow-medium transition-all duration-300">
            <CardContent className="p-6">
              <Users className="h-8 w-8 text-primary mx-auto mb-3" />
              <AnimatedCounter end={5} suffix="M+" prefix="" />
              <div className="text-sm text-muted-foreground mt-1">Indian Families Globally</div>
            </CardContent>
          </Card>
          <Card className="text-center bg-card border border-border shadow-soft hover:shadow-medium transition-all duration-300">
            <CardContent className="p-6">
              <AlertTriangle className="h-8 w-8 text-accent mx-auto mb-3" />
              <AnimatedCounter end={78} suffix="%" prefix="" />
              <div className="text-sm text-muted-foreground mt-1">Experience Academic Shock</div>
            </CardContent>
          </Card>
          <Card className="text-center bg-card border border-border shadow-soft hover:shadow-medium transition-all duration-300">
            <CardContent className="p-6">
              <TrendingDown className="h-8 w-8 text-secondary mx-auto mb-3" />
              <AnimatedCounter end={45} suffix="%" prefix="" />
              <div className="text-sm text-muted-foreground mt-1">SAT Score Drop</div>
            </CardContent>
          </Card>
          <Card className="text-center bg-card border border-border shadow-soft hover:shadow-medium transition-all duration-300">
            <CardContent className="p-6">
              <DollarSign className="h-8 w-8 text-accent mx-auto mb-3" />
              <AnimatedCounter end={15} suffix="K+" prefix="$" />
              <div className="text-sm text-muted-foreground mt-1">Annual Tutoring Spend</div>
            </CardContent>
          </Card>
        </div>

        {/* Traditional vs EduSetu Comparison */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <h3 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">Traditional vs. EduSetu Approach</h3>
            <p className="text-muted-foreground">See the difference a unified solution makes</p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Traditional Approach */}
            <Card className="bg-card border-2 border-destructive/20">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <X className="h-6 w-6 text-destructive" />
                  <CardTitle className="text-xl text-foreground">Traditional Approach</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="bg-destructive text-destructive-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">1</div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Multiple Providers</h4>
                    <p className="text-sm text-muted-foreground">Juggling tutors, online platforms, and cultural programs separately</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-destructive text-destructive-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">2</div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Fragmented Learning</h4>
                    <p className="text-sm text-muted-foreground">No coordination between US and Indian curriculum prep</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-destructive text-destructive-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">3</div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">High Cost & Stress</h4>
                    <p className="text-sm text-muted-foreground">$15K+ annually with constant scheduling conflicts and gaps</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* EduSetu Solution */}
            <Card className="bg-card border-2 border-secondary/20">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Check className="h-6 w-6 text-secondary" />
                  <CardTitle className="text-xl text-foreground">EduSetu Solution</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="bg-secondary text-secondary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">1</div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">One Unified Platform</h4>
                    <p className="text-sm text-muted-foreground">All your child's educational needs in one trusted solution</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-secondary text-secondary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">2</div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Integrated Curriculum</h4>
                    <p className="text-sm text-muted-foreground">Seamless coordination between US and Indian board requirements</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-secondary text-secondary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">3</div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Peace of Mind</h4>
                    <p className="text-sm text-muted-foreground">Personalized roadmap with expert guidance at a fraction of the cost</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
