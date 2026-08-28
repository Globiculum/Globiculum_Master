import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Trash2, Eye, Loader2, Clock, Target, GraduationCap, TrendingUp, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Only the slice of the saved analysis this list view actually reads (the
// alignment badge). "View Full Report" hands the whole blob off to
// ReportPreview.tsx via navigation state, which has its own full AnalysisData
// type — this file doesn't need to duplicate that shape.
interface SavedReportAnalysis {
  overallAlignment?: {
    percentage?: number;
  };
}

interface SavedReport {
  id: string;
  title: string;
  form_data: Record<string, unknown>;
  analysis_data: SavedReportAnalysis;
  created_at: string;
}

interface AssessmentRecord {
  id: string;
  assessment_data: Record<string, unknown>;
  status: string;
  completed_at: string;
  created_at: string;
  student_profile_id: string;
  student_profiles?: {
    student_name: string;
  };
}

const ReportsHistory = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
    fetchAssessments();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("saved_reports" as any)
      .select("id, title, form_data, analysis_data, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load reports");
      console.error(error);
    } else {
      setReports((data as unknown as SavedReport[]) || []);
    }
    setLoading(false);
  };

  const fetchAssessments = async () => {
    const { data, error } = await supabase
      .from("assessments")
      .select("id, assessment_data, status, completed_at, created_at, student_profile_id, student_profiles(student_name)")
      .eq("status", "completed")
      .is("deleted_at", null)
      .order("completed_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch assessments:", error);
    } else {
      setAssessments((data as unknown as AssessmentRecord[]) || []);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from("saved_reports" as any).delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete report");
    } else {
      setReports((prev) => prev.filter((r) => r.id !== id));
      toast.success("Report deleted");
    }
    setDeletingId(null);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getReportSummary = (report: SavedReport) => {
    const formData = report.form_data as Record<string, unknown>;
    const analysis = report.analysis_data;
    
    return {
      grade: formData.snapshotGrade as string | undefined,
      stage: formData.schoolStage as string | undefined,
      alignment: analysis?.overallAlignment?.percentage,
    };
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section id="main-content" tabIndex={-1} className="py-12 outline-none md:py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Your Reports</h1>
              <p className="font-body text-muted-foreground mt-1">View and manage your saved curriculum alignment reports</p>
            </div>
            <Button onClick={() => navigate("/begin-journey")}>
              <FileText className="h-4 w-4 mr-2" />
              New Report
            </Button>
          </div>

          {/* Assessment Results Section */}
          {assessments.length > 0 && (
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <GraduationCap className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Assessment Results</h2>
                <Badge variant="secondary" className="ml-1">{assessments.length}</Badge>
              </div>
              <div className="space-y-4">
                {assessments.map((assessment) => {
                  const data = assessment.assessment_data as Record<string, unknown>;
                  const analysisResult = data?.analysisResult as Record<string, unknown> | undefined;
                  const overallAlignment = (analysisResult?.overallAlignment as Record<string, unknown>)?.percentage as number | undefined;
                  const studentName = (assessment as any).student_profiles?.student_name || "Student";
                  const grade = data?.snapshotGrade;

                  return (
                    <Card key={assessment.id} className="hover:border-primary/50 transition-colors">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <GraduationCap className="h-4 w-4 text-primary" />
                              {studentName}
                            </CardTitle>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{formatDate(assessment.completed_at)}</span>
                              </div>
                              {grade && (
                                <span>Grade {String(grade)}</span>
                              )}
                            </div>
                          </div>
                          {overallAlignment !== undefined && (
                            <div className="flex flex-col items-end gap-1">
                              <Badge
                                className={
                                  overallAlignment >= 80
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                    : overallAlignment >= 60
                                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                      : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                                }
                              >
                                {overallAlignment}% Aligned
                              </Badge>
                              <Progress value={overallAlignment} className="w-24 h-1.5" />
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {assessment.status}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/report-preview?assessmentId=${assessment.id}`, {
                              state: {
                                formData: assessment.assessment_data,
                                savedAnalysis: (assessment.assessment_data as any)?.analysisResult,
                              }
                            })}
                          >
                            <Eye className="h-4 w-4 mr-1.5" />
                            View Report
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </CardContent>
            </Card>
          ) : reports.length === 0 && assessments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
                <div className="p-4 bg-muted rounded-full">
                  <FileText className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No Reports Yet</h3>
                <p className="text-muted-foreground text-center max-w-sm">
                  Complete an assessment to generate your first curriculum alignment report.
                </p>
                <Button onClick={() => navigate("/begin-journey")}>Start Assessment</Button>
              </CardContent>
            </Card>
          ) : reports.length > 0 ? (
            <div className="space-y-4">
              {reports.map((report) => {
                const summary = getReportSummary(report);
                return (
                  <Card key={report.id} className="hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{report.title}</CardTitle>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{formatDate(report.created_at)}</span>
                          </div>
                        </div>
                        {summary.alignment !== undefined && (
                          <Badge
                            className={
                              summary.alignment >= 80
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : summary.alignment >= 60
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                  : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                            }
                          >
                            {summary.alignment}% Aligned
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {summary.stage && (
                            <div className="flex items-center gap-1.5">
                              <Target className="h-3.5 w-3.5" />
                              <span className="capitalize">{summary.stage}</span>
                            </div>
                          )}
                          {summary.grade && (
                            <span>Grade {summary.grade}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigate("/report-preview", {
                                state: {
                                  formData: report.form_data,
                                  savedAnalysis: report.analysis_data,
                                  savedReportId: report.id,
                                },
                              })
                            }
                          >
                            <Eye className="h-4 w-4 mr-1.5" />
                            View Full Report
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Navigate to assessment form with pre-filled data and prev_report_id
                              navigate("/begin-journey", {
                                state: {
                                  prefillFormData: report.form_data,
                                  prevReportId: report.id,
                                },
                              });
                            }}
                          >
                            <RotateCcw className="h-4 w-4 mr-1.5" />
                            Retake
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Report?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete this report. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(report.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {deletingId === report.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Delete"
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ReportsHistory;
