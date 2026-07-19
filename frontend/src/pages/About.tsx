import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Target, Heart, Globe } from "lucide-react";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <section className="py-12 sm:py-16 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-16 space-y-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground leading-tight">
              About <span className="text-secondary">Globiculum</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Bridging educational worlds for Indian migrant families, one student at a time.
            </p>
          </div>
          
          {/* Mission Section */}
          <div className="max-w-4xl mx-auto mb-16">
            <Card className="bg-card border border-border shadow-strong">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl text-foreground">
                  <Target className="h-8 w-8 text-secondary" />
                  Our Mission
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Globiculum was founded with a singular purpose: to empower Indian migrant families with the tools and guidance they need to ensure their children thrive academically — whether they're preparing for a return to India or building a foundation for global success. We bridge the gap between US and Indian education systems through AI-powered curriculum mapping, personalized learning pathways, and dedicated family support.
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Values Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-5xl mx-auto">
            <Card className="bg-card border border-border shadow-soft hover:shadow-strong transition-all duration-300">
              <CardHeader>
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Heart className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-xl text-foreground">Family-First Approach</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We understand the unique challenges migrant families face. Our solutions are designed with empathy, providing support for the entire family unit throughout their educational journey.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-card border border-border shadow-soft hover:shadow-strong transition-all duration-300">
              <CardHeader>
                <div className="w-14 h-14 bg-secondary/10 rounded-full flex items-center justify-center mb-4">
                  <Globe className="h-7 w-7 text-secondary" />
                </div>
                <CardTitle className="text-xl text-foreground">Global Perspective</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We believe in preparing students for success anywhere in the world. Our dual-curriculum approach ensures students are competitive in both Indian and international academic environments.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-card border border-border shadow-soft hover:shadow-strong transition-all duration-300">
              <CardHeader>
                <div className="w-14 h-14 bg-secondary/10 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-7 w-7 text-secondary" />
                </div>
                <CardTitle className="text-xl text-foreground">Expert Guidance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Our team combines educational expertise with deep understanding of both US and Indian academic systems, ensuring every recommendation is grounded in real-world experience.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* People & Advisors Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-16 space-y-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground leading-tight">
              People behind our vision & mission
            </h2>
          </div>

          {/* Core Team */}
          <div className="mb-16">
            <h3 className="text-2xl font-semibold mb-8 text-center text-primary">
              Core Team — People behind the vision & mission
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="bg-card border border-border shadow-soft text-center p-6">
                  <div className="w-20 h-20 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="font-bold text-foreground">Name Surname</p>
                  <p className="italic text-muted-foreground text-sm">Role placeholder</p>
                  <p className="text-muted-foreground text-sm mt-2">Short tagline describing role</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Educational Advisory Board */}
          <div className="mb-16">
            <h3 className="text-2xl font-semibold mb-8 text-center text-secondary">
              Our Educational Advisory Board
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                { role: "Curriculum Advisor", tagline: "Curriculum alignment & pedagogy" },
                { role: "Assessment Specialist", tagline: "Standardized testing expertise" },
                { role: "EdTech Consultant", tagline: "Learning technology integration" },
                { role: "Cross-Cultural Education Expert", tagline: "International education transitions" },
                { role: "Special Education Advisor", tagline: "Inclusive learning strategies" },
                { role: "Parent Engagement Specialist", tagline: "Family support & communication" },
              ].map((advisor, i) => (
                <Card key={i} className="bg-card border border-border shadow-soft text-center p-6">
                  <div className="w-20 h-20 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="font-bold text-foreground">A. Example</p>
                  <p className="italic text-muted-foreground text-sm">{advisor.role}</p>
                  <p className="text-muted-foreground text-sm mt-2">Placeholder: {advisor.tagline}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Tech Support / Technical Gurus */}
          <div className="mb-16">
            <h3 className="text-2xl font-semibold mb-8 text-center text-secondary">
              Our Tech Support / Technical Guru(s)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto">
              {[
                { role: "Technical Lead", tagline: "Platform architecture & scalability" },
                { role: "Platform Architect", tagline: "System design & integration" },
                { role: "AI/ML Engineer", tagline: "Curriculum gap analysis algorithms" },
              ].map((tech, i) => (
                <Card key={i} className="bg-card border border-border shadow-soft text-center p-6">
                  <div className="w-20 h-20 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="font-bold text-foreground">Name Surname</p>
                  <p className="italic text-muted-foreground text-sm">{tech.role}</p>
                  <p className="text-muted-foreground text-sm mt-2">{tech.tagline}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* General Advisors */}
          <div>
            <h3 className="text-2xl font-semibold mb-8 text-center text-accent">
              Our Advisors
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 max-w-5xl mx-auto">
              {[
                "Strategic Growth Advisor",
                "Finance & Operations Advisor",
                "Legal & Compliance Advisor",
                "Marketing & Brand Advisor",
                "Community Outreach Advisor",
                "Partnership Development Advisor",
                "Product Strategy Advisor",
                "User Experience Advisor",
              ].map((role, i) => (
                <Card key={i} className="bg-card border border-border shadow-soft text-center p-4">
                  <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-3 flex items-center justify-center">
                    <Users className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="font-bold text-foreground text-sm">Name Surname</p>
                  <p className="italic text-muted-foreground text-xs">{role}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default About;
