import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  BookOpen, 
  TrendingUp, 
  Target, 
  FileText,
  Download,
  Calendar,
  Users
} from "lucide-react";
import CurriculumComparison from "./CurriculumComparison";
import { logAuditEvent } from "@/lib/logAuditEvent";

const GapAnalysisReport = () => {
  // Audit: user viewed this report (fire once on mount)
  useEffect(() => {
    logAuditEvent({ action: "view_report", tableName: "gap_analysis_report" });
  }, []);

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Your <span className="text-primary">Comprehensive Gap Analysis</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            AI-powered analysis comparing US Common Core with CBSE curriculum for Grade 10 student
          </p>
        </div>

        {/* Report Header */}
        <Card className="max-w-6xl mx-auto mb-8 bg-gradient-hero text-primary-foreground border-0 shadow-strong">
          <CardContent className="p-8">
            <div className="grid md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold mb-2">73%</div>
                <div className="opacity-90">Overall Alignment</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-2">12</div>
                <div className="opacity-90">Critical Gaps</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-2">8 months</div>
                <div className="opacity-90">Bridge Timeline</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-2">5 subjects</div>
                <div className="opacity-90">Priority Areas</div>
              </div>
            </div>
            <div className="mt-6 flex justify-center gap-4">
              <Button variant="secondary" className="bg-white/20 hover:bg-white/30">
                <Download className="h-4 w-4 mr-2" />
                Download PDF Report
              </Button>
              <Button variant="secondary" className="bg-white/20 hover:bg-white/30">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Parent Consultation
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="overview" className="space-y-8">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="subjects">By Subject</TabsTrigger>
              <TabsTrigger value="methodology">Teaching Methods</TabsTrigger>
              <TabsTrigger value="timeline">Action Plan</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Critical Gaps */}
                <Card className="bg-gradient-card border-0 shadow-medium">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                      Critical Knowledge Gaps
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { subject: "Mathematics", gap: "Trigonometry depth", severity: "High" },
                      { subject: "Physics", gap: "Rotational mechanics", severity: "High" },
                      { subject: "Chemistry", gap: "Organic reaction mechanisms", severity: "Medium" },
                      { subject: "Biology", gap: "Plant physiology detail", severity: "Medium" }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{item.subject}</div>
                          <div className="text-sm text-muted-foreground">{item.gap}</div>
                        </div>
                        <Badge variant={item.severity === "High" ? "destructive" : "secondary"}>
                          {item.severity}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Strengths */}
                <Card className="bg-gradient-card border-0 shadow-medium">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-success">
                      <CheckCircle className="h-5 w-5" />
                      Strong Foundation Areas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { subject: "English", strength: "Reading comprehension", level: "Advanced" },
                      { subject: "Mathematics", strength: "Algebraic thinking", level: "Strong" },
                      { subject: "Social Studies", strength: "Critical analysis", level: "Strong" },
                      { subject: "Computer Science", strength: "Logic & programming", level: "Advanced" }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{item.subject}</div>
                          <div className="text-sm text-muted-foreground">{item.strength}</div>
                        </div>
                        <Badge variant="outline" className="text-success border-success">
                          {item.level}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Subject Alignment Chart */}
              <Card className="bg-gradient-card border-0 shadow-medium">
                <CardHeader>
                  <CardTitle>Subject-wise Curriculum Alignment</CardTitle>
                  <CardDescription>How well US Common Core aligns with CBSE expectations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {[
                    { subject: "Mathematics", alignment: 85, topics: "45/53 topics covered" },
                    { subject: "English", alignment: 90, topics: "38/42 topics covered" },
                    { subject: "Physics", alignment: 65, topics: "28/43 topics covered" },
                    { subject: "Chemistry", alignment: 70, topics: "35/50 topics covered" },
                    { subject: "Biology", alignment: 75, topics: "41/55 topics covered" },
                    { subject: "Social Studies", alignment: 60, topics: "22/37 topics covered" }
                  ].map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{item.subject}</span>
                        <div className="text-right">
                          <span className="text-sm font-medium">{item.alignment}%</span>
                          <div className="text-xs text-muted-foreground">{item.topics}</div>
                        </div>
                      </div>
                      <Progress value={item.alignment} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Subjects Tab */}
            <TabsContent value="subjects" className="space-y-6">
              <div className="grid gap-6">
                {["Mathematics", "Physics", "Chemistry"].map((subject) => (
                  <Card key={subject} className="bg-gradient-card border-0 shadow-medium">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        {subject} - Detailed Gap Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold text-success mb-3">Topics Well Covered</h4>
                          <ul className="space-y-2 text-sm">
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-success" />
                              Linear equations and inequalities
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-success" />
                              Basic trigonometric functions
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-success" />
                              Coordinate geometry fundamentals
                            </li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold text-destructive mb-3">Critical Gaps to Address</h4>
                          <ul className="space-y-2 text-sm">
                            <li className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                              Advanced trigonometric identities
                            </li>
                            <li className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                              Complex number applications
                            </li>
                            <li className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                              Analytical geometry depth
                            </li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Curriculum Standards Comparison */}
              <CurriculumComparison />
            </TabsContent>

            {/* Methodology Tab */}
            <TabsContent value="methodology" className="space-y-6">
              <Card className="bg-gradient-card border-0 shadow-medium">
                <CardHeader>
                  <CardTitle>Teaching Methodology Comparison</CardTitle>
                  <CardDescription>Understanding the fundamental differences in educational approach</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="font-semibold text-primary mb-4">US Common Core Approach</h4>
                      <ul className="space-y-3 text-sm">
                        <li className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                          <div>
                            <strong>Conceptual Understanding:</strong> Emphasizes why and how over memorization
                          </div>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                          <div>
                            <strong>Multiple Methods:</strong> Various problem-solving approaches encouraged
                          </div>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                          <div>
                            <strong>Real-world Applications:</strong> Context-based learning and projects
                          </div>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-accent-contrast mb-4">CBSE/Indian Board Approach</h4>
                      <ul className="space-y-3 text-sm">
                        <li className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-accent rounded-full mt-2" />
                          <div>
                            <strong>Rigorous Practice:</strong> Extensive problem-solving and repetition
                          </div>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-accent rounded-full mt-2" />
                          <div>
                            <strong>Depth Over Breadth:</strong> Deep dive into fewer topics with mastery
                          </div>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-accent rounded-full mt-2" />
                          <div>
                            <strong>Competitive Focus:</strong> Preparation for high-stakes examinations
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="space-y-6">
              <Card className="bg-gradient-card border-0 shadow-medium">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-success" />
                    8-Month Bridge Plan
                  </CardTitle>
                  <CardDescription>Personalized timeline to close curriculum gaps effectively</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {[
                      {
                        phase: "Phase 1: Foundation Strengthening",
                        duration: "Months 1-2",
                        focus: "Address critical STEM gaps",
                        color: "text-destructive"
                      },
                      {
                        phase: "Phase 2: Methodology Adaptation",
                        duration: "Months 3-4", 
                        focus: "Indian problem-solving techniques",
                        color: "text-warning"
                      },
                      {
                        phase: "Phase 3: Advanced Topics",
                        duration: "Months 5-6",
                        focus: "CBSE-specific advanced concepts",
                        color: "text-primary"
                      },
                      {
                        phase: "Phase 4: Assessment Preparation",
                        duration: "Months 7-8",
                        focus: "Mock tests and final readiness",
                        color: "text-success"
                      }
                    ].map((phase, index) => (
                      <div key={index} className="flex items-start gap-4">
                        <div className={`w-4 h-4 rounded-full mt-1 ${phase.color.replace('text-', 'bg-')}`} />
                        <div className="flex-1">
                          <h4 className={`font-semibold ${phase.color}`}>{phase.phase}</h4>
                          <p className="text-sm text-muted-foreground">{phase.duration}</p>
                          <p className="text-sm mt-1">{phase.focus}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Resources Tab */}
            <TabsContent value="resources" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="bg-gradient-card border-0 shadow-medium">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Recommended Study Materials
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <h5 className="font-semibold">Mathematics</h5>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• NCERT Mathematics Class 10 (Chapters 8-15)</li>
                        <li>• RD Sharma for advanced practice</li>
                        <li>• Khan Academy Trigonometry modules</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h5 className="font-semibold">Physics</h5>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• NCERT Physics Class 11 (Selected chapters)</li>
                        <li>• Concept-building video series</li>
                        <li>• Problem-solving workbooks</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-card border-0 shadow-medium">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-accent" />
                      Support Services
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>1-on-1 Subject Tutoring</span>
                      <Badge variant="outline">Available</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Parent Counseling Sessions</span>
                      <Badge variant="outline">Weekly</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Cultural Immersion Program</span>
                      <Badge variant="outline">Optional</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Progress Monitoring</span>
                      <Badge variant="outline">Bi-weekly</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
};

export default GapAnalysisReport;