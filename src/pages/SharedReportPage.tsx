import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, BookOpen, AlertTriangle, Calendar, Lightbulb, Clock, ShieldAlert, LinkIcon } from "lucide-react";

interface SubjectAnalysis {
  subject: string;
  topicsCovered: number;
  totalTopics: number;
  alignmentLevel: "strong" | "moderate" | "high_gap";
  keyGaps: string[];
}

interface TimelinePhase {
  name: string;
  duration: string;
  bullets: string[];
}

interface AnalysisData {
  overallAlignment: {
    percentage: number;
    subjectsNeedingBridge: string[];
    estimatedDuration: string;
  };
  subjectAnalysis: SubjectAnalysis[];
  criticalGaps: string[];
  bridgeTimeline: {
    phase1: TimelinePhase;
    phase2: TimelinePhase;
    phase3: TimelinePhase;
  };
  recommendations: {
    study: string[];
    skillStrategy: string[];
    resources: string[];
    culturalLanguage: string[];
  };
}

interface SharedReportData {
  id: string;
  title: string;
  form_data: Record<string, unknown>;
  analysis_data: AnalysisData;
  created_at: string;
  student_name: string;
}

const SharedReportPage = () => {
  const { token } = useParams<{ token: string }>();
  const [report, setReport] = useState<SharedReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      if (!token) {
        setError("Invalid link");
        setLoading(false);
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke("fetch-shared-report", {
        body: { token },
      });

      if (fnError || data?.error) {
        setError(data?.error || fnError?.message || "Failed to load report");
      } else if (data?.report) {
        setReport(data.report as SharedReportData);
      }
      setLoading(false);
    };

    fetchReport();
  }, [token]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    });

  const getAlignmentBadge = (level: string) => {
    switch (level) {
      case "strong":
        return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-xs">Strong</Badge>;
      case "moderate":
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-xs">Moderate</Badge>;
      case "high_gap":
        return <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-0 text-xs">High Gap</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="flex flex-col items-center py-12 space-y-4">
              <div className="p-4 bg-destructive/10 rounded-full">
                {error?.includes("expired") ? (
                  <Clock className="h-10 w-10 text-destructive" />
                ) : error?.includes("not found") ? (
                  <LinkIcon className="h-10 w-10 text-destructive" />
                ) : (
                  <ShieldAlert className="h-10 w-10 text-destructive" />
                )}
              </div>
              <h2 className="text-xl font-semibold">Unable to Load Report</h2>
              <p className="text-muted-foreground text-center">{error || "Report not found"}</p>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const analysis = report.analysis_data;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {/* Shared banner */}
        <div className="mb-6 p-3 bg-muted/50 border rounded-lg flex items-center gap-2 text-sm text-muted-foreground">
          <LinkIcon className="h-4 w-4" />
          <span>Shared report for <strong className="text-foreground">{report.student_name}</strong></span>
        </div>

        {/* Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 rounded-full">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{report.title}</h1>
            <p className="text-sm text-muted-foreground">Generated {formatDate(report.created_at)}</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Quick Overview */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-primary">{analysis.overallAlignment?.percentage || 0}%</div>
                <div className="text-sm text-muted-foreground">Overall Alignment</div>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                  {analysis.overallAlignment?.subjectsNeedingBridge?.length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Subjects Need Bridge</div>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4 text-center">
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {analysis.overallAlignment?.estimatedDuration || "N/A"}
                </div>
                <div className="text-sm text-muted-foreground">Est. Duration</div>
              </CardContent>
            </Card>
          </div>

          {/* Coverage Analysis */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Coverage Analysis</h3>
            </div>
            <div className="grid gap-3">
              {analysis.subjectAnalysis?.map((subject, idx) => (
                <Card key={idx} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{subject.subject}</span>
                      {getAlignmentBadge(subject.alignmentLevel)}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            subject.alignmentLevel === "strong" ? "bg-emerald-500" :
                            subject.alignmentLevel === "moderate" ? "bg-amber-500" : "bg-rose-500"
                          }`}
                          style={{ width: `${(subject.topicsCovered / subject.totalTopics) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">{subject.topicsCovered}/{subject.totalTopics}</span>
                    </div>
                    {subject.keyGaps?.length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Gaps: </span>{subject.keyGaps.join(", ")}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Critical Gaps */}
          {analysis.criticalGaps?.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-500" />
                <h3 className="text-lg font-semibold">Critical Gaps</h3>
              </div>
              <Card className="bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800">
                <CardContent className="p-4">
                  <ul className="space-y-1.5">
                    {analysis.criticalGaps.map((gap, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <span className="text-rose-500 mt-1">•</span>
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Bridge Timeline */}
          {analysis.bridgeTimeline && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Bridge Timeline</h3>
              </div>
              <div className="space-y-3">
                {(["phase1", "phase2", "phase3"] as const).map((phaseKey, idx) => {
                  const phase = analysis.bridgeTimeline[phaseKey];
                  if (!phase) return null;
                  return (
                    <Card key={phaseKey} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">Phase {idx + 1}</Badge>
                          <span className="font-medium">{phase.name}</span>
                          <span className="text-sm text-muted-foreground ml-auto">{phase.duration}</span>
                        </div>
                        <ul className="space-y-1">
                          {phase.bullets?.map((bullet, bIdx) => (
                            <li key={bIdx} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-primary mt-1">•</span>
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                <h3 className="text-lg font-semibold">Recommendations</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  { key: "study", label: "Study Tips" },
                  { key: "skillStrategy", label: "Skill Strategy" },
                  { key: "resources", label: "Resources" },
                  { key: "culturalLanguage", label: "Cultural & Language" },
                ].map(({ key, label }) => {
                  const items = analysis.recommendations[key as keyof typeof analysis.recommendations];
                  if (!items?.length) return null;
                  return (
                    <Card key={key} className="border">
                      <CardContent className="p-4">
                        <h4 className="font-medium text-sm mb-2">{label}</h4>
                        <ul className="space-y-1">
                          {items.map((rec: string, idx: number) => (
                            <li key={idx} className="text-sm text-muted-foreground">• {rec}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SharedReportPage;
