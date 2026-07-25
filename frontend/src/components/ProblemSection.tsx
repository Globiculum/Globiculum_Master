import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Globe } from "lucide-react";
import bridgeIcon from "@/assets/bridge-icon.png";

const ProblemSection = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-hero py-12 sm:py-16 md:py-20">
      <div className="container mx-auto px-4 sm:px-6 relative">
        <div className="text-center mb-8 sm:mb-12">
          <span className="mb-6 inline-block rounded-full bg-accent px-6 py-2.5 text-base font-bold uppercase tracking-wide text-accent-foreground shadow-[0_8px_24px_-8px_rgba(245,158,11,0.55)] sm:text-lg">
            The Globiculum Difference
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4 text-white leading-tight">
            Your child doesn't have to choose between two worlds.
          </h2>
          <p className="text-lg text-white/85 max-w-3xl mx-auto">
            Our unique AI-driven approach ensures your child excels in Indian education standards and stays aligned with global academic competitiveness.
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="relative flex flex-col lg:flex-row items-stretch gap-6 lg:gap-10">
            {/* Indian Curriculum */}
            <Card className="flex-1 bg-primary/20 backdrop-blur-md border-2 border-white/20 shadow-strong hover:shadow-medium transition-all duration-300">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-primary p-3 rounded-xl">
                    <BookOpen className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-2xl text-white">
                    Build a Strong Academic Core
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-white/85 font-medium">
                  Master the depth and rigor of Indian education systems. A foundation built for academic excellence and cultural rootedness.
                </p>
                <div className="space-y-3">
                  {[
                    { title: "CBSE & ICSE Excellence", desc: "Deep conceptual mastery, not just exam readiness" },
                    { title: "Mathematical Rigour", desc: "Advanced computation and analytical reasoning" },
                    { title: "Cultural & Language Foundation", desc: "Language proficiency and cultural context" },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-white rounded-full mt-2" />
                      <div>
                        <h4 className="font-semibold text-white">{item.title}</h4>
                        <p className="text-sm text-white/80">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Bridge icon — small, in-flow on mobile/tablet */}
            <div className="flex items-center justify-center shrink-0 py-2 lg:hidden">
              <div className="bg-primary/20 backdrop-blur-md rounded-full p-3 shadow-medium border-2 border-white/20">
                <img
                  src={bridgeIcon}
                  alt="Educational bridge connecting pathways"
                  className="w-10 h-10 object-contain"
                />
              </div>
            </div>

            {/* Bridge icon — overlaps only the padding gutter of both cards, never their text */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 lg:block">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-strong border-4 border-white/50">
                <img
                  src={bridgeIcon}
                  alt="Educational bridge connecting pathways"
                  className="w-10 h-10 object-contain"
                />
              </div>
            </div>

            {/* Global Curriculum */}
            <Card className="flex-1 bg-primary/20 backdrop-blur-md border-2 border-white/20 shadow-strong hover:shadow-medium transition-all duration-300">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-secondary p-3 rounded-xl">
                    <Globe className="h-8 w-8 text-secondary-foreground" />
                  </div>
                  <CardTitle className="text-2xl text-white">
                    Stay Ahead for Global Pathways
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-white/85 font-medium">
                  Maintain global curriculum flexibility and competitive edge. Equip your child for international admissions and global careers.
                </p>
                <div className="space-y-3">
                  {[
                    { title: "University Entrance Test / AP Preparation", desc: "Strategic readiness for global college admissions success" },
                    { title: "Critical Thinking & Creativity", desc: "Project-based, inquiry-led learning approaches" },
                    { title: "Global Competitiveness", desc: "Skills that travel, whichever country they live in next" },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-white rounded-full mt-2" />
                      <div>
                        <h4 className="font-semibold text-white">{item.title}</h4>
                        <p className="text-sm text-white/80">{item.desc}</p>
                      </div>
                    </div>
                  ))}
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
