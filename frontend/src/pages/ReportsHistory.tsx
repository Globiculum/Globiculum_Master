import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Trash2, Eye, Loader2, Clock, Target, BookOpen, AlertTriangle, Calendar, Lightbulb, Download, GraduationCap, TrendingUp, Share2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { generateReportPDF } from "@/lib/generateReportPDF";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type GapItem = string | { topic: string; resourceUrl?: string };
const getGapTopic = (g: GapItem): string => (typeof g === "string" ? g : g.topic);

interface SubjectAnalysis {
  subject: string;
  topicsCovered: number;
  totalTopics: number;
  alignmentLevel: "strong" | "moderate" | "high_gap";
  keyGaps: GapItem[];
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
  criticalGaps: GapItem[];
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

interface SavedReport {
  id: string;
  title: string;
  form_data: Record<string, unknown>;
  analysis_data: AnalysisData;
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
  const [selectedReport, setSelectedReport] = useState<SavedReport | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
    fetchAssessments();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from("saved_reports" as any)
      .select("id, title, form_data, analysis_data, created_at")
      .eq("user_id", session.user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(`Failed to load reports: ${error.message}`);
      console.error(error);
    } else {
      setReports((data as unknown as SavedReport[]) || []);
    }
    setLoading(false);
  };

  const fetchAssessments = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data, error } = await supabase
      .from("assessments")
      .select("id, assessment_data, status, completed_at, created_at, student_profile_id")
      .eq("user_id", session.user.id)
      .eq("status", "completed")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

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

  const handleShare = async (reportId: string) => {
    setSharingId(reportId);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("You must be logged in to share");
        return;
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data, error } = await supabase
        .from("shared_reports" as any)
        .insert({
          report_id: reportId,
          user_id: userData.user.id,
          expires_at: expiresAt.toISOString(),
        } as any)
        .select("token")
        .single();

      if (error) throw error;

      const shareUrl = `${window.location.origin}/report/${(data as any).token}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied to clipboard! Valid for 7 days.");
    } catch (err) {
      console.error("Share error:", err);
      toast.error("Failed to generate share link");
    } finally {
      setSharingId(null);
    }
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

  const getAlignmentBadge = (level: string) => {
    switch (level) {
      case 'strong': 
        return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-xs">Strong</Badge>;
      case 'moderate': 
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-xs">Moderate</Badge>;
      case 'high_gap': 
        return <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-0 text-xs">High Gap</Badge>;
      default: 
        return <Badge variant="secondary" className="text-xs">Unknown</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Your Reports</h1>
              <p className="text-muted-foreground mt-1">View and manage your saved curriculum alignment reports</p>
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
                  const grade = data?.snapshotGrade;
                  const studentName = (data?.childName as string) || (data?.studentName as string) || `Grade ${String(grade || "N/A")} Student`;

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
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={sharingId === report.id}
                            onClick={() => handleShare(report.id)}
                            title="Share report"
                          >
                            {sharingId === report.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Share2 className="h-4 w-4" />
                            )}
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

      {/* Full Report Modal */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden w-full h-full md:h-auto md:w-auto fixed inset-0 md:inset-auto md:max-h-[90vh] rounded-none md:rounded-lg">
          <DialogHeader className="px-4 md:px-6 py-4 border-b bg-muted/30">
            <div className="flex items-start md:items-center justify-between gap-2 flex-col md:flex-row">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl">{selectedReport?.title}</DialogTitle>
                  {selectedReport && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Generated {formatDate(selectedReport.created_at)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mr-0 md:mr-8">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={sharingId === selectedReport?.id}
                  onClick={() => {
                    if (selectedReport) handleShare(selectedReport.id);
                  }}
                >
                  {sharingId === selectedReport?.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  ) : (
                    <Share2 className="h-4 w-4 mr-1.5" />
                  )}
                  Share Report
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (selectedReport) {
                      await generateReportPDF();
                      toast.success("PDF downloaded successfully!");
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  Download PDF
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[calc(100vh-120px)] md:max-h-[calc(90vh-120px)]">
            {selectedReport?.analysis_data && (
              <div className="p-4 md:p-6 space-y-6">
                {/* Quick Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold text-primary">
                        {selectedReport.analysis_data.overallAlignment?.percentage || 0}%
                      </div>
                      <div className="text-sm text-muted-foreground">Overall Alignment</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                        {selectedReport.analysis_data.overallAlignment?.subjectsNeedingBridge?.length || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Subjects Need Bridge</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="p-4 text-center">
                      <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        {selectedReport.analysis_data.overallAlignment?.estimatedDuration || "N/A"}
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
                    {selectedReport.analysis_data.subjectAnalysis?.map((subject, idx) => (
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
                                  subject.alignmentLevel === 'strong' ? 'bg-emerald-500' :
                                  subject.alignmentLevel === 'moderate' ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${(subject.topicsCovered / subject.totalTopics) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {subject.topicsCovered}/{subject.totalTopics}
                            </span>
                          </div>
                          {subject.keyGaps?.length > 0 && (
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">Gaps: </span>
                              {subject.keyGaps.map(getGapTopic).join(", ")}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Critical Gaps */}
                {selectedReport.analysis_data.criticalGaps?.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-rose-500" />
                      <h3 className="text-lg font-semibold">Critical Gaps</h3>
                    </div>
                    <Card className="bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800">
                      <CardContent className="p-4">
                        <ul className="space-y-1.5">
                          {selectedReport.analysis_data.criticalGaps.map((gap, idx) => (
                            <li key={idx} className="text-sm flex items-start gap-2">
                              <span className="text-rose-500 mt-1">•</span>
                              <span>{getGapTopic(gap)}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Bridge Timeline */}
                {selectedReport.analysis_data.bridgeTimeline && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Bridge Timeline</h3>
                    </div>
                    <div className="space-y-3">
                      {['phase1', 'phase2', 'phase3'].map((phaseKey, idx) => {
                        const phase = selectedReport.analysis_data.bridgeTimeline[phaseKey as keyof typeof selectedReport.analysis_data.bridgeTimeline];
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
                {selectedReport.analysis_data.recommendations && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-amber-500" />
                      <h3 className="text-lg font-semibold">Recommendations</h3>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      {selectedReport.analysis_data.recommendations.study?.length > 0 && (
                        <Card className="border">
                          <CardContent className="p-4">
                            <h4 className="font-medium text-sm mb-2">Study Tips</h4>
                            <ul className="space-y-1">
                              {selectedReport.analysis_data.recommendations.study.map((rec, idx) => (
                                <li key={idx} className="text-sm text-muted-foreground">• {rec}</li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}
                      {selectedReport.analysis_data.recommendations.skillStrategy?.length > 0 && (
                        <Card className="border">
                          <CardContent className="p-4">
                            <h4 className="font-medium text-sm mb-2">Skill Strategy</h4>
                            <ul className="space-y-1">
                              {selectedReport.analysis_data.recommendations.skillStrategy.map((rec, idx) => (
                                <li key={idx} className="text-sm text-muted-foreground">• {rec}</li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}
                      {selectedReport.analysis_data.recommendations.resources?.length > 0 && (
                        <Card className="border">
                          <CardContent className="p-4">
                            <h4 className="font-medium text-sm mb-2">Resources</h4>
                            <ul className="space-y-1">
                              {selectedReport.analysis_data.recommendations.resources.map((rec, idx) => (
                                <li key={idx} className="text-sm text-muted-foreground">• {rec}</li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}
                      {selectedReport.analysis_data.recommendations.culturalLanguage?.length > 0 && (
                        <Card className="border">
                          <CardContent className="p-4">
                            <h4 className="font-medium text-sm mb-2">Cultural & Language</h4>
                            <ul className="space-y-1">
                              {selectedReport.analysis_data.recommendations.culturalLanguage.map((rec, idx) => (
                                <li key={idx} className="text-sm text-muted-foreground">• {rec}</li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default ReportsHistory;
