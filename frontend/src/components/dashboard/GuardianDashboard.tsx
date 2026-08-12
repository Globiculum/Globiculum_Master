import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Eye, FileText, Target, BookOpen, Clock, TrendingUp, GraduationCap, ShieldCheck } from "lucide-react";

interface GuardianDashboardProps {
  studentUserId: string;
  studentName: string;
}

interface ReportSummary {
  id: string;
  title: string;
  created_at: string;
  analysis_data: {
    overallAlignment?: { percentage?: number; estimatedDuration?: string; subjectsNeedingBridge?: string[] };
    subjectAnalysis?: Array<{ subject: string; topicsCovered: number; totalTopics: number; alignmentLevel: string }>;
    criticalGaps?: string[];
  };
}

const GuardianDashboard = ({ studentUserId, studentName }: GuardianDashboardProps) => {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [progressStats, setProgressStats] = useState<{
    overall_mastery: number;
    topics_completed: number;
    active_weeks: number;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Fetch reports - guardians can see these via RLS if relationship is verified
      // We need to use the service role or a function for this
      // For now, use the student's saved_reports via an edge function or direct query
      // Since saved_reports doesn't have guardian RLS, we'll fetch via the student profile
      const { data: studentProfile } = await supabase
        .from("student_profiles")
        .select("id, curriculum_analysis, current_grade, previous_curriculum, target_curriculum")
        .eq("user_id", studentUserId)
        .maybeSingle();

      if (studentProfile) {
        // Fetch diagnostic results (has guardian RLS via gap_reports)
        const { data: diagnostics } = await supabase
          .from("diagnostic_results")
          .select("overall_score, readiness_level, strength_areas, gap_areas, created_at")
          .eq("student_profile_id", studentProfile.id)
          .order("created_at", { ascending: false })
          .limit(5);

        if (diagnostics && diagnostics.length > 0) {
          // Transform diagnostics into report-like summaries
          const reportSummaries: ReportSummary[] = diagnostics.map((d, i) => ({
            id: `diag-${i}`,
            title: `Diagnostic Assessment`,
            created_at: d.created_at,
            analysis_data: {
              overallAlignment: { percentage: d.overall_score },
              criticalGaps: d.gap_areas || [],
            },
          }));
          setReports(reportSummaries);
        }
      }

      // Fetch progress stats (has guardian RLS)
      const { data: stats } = await supabase
        .from("progress_stats")
        .select("overall_mastery, topics_completed, active_weeks")
        .eq("user_id", studentUserId)
        .maybeSingle();

      if (stats) {
        setProgressStats(stats);
      }

      setLoading(false);
    };

    fetchData();
  }, [studentUserId]);

  if (loading) {
    return (
      <div role="status" aria-live="polite" className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" aria-hidden="true" />
        <span className="sr-only">Loading progress…</span>
      </div>
    );
  }

  return (
    <section className="py-12 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Eye className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">
              <span className="text-primary">{studentName}</span>'s Progress
            </h1>
          </div>
          <p className="text-muted-foreground">Read-only view of educational progress and assessments</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Overall Progress */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Overall Progress</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-3">
                <div className="text-4xl font-bold text-primary">
                  {progressStats?.overall_mastery ?? 0}%
                </div>
                <Progress value={progressStats?.overall_mastery ?? 0} className="h-2" />
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <div className="text-xl font-semibold">{progressStats?.topics_completed ?? 0}</div>
                    <div className="text-xs text-muted-foreground">Topics Done</div>
                  </div>
                  <div>
                    <div className="text-xl font-semibold">{progressStats?.active_weeks ?? 0}</div>
                    <div className="text-xs text-muted-foreground">Weeks Active</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Latest Assessment */}
          {reports.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Latest Assessment</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-3">
                  <div className="text-4xl font-bold text-primary">
                    {reports[0].analysis_data.overallAlignment?.percentage ?? 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">Alignment Score</div>
                  <div className="text-xs text-muted-foreground">
                    <Clock className="inline h-3 w-3 mr-1" />
                    {new Date(reports[0].created_at).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric"
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Areas to Prepare */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Areas to Prepare</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {reports.length > 0 && reports[0].analysis_data.criticalGaps?.length ? (
                <ul className="space-y-2">
                  {reports[0].analysis_data.criticalGaps.slice(0, 4).map((gap, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5 shrink-0">•</span>
                      <span className="text-muted-foreground">{gap}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No specific gaps identified yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Assessment History */}
        {reports.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Assessment History
            </h3>
            <div className="space-y-3">
              {reports.map((report) => (
                <Card key={report.id} className="shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="font-medium">{report.title}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(report.created_at).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric"
                        })}
                      </div>
                    </div>
                    <Badge
                      className={
                        (report.analysis_data.overallAlignment?.percentage ?? 0) >= 80
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : (report.analysis_data.overallAlignment?.percentage ?? 0) >= 60
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                      }
                    >
                      {report.analysis_data.overallAlignment?.percentage ?? 0}% Aligned
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="text-center mt-8">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-full">
            <ShieldCheck className="h-4 w-4" />
            You have read-only access as a guardian
          </div>
        </div>
      </div>
    </section>
  );
};

export default GuardianDashboard;
