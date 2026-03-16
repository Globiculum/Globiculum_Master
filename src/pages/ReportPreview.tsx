import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FileText, Download, ArrowLeft, Target, BookOpen, Clock, Lightbulb, AlertTriangle, Loader2, TrendingUp, Calendar, GraduationCap, Globe, Info, ExternalLink, GitCompareArrows, ChevronDown, ChevronRight, Layers } from "lucide-react";
import ReportComparison from "@/components/ReportComparison";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateReportPDF } from "@/lib/generateReportPDF";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { getSyllabusReferenceForTopic, parseRecommendationWithLinks } from "@/lib/syllabusReferences";

// Goals that involve Indian academic readiness - show TRE for these
const INDIA_READINESS_GOALS = [
  // New transition pathways
  "india-cbse",
  "india-igcse",
  "india-ib",
  // Legacy values (safe fallback)
  "cbse",
  "icse",
  "state_boards",
  "indian_boards",
  "smooth_indian_school_reintegration",
  "dual_prep_excellence",
  "academic_foundations_strengthening",
  "cultural_language_immersion",
  "dual-prep",
  "india-reintegration",
  "academic-foundations",
  "cultural-language",
  "international",
  "indian-boards",
  // Common variations
  "indian board preparation",
  "cbse preparation",
  "icse preparation",
  "state board preparation",
  "smooth reintegration into indian schools",
  "dual-prep excellence",
  "academic foundations",
  "cultural & language immersion",
];

// Check if the goal involves Indian academic readiness
const isIndiaReadinessGoal = (targetGoal?: string): boolean => {
  if (!targetGoal) return true; // Default to showing TRE if no goal specified
  const normalizedGoal = targetGoal.toLowerCase().trim();
  return INDIA_READINESS_GOALS.some(goal => 
    normalizedGoal.includes(goal.toLowerCase()) || goal.toLowerCase().includes(normalizedGoal)
  );
};

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

const STORAGE_KEY_FORM = 'assessment-form-data';
const STORAGE_KEY_ANALYSIS = 'saved-report-analysis';
const STORAGE_KEY_REPORT_ID = 'saved-report-id';

const ReportPreview = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Try location.state first, fallback to sessionStorage, then localStorage
  const getFormData = () => {
    // Priority 1: Navigation state
    if (location.state?.formData && Object.keys(location.state.formData).length > 0) {
      console.log("[ReportPreview] Using formData from navigation state");
      // Persist to storage for page refresh resilience
      try {
        sessionStorage.setItem(STORAGE_KEY_FORM, JSON.stringify(location.state.formData));
        localStorage.setItem(STORAGE_KEY_FORM, JSON.stringify(location.state.formData));
      } catch (e) {
        console.warn("[ReportPreview] Failed to persist formData to storage:", e);
      }
      return location.state.formData;
    }
    
    // Priority 2: Session storage
    const sessionStored = sessionStorage.getItem(STORAGE_KEY_FORM);
    if (sessionStored) {
      try {
        const parsed = JSON.parse(sessionStored);
        if (parsed && Object.keys(parsed).length > 0) {
          console.log("[ReportPreview] Using formData from sessionStorage");
          return parsed;
        }
      } catch {
        console.warn("[ReportPreview] Failed to parse sessionStorage formData");
      }
    }
    
    // Priority 3: Local storage (survives browser close)
    const localStored = localStorage.getItem(STORAGE_KEY_FORM);
    if (localStored) {
      try {
        const parsed = JSON.parse(localStored);
        if (parsed && Object.keys(parsed).length > 0) {
          console.log("[ReportPreview] Using formData from localStorage");
          // Restore to sessionStorage
          sessionStorage.setItem(STORAGE_KEY_FORM, localStored);
          return parsed;
        }
      } catch {
        console.warn("[ReportPreview] Failed to parse localStorage formData");
      }
    }
    
    console.warn("[ReportPreview] No formData found in any storage");
    return {};
  };

  const getSavedAnalysis = (): AnalysisData | null => {
    // Priority 1: Navigation state (from saved reports page)
    if (location.state?.savedAnalysis) {
      console.log("[ReportPreview] Using savedAnalysis from navigation state");
      return location.state.savedAnalysis as AnalysisData;
    }
    
    // Priority 2: Session storage
    const stored = sessionStorage.getItem(STORAGE_KEY_ANALYSIS);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log("[ReportPreview] Using savedAnalysis from sessionStorage");
        // Clear after reading so refresh triggers new analysis
        sessionStorage.removeItem(STORAGE_KEY_ANALYSIS);
        sessionStorage.removeItem(STORAGE_KEY_REPORT_ID);
        return parsed as AnalysisData;
      } catch {
        console.warn("[ReportPreview] Failed to parse sessionStorage analysis");
        return null;
      }
    }
    
    return null;
  };
  
  const formData = getFormData();
  const initialSavedAnalysis = getSavedAnalysis();
  const hasValidFormData = formData && Object.keys(formData).length > 0;
  
  const [isLoading, setIsLoading] = useState(!initialSavedAnalysis && hasValidFormData);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(initialSavedAnalysis);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(!!initialSavedAnalysis);
  const [redirecting, setRedirecting] = useState(false);
  const [previousReport, setPreviousReport] = useState<{ analysis_data: AnalysisData; created_at: string } | null>(null);
  
  const prevReportId = location.state?.prevReportId as string | undefined;

  // Redirect if no valid form data
  useEffect(() => {
    if (!hasValidFormData && !initialSavedAnalysis && !redirecting) {
      console.log("[ReportPreview] No assessment data found, redirecting to assessment");
      setRedirecting(true);
      toast.error("No assessment data found. Please complete the assessment first.");
      
      // Small delay so user sees the message
      const timer = setTimeout(() => {
        navigate("/begin-journey", { replace: true });
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [hasValidFormData, initialSavedAnalysis, navigate, redirecting]);

  // Fetch previous report for comparison
  useEffect(() => {
    if (!prevReportId) return;
    const fetchPrev = async () => {
      const { data, error } = await supabase
        .from("saved_reports" as any)
        .select("analysis_data, created_at")
        .eq("id", prevReportId)
        .single();
      if (!error && data) {
        setPreviousReport(data as any);
      }
    };
    fetchPrev();
  }, [prevReportId]);

  useEffect(() => {
    let cancelled = false;

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const normalizeOther = (value: unknown, otherValue: unknown) => {
      if (typeof value !== "string") return undefined;
      if (value === "other") {
        const v = typeof otherValue === "string" ? otherValue.trim() : "";
        return v || undefined;
      }
      return value || undefined;
    };

    const buildCurriculumFormData = (raw: any) => {
      const gradeRaw = raw?.snapshotGrade;
      const gradeNum =
        typeof gradeRaw === "number"
          ? gradeRaw
          : typeof gradeRaw === "string"
            ? Number(gradeRaw)
            : NaN;

      const snapshotGrade = Number.isFinite(gradeNum) ? gradeNum : undefined;

      const snapshotLocation =
        raw?.snapshotLocation === "other"
          ? (typeof raw?.snapshotLocationOther === "string" ? raw.snapshotLocationOther.trim() : "")
          : raw?.snapshotLocation;

      const usState = normalizeOther(raw?.usState, raw?.usStateOther);
      const currentCurriculum = normalizeOther(raw?.currentCurriculum, raw?.currentCurriculumOther);
      const targetGoal = normalizeOther(raw?.targetGoal, raw?.targetGoalOther);

      const languages = [
        ...(Array.isArray(raw?.languagesSpoken)
          ? raw.languagesSpoken
          : Array.isArray(raw?.selectedLanguages)
            ? raw.selectedLanguages
            : Array.isArray(raw?.languagesAtHome)
              ? raw.languagesAtHome
              : []),
        ...(typeof raw?.customLanguage === "string" && raw.customLanguage.trim()
          ? [raw.customLanguage.trim()]
          : []),
      ]
        .filter((x: any): x is string => typeof x === "string" && x.trim().length > 0)
        .map((s) => s.trim());

      const uniqueLanguages = Array.from(new Set(languages));

      return {
        schoolStage: typeof raw?.schoolStage === "string" ? raw.schoolStage : undefined,
        snapshotGrade,
        snapshotLocation: typeof snapshotLocation === "string" ? snapshotLocation : undefined,
        usState,
        previousCountry:
          raw?.previousLocation === "other"
            ? (typeof raw?.previousLocationOther === "string" ? raw.previousLocationOther.trim() : undefined)
            : undefined,
        currentCurriculum,
        targetGoal,
        academicPath: Array.isArray(raw?.academicPath) ? raw.academicPath : undefined,
        strongestSubjects: Array.isArray(raw?.strongestSubjects) ? raw.strongestSubjects : undefined,
        challengingAreas: Array.isArray(raw?.challengingAreas)
          ? raw.challengingAreas
          : Array.isArray(raw?.challengingSubjects)
            ? raw.challengingSubjects
            : undefined,
        languagesSpoken: uniqueLanguages.length ? uniqueLanguages : undefined,
        transitionTimeline:
          typeof raw?.transitionTimeline === "string"
            ? raw.transitionTimeline
            : typeof raw?.timeline === "string"
              ? raw.timeline
              : undefined,
      };
    };

    const getValidAccessToken = async (): Promise<string | null> => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) return null;

      const expiresAtMs = session.expires_at ? session.expires_at * 1000 : null;
      if (expiresAtMs && expiresAtMs < Date.now() + 60_000) {
        const { data: refreshed, error } = await supabase.auth.refreshSession();
        if (error || !refreshed.session) return null;
        return refreshed.session.access_token;
      }

      return session.access_token;
    };

    const parseFunctionError = (fnError: any): { status?: number; message: string } => {
      const status = fnError?.context?.status as number | undefined;
      const body = fnError?.context?.body;

      // Best-effort JSON parsing of standardized error responses
      try {
        const parsed = typeof body === "string" ? JSON.parse(body) : body;
        const msg = parsed?.error?.message;
        const code = parsed?.error?.code;
        const firstDetail = parsed?.error?.details?.[0]?.message;
        const pretty = [msg, firstDetail].filter(Boolean).join(" — ");
        return {
          status,
          message: pretty || code || fnError?.message || "Request failed",
        };
      } catch {
        return {
          status,
          message: (typeof body === "string" && body.trim()) || fnError?.message || "Request failed",
        };
      }
    };

    const saveReportToDatabase = async (analysisData: AnalysisData) => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const insertPayload: any = {
          user_id: userData.user.id,
          form_data: formData,
          analysis_data: analysisData as unknown as Record<string, unknown>,
          title: `Curriculum Alignment Report - Grade ${formData.snapshotGrade || "N/A"}`,
        };
        if (prevReportId) {
          insertPayload.prev_report_id = prevReportId;
        }
        const { data: savedReport, error: saveError } = await supabase.from("saved_reports" as any).insert(insertPayload).select("id").single();

        if (saveError) {
          console.error("Failed to save report:", saveError);
        } else {
          setIsSaved(true);
          toast.success("Report saved to your history");

          // Fire-and-forget: send report summary email
          const analysis = analysisData as Record<string, any>;
          const overallAlignment = analysis?.overallAlignment;
          const criticalGaps = analysis?.criticalGaps;

          // Fetch student name for email
          const { data: studentProfile } = await supabase
            .from("student_profiles")
            .select("student_name")
            .eq("user_id", userData.user.id)
            .maybeSingle();

          supabase.functions.invoke("send-report-email", {
            body: {
              reportId: (savedReport as any)?.id ?? "unknown",
              studentName: studentProfile?.student_name ?? formData.snapshotGrade ? `Grade ${formData.snapshotGrade} Student` : "Your Child",
              overallAlignmentPercentage: typeof overallAlignment?.percentage === "number" ? overallAlignment.percentage : 0,
              criticalGapCount: Array.isArray(criticalGaps) ? criticalGaps.length : 0,
              estimatedBridgeDuration: overallAlignment?.estimatedDuration ?? "3–6 months",
              reportTitle: `Curriculum Alignment Report - Grade ${formData.snapshotGrade || "N/A"}`,
            },
          }).then(({ error }) => {
            if (error) console.error("[ReportPreview] Email send failed:", error);
            else console.log("[ReportPreview] Report summary email sent");
          }).catch((err) => {
            console.error("[ReportPreview] Email fire-and-forget error:", err);
          });
        }

        // Also update the assessment record with the full analysis result
        const assessmentId = location.state?.assessmentId;
        if (assessmentId) {
          const { error: updateError } = await supabase
            .from("assessments")
            .update({
              assessment_data: { ...formData, analysisResult: analysisData } as any,
              status: "completed",
            })
            .eq("id", assessmentId);

          if (updateError) {
            console.error("Failed to update assessment with analysis:", updateError);
          } else {
            console.log("[ReportPreview] Assessment updated with analysis result");
          }
        }
      } catch (err) {
        console.error("Error saving report:", err);
      }
    };

    const analyzeAlignment = async () => {
      // Skip if redirecting due to missing data
      if (!hasValidFormData) {
        console.log("[ReportPreview] Skipping analysis - no valid form data");
        return;
      }
      
      // Skip if we already have a saved analysis
      if (initialSavedAnalysis) {
        console.log("[ReportPreview] Using saved analysis from state/storage");
        setIsLoading(false);
        return;
      }

      const MAX_RETRIES = 2;

      setIsLoading(true);
      setError(null);
      setAnalysis(null);

      console.log("[ReportPreview] Starting curriculum analysis with form data:", formData);

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        console.log(`[ReportPreview] Attempt ${attempt + 1}/${MAX_RETRIES + 1}`);
        
        try {
          const accessToken = await getValidAccessToken();
          if (!accessToken) {
            console.error("[ReportPreview] No valid access token, redirecting to auth");
            await supabase.auth.signOut();
            navigate("/auth", { replace: true });
            return;
          }

          const safeFormData = buildCurriculumFormData(formData);
          console.log("[ReportPreview] Sending sanitized payload:", safeFormData);

          const { data, error: fnError } = await supabase.functions.invoke("analyze-curriculum", {
            body: { formData: safeFormData },
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "X-API-Version": "v1",
            },
          });

          console.log("[ReportPreview] Response received:", { data, fnError });

          if (fnError) {
            const { status, message } = parseFunctionError(fnError);
            console.error("[ReportPreview] Function error:", { status, message, fnError });

            // Retry once on auth/network-ish failures
            if ((status === 401 || status === 500) && attempt < MAX_RETRIES) {
              console.log("[ReportPreview] Retrying due to status", status);
              await sleep(800 + attempt * 700);
              continue;
            }

            throw new Error(message);
          }

          // Handle wrapped response format from createSuccessResponse
          const responseData = (data as any)?.data ?? data;
          
          if ((responseData as any)?.error) {
            const errMsg = (responseData as any).error.message || (responseData as any).error;
            console.error("[ReportPreview] Response contains error:", errMsg);
            throw new Error(errMsg);
          }

          const nextAnalysis = responseData?.analysis;
          console.log("[ReportPreview] Extracted analysis:", nextAnalysis);
          
          if (!nextAnalysis) {
            console.error("[ReportPreview] No analysis in response. Full response:", data);
            throw new Error("No analysis data received from AI. Please try again.");
          }

          if (!cancelled) {
            console.log("[ReportPreview] Setting analysis and saving to database");
            setAnalysis(nextAnalysis);
            // Auto-save the report
            saveReportToDatabase(nextAnalysis);
          }
          return;
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to analyze curriculum";
          console.error("[ReportPreview] Catch block error:", message, err);

          // Retry only on fetch-like failures
          const retryable =
            attempt < MAX_RETRIES &&
            (err instanceof TypeError || message.toLowerCase().includes("fetch") || message.toLowerCase().includes("network"));

          if (retryable) {
            console.log("[ReportPreview] Retrying due to network error");
            await sleep(1000 + attempt * 800);
            continue;
          }

          if (!cancelled) {
            setError(message);
            toast.error(message);
          }
          return;
        } finally {
          if (!cancelled) {
            setIsLoading(false);
          }
        }
      }

      if (!cancelled) setIsLoading(false);
    };

    analyzeAlignment();

    return () => {
      cancelled = true;
    };
  }, [formData, navigate, hasValidFormData, initialSavedAnalysis]);

  const handleDownloadPDF = () => {
    if (!analysis) return;
    generateReportPDF(analysis, formData);
    toast.success("PDF downloaded successfully!");
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
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assessment
          </Button>

          {redirecting ? (
            <Card className="border border-border">
              <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
                <div className="relative">
                  <div className="relative p-4 bg-muted rounded-full">
                    <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-semibold">No Assessment Data Found</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Redirecting you to the assessment form...
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <Card className="border border-border">
              <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                  <div className="relative p-4 bg-primary/10 rounded-full">
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-semibold">Analyzing Transition Readiness</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    AI is comparing curricula and generating personalized recommendations...
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>This usually takes 10-20 seconds</span>
                </div>
              </CardContent>
            </Card>
          ) : error ? (
            <Card className="border border-destructive/20">
              <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
                <div className="p-3 bg-destructive/10 rounded-full">
                  <AlertTriangle className="h-10 w-10 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold">Analysis Failed</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">{error}</p>
                <Button onClick={() => window.location.reload()} size="sm">Try Again</Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-border">
            {/* A. Header */}
              <CardHeader className="text-center py-6 bg-muted/30 border-b border-border">
                <div className="flex justify-center mb-3">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-2xl">
                  {isIndiaReadinessGoal(formData.targetGoal) 
                    ? "Your Transition Readiness Report" 
                    : "Your Curriculum Analysis Report"}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  AI-powered analysis based on your child's educational journey
                </p>
              </CardHeader>
              
              <CardContent className="space-y-6 pt-6">
                {/* B. Student Snapshot - Compact */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Student Snapshot</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {formData.schoolStage && (
                      <div className="p-2 bg-muted/50 rounded-md">
                        <div className="text-xs text-muted-foreground">Stage</div>
                        <div className="font-medium text-sm capitalize">{formData.schoolStage}</div>
                      </div>
                    )}
                    {formData.snapshotGrade && (
                      <div className="p-2 bg-muted/50 rounded-md">
                        <div className="text-xs text-muted-foreground">Grade</div>
                        <div className="font-medium text-sm">Grade {formData.snapshotGrade}</div>
                      </div>
                    )}
                    {formData.snapshotLocation && (
                      <div className="p-2 bg-muted/50 rounded-md">
                        <div className="text-xs text-muted-foreground">Location</div>
                        <div className="font-medium text-sm capitalize truncate">
                          {formData.snapshotLocation === "us" 
                            ? `US${formData.usState ? ` - ${formData.usState}` : ""}`
                            : formData.snapshotLocation}
                        </div>
                      </div>
                    )}
                    {formData.currentCurriculum && (
                      <div className="p-2 bg-muted/50 rounded-md">
                        <div className="text-xs text-muted-foreground">Curriculum</div>
                        <div className="font-medium text-sm truncate">{formData.currentCurriculum}</div>
                      </div>
                    )}
                  </div>
                  {formData.academicPath && formData.academicPath.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {formData.academicPath.map((subject: string) => (
                        <Badge key={subject} variant="secondary" className="px-2 py-0.5 text-xs">
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* C. Quick Overview Summary - 3 Horizontal Boxes */}
                {analysis && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 text-center">
                      <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{analysis.overallAlignment.percentage}%</div>
                      {isIndiaReadinessGoal(formData.targetGoal) ? (
                        <div className="flex items-center justify-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                          <span>Transition Readiness Estimate</span>
                          <HoverCard>
                            <HoverCardTrigger asChild>
                              <button className="inline-flex items-center justify-center hover:opacity-70 transition-opacity">
                                <Info className="h-3.5 w-3.5" />
                              </button>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-72 text-left" side="top">
                              <div className="space-y-2">
                                <h4 className="text-sm font-semibold">How to read this estimate</h4>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  This reflects how your child's current curriculum compares with typical Indian grade-level topics. It is meant to guide preparation for transition — not to judge academic performance or test results.
                                </p>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        </div>
                      ) : (
                        <div className="text-xs text-blue-600 dark:text-blue-400">Coverage Score</div>
                      )}
                    </div>
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 text-center">
                      <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                      <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                        {(() => {
                          const isHighSchool11Plus = formData.schoolStage === "high" && parseInt(formData.snapshotGrade) >= 11;
                          const filtered = analysis.subjectAnalysis.filter(s => {
                            if (s.alignmentLevel === 'strong') return false;
                            // For high school 11-12, don't count social studies unless humanities stream
                            if (isHighSchool11Plus) {
                              const isSocialStudy = /social|history|civics|geography/i.test(s.subject);
                              const isHumanities = formData.academicPath?.some?.((p: string) => /humanities|history|political/i.test(p));
                              if (isSocialStudy && !isHumanities) return false;
                            }
                            return true;
                          });
                          return `${filtered.length} Subject${filtered.length !== 1 ? 's' : ''}`;
                        })()}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">Need Preparation</div>
                    </div>
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 text-center">
                      <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                      <div className="text-lg font-bold text-blue-700 dark:text-blue-300">{analysis.overallAlignment.estimatedDuration}</div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">Estimated Duration</div>
                    </div>
                  </div>
                )}

                {/* D. Coverage Analysis - with toggle for subjects needing prep */}
                {analysis && (() => {
                  const subjectsNeedingPrep = analysis.subjectAnalysis.filter(s => s.alignmentLevel !== 'strong');
                  const strongSubjects = analysis.subjectAnalysis.filter(s => s.alignmentLevel === 'strong');
                  return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Coverage Analysis</h3>
                    </div>
                    
                    {/* Subjects needing preparation - collapsible */}
                    {subjectsNeedingPrep.length > 0 && (
                      <Collapsible defaultOpen={true}>
                        <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/30 transition-colors">
                          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                            {subjectsNeedingPrep.length} subject{subjectsNeedingPrep.length !== 1 ? 's' : ''} needing preparation
                          </span>
                          <ChevronDown className="h-4 w-4 ml-auto text-amber-600 dark:text-amber-400 transition-transform [[data-state=closed]_&]:rotate-[-90deg]" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                            {subjectsNeedingPrep.map((subject) => (
                              <div key={subject.subject} className="p-3 bg-muted/30 rounded-lg border border-border">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-sm">{subject.subject}</span>
                                  {getAlignmentBadge(subject.alignmentLevel)}
                                </div>
                                <div className="text-xs text-muted-foreground mb-2">
                                  Coverage: <span className="font-semibold text-foreground">{subject.topicsCovered}/{subject.totalTopics}</span> topics
                                </div>
                                {subject.keyGaps.length > 0 && (
                                  <div className="space-y-1">
                                    <div className="text-xs font-medium text-muted-foreground">Key Missing Topics:</div>
                                    <ul className="text-xs text-muted-foreground space-y-1">
                                      {subject.keyGaps.slice(0, 3).map((gap, i) => {
                                        const syllabusRef = isIndiaReadinessGoal(formData.targetGoal) 
                                          ? getSyllabusReferenceForTopic(gap, subject.subject) 
                                          : null;
                                        return (
                                          <li key={i} className="flex items-start gap-1">
                                            <span className="mt-0.5">•</span>
                                            <span className="flex-1">
                                              {gap}
                                              {syllabusRef && (
                                                <a
                                                  href={syllabusRef.url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="inline-flex items-center gap-0.5 text-primary hover:underline ml-1 text-[11px]"
                                                  title={syllabusRef.label}
                                                >
                                                  <ExternalLink className="h-3 w-3 inline" />
                                                  <span>{syllabusRef.label}</span>
                                                </a>
                                              )}
                                            </span>
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* Strong subjects - compact display */}
                    {strongSubjects.length > 0 && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Strong alignment ({strongSubjects.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {strongSubjects.map((s) => (
                            <Badge key={s.subject} className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-xs">
                              {s.subject} — {s.topicsCovered}/{s.totalTopics}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })()}

                {/* D2. Stream Readiness for High School 11-12 */}
                {analysis && formData.schoolStage === "high" && parseInt(formData.snapshotGrade) >= 11 && (() => {
                  // Determine stream readiness from selected subjects
                  const subjects = formData.academicPath || [];
                  const subjectAnalysis = analysis.subjectAnalysis || [];
                  
                  const getReadiness = (keywords: RegExp): "strong" | "moderate" | "preparation" => {
                    const matched = subjectAnalysis.find(s => keywords.test(s.subject));
                    if (!matched) return "preparation";
                    if (matched.alignmentLevel === "strong") return "strong";
                    if (matched.alignmentLevel === "moderate") return "moderate";
                    return "preparation";
                  };

                  const hasSubject = (keywords: RegExp) => subjects.some((s: string) => keywords.test(s));

                  const streamSubjects = [
                    { name: "Mathematics", check: /math|algebra|calculus|geometry|pre-calculus/i, readiness: getReadiness(/math/i) },
                    { name: "Physics", check: /physics/i, readiness: hasSubject(/physics/i) ? getReadiness(/physics/i) : "preparation" },
                    { name: "Chemistry", check: /chemistry/i, readiness: hasSubject(/chemistry/i) ? getReadiness(/chemistry/i) : "preparation" },
                    { name: "Biology", check: /biology/i, readiness: hasSubject(/biology/i) ? getReadiness(/biology/i) : "preparation" },
                    { name: "Economics / Commerce", check: /economics|commerce|business/i, readiness: hasSubject(/economics|commerce/i) ? getReadiness(/economics/i) : "preparation" },
                    { name: "Computer Science", check: /computer|cs|coding/i, readiness: hasSubject(/computer|cs|coding/i) ? getReadiness(/computer/i) : "preparation" },
                  ].filter(s => hasSubject(s.check) || s.name === "Mathematics");

                  const readinessColors = {
                    strong: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
                    moderate: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
                    preparation: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800",
                  };
                  const readinessLabels = { strong: "Strong Readiness", moderate: "Moderate Readiness", preparation: "Preparation Required" };

                  // Suggest streams
                  const pcmReady = streamSubjects.filter(s => /math|physics|chemistry/i.test(s.name)).every(s => s.readiness !== "preparation");
                  const pcbReady = streamSubjects.filter(s => /math|physics|chemistry|biology/i.test(s.name) && !/computer/i.test(s.name)).some(s => /biology/i.test(s.name) && s.readiness !== "preparation");

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">Recommended Stream Readiness</h3>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Based on your US coursework, here's how your child aligns with Indian Grade 11–12 streams.
                        University Entrance Test/AP courses are treated as rigor indicators.
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {streamSubjects.map((s) => (
                          <div key={s.name} className={`p-3 rounded-lg border text-center ${readinessColors[s.readiness]}`}>
                            <div className="text-sm font-semibold">{s.name}</div>
                            <div className="text-xs mt-1">{readinessLabels[s.readiness]}</div>
                          </div>
                        ))}
                      </div>
                      {/* Stream suggestion */}
                      <div className="p-3 bg-muted/30 rounded-lg border border-border">
                        <div className="text-sm font-medium mb-1">Suggested Stream Alignment</div>
                        <div className="flex flex-wrap gap-2">
                          {pcmReady && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">PCM (Science – Math)</Badge>}
                          {pcbReady && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">PCB (Science – Bio)</Badge>}
                          {hasSubject(/economics|commerce|business/i) && <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">Commerce</Badge>}
                          {!pcmReady && !pcbReady && <Badge variant="secondary">Needs further assessment</Badge>}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* D3. Social Studies Context for below Grade 10 */}
                {analysis && formData.schoolStage !== "high" && (() => {
                  const socialStudy = analysis.subjectAnalysis.find(s => /social|history|civics|geography/i.test(s.subject));
                  if (!socialStudy || socialStudy.alignmentLevel === "strong") return null;
                  return (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-1">
                        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Social Studies Transition Note</span>
                      </div>
                      <p className="text-xs text-blue-700 dark:text-blue-400">
                        Indian social science covers Indian history, civics & governance, and geography — which differs from US social studies.
                        A 2–3 month refresher on Indian social science concepts is recommended rather than extensive gap bridging.
                      </p>
                    </div>
                  );
                })()}

                {/* E. Critical Gaps - Grouped by category */}
                {analysis && analysis.criticalGaps.length > 0 && (() => {
                  // Group gaps by detected category keywords
                  const groupGaps = (gaps: string[]) => {
                    const groups: Record<string, string[]> = {};
                    const categoryPatterns: [string, RegExp][] = [
                      ["Mathematical & Problem-Solving Gaps", /math|algebra|geometry|calculus|trigonometry|arithmetic|equation|number/i],
                      ["Scientific Reasoning Gaps", /science|physics|chemistry|biology|experiment|lab|scientific/i],
                      ["Language & Communication Gaps", /language|hindi|sanskrit|english|reading|writing|grammar|vocabulary|comprehension/i],
                      ["Social Studies & Humanities Gaps", /history|geography|civics|social|economics|political/i],
                    ];
                    const ungrouped: string[] = [];
                    
                    for (const gap of gaps) {
                      let matched = false;
                      for (const [category, pattern] of categoryPatterns) {
                        if (pattern.test(gap)) {
                          if (!groups[category]) groups[category] = [];
                          groups[category].push(gap);
                          matched = true;
                          break;
                        }
                      }
                      if (!matched) ungrouped.push(gap);
                    }
                    if (ungrouped.length > 0) groups["Other Transition Gaps"] = ungrouped;
                    return groups;
                  };
                  
                  const groupedGaps = groupGaps(analysis.criticalGaps);
                  
                  return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                      <h3 className="text-lg font-semibold">Critical Gaps Identified</h3>
                    </div>
                    <div className="space-y-3">
                      {Object.entries(groupedGaps).map(([category, gaps]) => (
                        <div key={category} className="p-4 bg-rose-50 dark:bg-rose-950/20 rounded-lg border border-rose-200 dark:border-rose-800">
                          <div className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wide mb-2">{category}</div>
                          <ul className="space-y-1.5">
                            {gaps.map((gap, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm text-rose-800 dark:text-rose-300">
                                <span className="text-rose-500 mt-0.5">•</span>
                                {gap}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                  );
                })()}

                {/* F. Bridge Timeline - Visual step-based with resource links */}
                {analysis && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Bridge Timeline</h3>
                    </div>
                    
                    {/* Visual horizontal progress indicator */}
                    <div className="flex items-center gap-1 px-2">
                      {[
                        { label: "Phase 1", color: "bg-rose-400" },
                        { label: "Phase 2", color: "bg-amber-400" },
                        { label: "Phase 3", color: "bg-emerald-400" },
                      ].map((p, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div className={`h-2 w-full rounded-full ${p.color}`} />
                          <span className="text-[10px] text-muted-foreground">{p.label}</span>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Phase 1 */}
                      <div className="p-4 rounded-lg border-2 border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/10">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/50 px-2 py-0.5 rounded">Phase 1</span>
                        </div>
                        <div className="text-sm font-semibold mb-1">{analysis.bridgeTimeline.phase1.name}</div>
                        <div className="text-xs text-muted-foreground mb-2">{analysis.bridgeTimeline.phase1.duration}</div>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {analysis.bridgeTimeline.phase1.bullets.slice(0, 3).map((b, i) => {
                            const parts = parseRecommendationWithLinks(b);
                            return (
                              <li key={i} className="flex items-start gap-1">
                                <span className="mt-0.5">→</span>
                                <span>
                                  {parts.map((part, j) => 
                                    part.type === 'link' ? (
                                      <a key={j} href={part.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                                        {part.content}<ExternalLink className="h-2.5 w-2.5" />
                                      </a>
                                    ) : <span key={j}>{part.content}</span>
                                  )}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                      {/* Phase 2 */}
                      <div className="p-4 rounded-lg border-2 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded">Phase 2</span>
                        </div>
                        <div className="text-sm font-semibold mb-1">{analysis.bridgeTimeline.phase2.name}</div>
                        <div className="text-xs text-muted-foreground mb-2">{analysis.bridgeTimeline.phase2.duration}</div>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {analysis.bridgeTimeline.phase2.bullets.slice(0, 3).map((b, i) => {
                            const parts = parseRecommendationWithLinks(b);
                            return (
                              <li key={i} className="flex items-start gap-1">
                                <span className="mt-0.5">→</span>
                                <span>
                                  {parts.map((part, j) => 
                                    part.type === 'link' ? (
                                      <a key={j} href={part.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                                        {part.content}<ExternalLink className="h-2.5 w-2.5" />
                                      </a>
                                    ) : <span key={j}>{part.content}</span>
                                  )}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                      {/* Phase 3 */}
                      <div className="p-4 rounded-lg border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/10">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded">Phase 3</span>
                        </div>
                        <div className="text-sm font-semibold mb-1">{analysis.bridgeTimeline.phase3.name}</div>
                        <div className="text-xs text-muted-foreground mb-2">{analysis.bridgeTimeline.phase3.duration}</div>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {analysis.bridgeTimeline.phase3.bullets.slice(0, 3).map((b, i) => {
                            const parts = parseRecommendationWithLinks(b);
                            return (
                              <li key={i} className="flex items-start gap-1">
                                <span className="mt-0.5">→</span>
                                <span>
                                  {parts.map((part, j) => 
                                    part.type === 'link' ? (
                                      <a key={j} href={part.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                                        {part.content}<ExternalLink className="h-2.5 w-2.5" />
                                      </a>
                                    ) : <span key={j}>{part.content}</span>
                                  )}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* G. Personalized Recommendations - 4 Mini-Sections + Support Strategy */}
                {analysis && (() => {
                  // Check if source and target curriculum match (e.g. IB → IB)
                  const currentCurr = (formData.currentCurriculum || "").toLowerCase();
                  const targetGoal = (formData.targetGoal || "").toLowerCase();
                  const isSameCurriculum = (
                    (currentCurr.includes("ib") && targetGoal.includes("ib")) ||
                    (currentCurr.includes("igcse") && targetGoal.includes("igcse")) ||
                    (currentCurr.includes("cambridge") && targetGoal.includes("igcse"))
                  );

                  const renderRecList = (recs: string[]) => recs.slice(0, 4).map((rec, i) => {
                    const parts = parseRecommendationWithLinks(rec);
                    return (
                      <li key={i} className="flex items-start gap-1">
                        <span className="mt-0.5">•</span>
                        <span>
                          {parts.map((part, j) => 
                            part.type === 'link' ? (
                              <a key={j} href={part.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                                {part.content}<ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            ) : <span key={j}>{part.content}</span>
                          )}
                        </span>
                      </li>
                    );
                  });

                  return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Personalized Recommendations</h3>
                    </div>

                    {/* Same-curriculum note */}
                    {isSameCurriculum && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2 mb-1">
                          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Same Curriculum Detected</span>
                        </div>
                        <p className="text-xs text-blue-700 dark:text-blue-400">
                          Your child is already studying in a {currentCurr.includes("ib") ? "IB" : "IGCSE/Cambridge"} curriculum. 
                          Recommendations focus on continuation within the same framework rather than cross-curriculum bridging.
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Study Recommendations */}
                      <div className="p-3 bg-muted/30 rounded-lg border border-border">
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          Study Recommendations
                        </h4>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {renderRecList(analysis.recommendations.study)}
                        </ul>
                      </div>
                      {/* Skill & Strategy Tips */}
                      <div className="p-3 bg-muted/30 rounded-lg border border-border">
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                          <Target className="h-4 w-4 text-muted-foreground" />
                          Skill & Strategy Tips
                        </h4>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {renderRecList(analysis.recommendations.skillStrategy)}
                        </ul>
                      </div>
                      {/* Resource Suggestions */}
                      <div className="p-3 bg-muted/30 rounded-lg border border-border">
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          Resource Suggestions
                        </h4>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {renderRecList(analysis.recommendations.resources)}
                        </ul>
                      </div>
                      {/* Cultural & Language Adaptation */}
                      <div className="p-3 bg-muted/30 rounded-lg border border-border">
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          Cultural & Language Adaptation
                        </h4>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {renderRecList(analysis.recommendations.culturalLanguage)}
                        </ul>
                      </div>
                    </div>

                    {/* Parent Support Strategy based on supportNeeds */}
                    {formData.supportNeeds && formData.supportNeeds.length > 0 && (
                      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                          <Target className="h-4 w-4 text-primary" />
                          Recommended Support Strategy
                        </h4>
                        <ul className="text-xs text-muted-foreground space-y-1.5">
                          {formData.supportNeeds.includes("1-on-1 tutoring sessions") && (
                            <li className="flex items-start gap-1">
                              <span className="mt-0.5">•</span>
                              <span>Consider structured one-on-one tutoring sessions to strengthen key subject fundamentals before transition.</span>
                            </li>
                          )}
                          {formData.supportNeeds.includes("Peer support groups") && (
                            <li className="flex items-start gap-1">
                              <span className="mt-0.5">•</span>
                              <span>Peer learning groups can help the student adapt to collaborative learning and discussion-based assignments common in Indian schools.</span>
                            </li>
                          )}
                          {formData.supportNeeds.includes("Group study programs") && (
                            <li className="flex items-start gap-1">
                              <span className="mt-0.5">•</span>
                              <span>Group study programs provide structured academic support and help build social connections with peers in the new school environment.</span>
                            </li>
                          )}
                          {formData.supportNeeds.includes("Parent counseling calls") && (
                            <li className="flex items-start gap-1">
                              <span className="mt-0.5">•</span>
                              <span>Regular parent counseling calls can help you stay informed about progress and address concerns early in the transition.</span>
                            </li>
                          )}
                          {formData.supportNeeds.includes("Cultural mentorship") && (
                            <li className="flex items-start gap-1">
                              <span className="mt-0.5">•</span>
                              <span>A cultural mentor can guide the student through social norms, classroom expectations, and cultural adjustment in Indian schools.</span>
                            </li>
                          )}
                          {formData.supportNeeds.includes("Regular progress tracking") && (
                            <li className="flex items-start gap-1">
                              <span className="mt-0.5">•</span>
                              <span>Set up regular progress check-ins to monitor academic adaptation and adjust the bridge plan as needed.</span>
                            </li>
                          )}
                          {formData.supportNeeds.includes("Emergency academic support") && (
                            <li className="flex items-start gap-1">
                              <span className="mt-0.5">•</span>
                              <span>Having access to emergency academic support ensures quick help when the student encounters unexpected curriculum challenges.</span>
                            </li>
                          )}
                          {formData.supportNeeds.includes("College admission guidance") && (
                            <li className="flex items-start gap-1">
                              <span className="mt-0.5">•</span>
                              <span>Early college admission guidance can align the transition plan with long-term academic goals and competitive exam preparation.</span>
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                  );
                })()}

                {/* Compare with Previous */}
                {previousReport && analysis && (
                  <ReportComparison
                    previousAnalysis={previousReport.analysis_data}
                    currentAnalysis={analysis}
                    previousDate={previousReport.created_at}
                  />
                )}

                {/* Download Button */}
                <div className="flex justify-center pt-4">
                  <Button 
                    onClick={handleDownloadPDF} 
                    className="w-full md:w-auto"
                    disabled={!analysis}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default ReportPreview;
