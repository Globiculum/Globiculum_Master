import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ArrowLeft, AlertTriangle, Loader2, Copy, Check } from "lucide-react";
import ReportComparison from "@/components/ReportComparison";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateReportPDF } from "@/lib/generateReportPDF";
import { ReportBody, type AnalysisData } from "@/components/report/ReportBody";
import { deriveSubjectStrengths } from "@/components/assessment/shared/submitAssessment";
import ReportGenerationLoader, { type LoaderPersona } from "@/components/assessment/shared/ReportGenerationLoader";

const PERSONA_STORAGE_KEY = "globiculum-selected-persona";
const getPersona = (): LoaderPersona => (sessionStorage.getItem(PERSONA_STORAGE_KEY) === "parent" ? "parent" : "student");


const STORAGE_KEY_FORM = 'assessment-form-data';
const STORAGE_KEY_ANALYSIS = 'saved-report-analysis';
const STORAGE_KEY_REPORT_ID = 'saved-report-id';

// Dev-only escape hatch for `/report-preview?dev=true`, used while the local
// Supabase Edge Function CORS deployment is out of date and real assessment
// submission (validate-student-data) can't complete locally. import.meta.env.DEV
// is statically false in production builds, so this branch is compiled out —
// it can never activate outside a local Vite dev server, and it only ever
// fills in for MISSING real form/analysis data, never overrides it.
const isDevPreviewRequested = (search: string): boolean => {
  if (!import.meta.env.DEV) return false;
  try {
    return new URLSearchParams(search).get("dev") === "true";
  } catch {
    return false;
  }
};

// Structurally identical to real formData (see AssessmentFormData / parentMapper)
// so every section renders exactly as it would with a real submission.
const DEV_MOCK_FORM_DATA = {
  studentName: "Aarav",
  studentLastName: "Menon",
  snapshotAge: "10",
  schoolStage: "middle",
  snapshotGrade: "5",
  snapshotLocation: "us",
  usState: "TX",
  currentCurriculum: ["us-common-core"],
  targetGoal: "cbse",
  targetGrade: "next",
  timeline: "3-6-months",
  selectedLanguages: ["english", "hindi"],
  academicPath: ["Math", "Science"],
};

// Structurally identical to a real AnalysisData response from analyze-curriculum.
const DEV_MOCK_ANALYSIS: AnalysisData = {
  overallAlignment: {
    percentage: 72,
    subjectsNeedingBridge: ["Science", "Social Science"],
    estimatedDuration: "5 Months",
  },
  subjectAnalysis: [
    { subject: "Mathematics", topicsCovered: 18, totalTopics: 20, alignmentLevel: "strong", keyGaps: [] },
    { subject: "Science", topicsCovered: 12, totalTopics: 20, alignmentLevel: "moderate", keyGaps: ["Diagram-based question practice"] },
    { subject: "English", topicsCovered: 16, totalTopics: 20, alignmentLevel: "strong", keyGaps: [] },
    { subject: "Social Science", topicsCovered: 7, totalTopics: 20, alignmentLevel: "high_gap", keyGaps: ["Indian History", "Civics", "Geography"] },
  ],
  criticalGaps: ["Indian History", "Civics & Governance"],
  bridgeTimeline: {
    phase1: { name: "Foundation", duration: "Month 1-2", bullets: ["Introduce Indian History timeline"] },
    phase2: { name: "Building", duration: "Month 3-4", bullets: ["Deepen Social Science coverage"] },
    phase3: { name: "Consolidation", duration: "Month 5", bullets: ["Practice CBSE-style assessments"] },
  },
  recommendations: {
    study: ["Daily Social Science reading"],
    skillStrategy: ["Practice diagram-based Science questions"],
    resources: ["NCERT Class 6 Social Science"],
    culturalLanguage: ["Watch Indian history documentaries"],
  },
};

const ReportPreview = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const devPreviewActive = isDevPreviewRequested(location.search);

  // Try location.state first, then sessionStorage. Never localStorage: child
  // data must not outlive the tab (see lib/childDataStorage.ts).
  const getFormData = () => {
    // Priority 1: Navigation state
    if (location.state?.formData && Object.keys(location.state.formData).length > 0) {
      console.log("[ReportPreview] Using formData from navigation state");
      // Persist for page refresh within this tab
      try {
        sessionStorage.setItem(STORAGE_KEY_FORM, JSON.stringify(location.state.formData));
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

    if (devPreviewActive) {
      console.log("[ReportPreview] No real formData found — using dev preview mock (?dev=true)");
      return DEV_MOCK_FORM_DATA;
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

    if (devPreviewActive) {
      console.log("[ReportPreview] No real analysis found — using dev preview mock (?dev=true)");
      return DEV_MOCK_ANALYSIS;
    }

    return null;
  };

  // Analysis computed during submitAssessment (awaited, not fire-and-forget —
  // see submitAssessment.ts) and handed off via navigation state. Distinct
  // from getSavedAnalysis() above: that path is for reports that are ALREADY
  // in saved_reports (history/comparison views), so it marks isSaved=true and
  // skips saveReportToDatabase entirely. This one is freshly computed and NOT
  // yet saved anywhere, so it still needs to go through saveReportToDatabase
  // (and the report-summary email) — it only skips the redundant network call
  // to analyze-curriculum.
  const getPrefetchedAnalysis = (): AnalysisData | null => {
    if (location.state?.prefetchedAnalysis) {
      console.log("[ReportPreview] Using prefetched analysis from submit — skipping duplicate analyze-curriculum call");
      return location.state.prefetchedAnalysis as AnalysisData;
    }
    return null;
  };

  const formData = getFormData();
  const initialSavedAnalysis = getSavedAnalysis();
  const initialPrefetchedAnalysis = initialSavedAnalysis ? null : getPrefetchedAnalysis();
  const hasValidFormData = formData && Object.keys(formData).length > 0;
  const persona = getPersona();

  const [isLoading, setIsLoading] = useState(!initialSavedAnalysis && !initialPrefetchedAnalysis && hasValidFormData);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(initialSavedAnalysis ?? initialPrefetchedAnalysis);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(!!initialSavedAnalysis);
  const [redirecting, setRedirecting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const analysisStartedRef = useRef(false);
  const [previousReport, setPreviousReport] = useState<{ analysis_data: AnalysisData; created_at: string } | null>(null);
  // The saved_reports row id for this report, if known — seeded from
  // navigation state when opened from Reports History (which already has
  // the row), and set once a freshly-generated report auto-saves. Share
  // Report only appears once this is available, since it's the foreign key
  // the shared_reports link points at.
  const [savedReportId, setSavedReportId] = useState<string | null>((location.state?.savedReportId as string | undefined) ?? null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareDialogUrl, setShareDialogUrl] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

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
    // Guard against StrictMode double-invoke and duplicate in-flight requests
    if (analysisStartedRef.current) return;
    analysisStartedRef.current = true;

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

    // currentCurriculum moved from a single string to a list; older saved
    // reports may still have it as a plain string, so this accepts either
    // shape and resolves any "other" entry to the free-text value.
    const resolveCurriculumList = (value: unknown, otherValue: unknown): string | undefined => {
      const list = Array.isArray(value) ? value : typeof value === "string" && value ? [value] : [];
      if (list.length === 0) return undefined;
      const other = typeof otherValue === "string" ? otherValue.trim() : "";
      const resolved = list
        .filter((c): c is string => typeof c === "string" && c.length > 0)
        .map((c) => (c === "other" ? other || "Other" : c));
      return resolved.length > 0 ? resolved.join(", ") : undefined;
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
      const currentCurriculum = resolveCurriculumList(raw?.currentCurriculum, raw?.currentCurriculumOther);
      const targetGoal = normalizeOther(raw?.targetGoal, raw?.targetGoalOther);
      const targetCurriculum = normalizeOther(raw?.targetCurriculum, raw?.targetCurriculumOther) || targetGoal;

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
        targetCurriculum,
        targetGoal,
        // Must match submitAssessment.ts's payload: this call runs whenever the
        // submit-time analysis didn't (no student profile, save failed), and
        // without the stream the backend compares every subject the board has.
        targetStream: typeof raw?.targetStream === "string" && raw.targetStream ? raw.targetStream : undefined,
        targetGrade: raw?.targetGrade === "next" || raw?.targetGrade === "same" ? raw.targetGrade : undefined,
        targetElectives: Array.isArray(raw?.targetElectives) && raw.targetElectives.length ? raw.targetElectives : undefined,
        targetLanguage: ["hindi", "sanskrit", "both", "undecided"].includes(raw?.targetLanguage) ? raw.targetLanguage : undefined,
        academicPath: Array.isArray(raw?.academicPath) ? raw.academicPath : undefined,
        // strongestSubjects/challengingAreas are derived from subjectConfidences
        // (single source of truth — see deriveSubjectStrengths), falling back to
        // any raw array already on formData only for pre-existing saved reports
        // submitted before this derivation existed.
        ...(() => {
          const { strongest, challenging } = deriveSubjectStrengths(raw?.subjectConfidences);
          const rawChallenging = Array.isArray(raw?.challengingAreas)
            ? raw.challengingAreas
            : Array.isArray(raw?.challengingSubjects)
              ? raw.challengingSubjects
              : undefined;
          return {
            strongestSubjects: strongest.length > 0 ? strongest : (Array.isArray(raw?.strongestSubjects) ? raw.strongestSubjects : undefined),
            challengingAreas: challenging.length > 0 ? challenging : rawChallenging,
          };
        })(),
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

    const parseFunctionError = async (fnError: any): Promise<{ status?: number; message: string }> => {
      const status = fnError?.context?.status as number | undefined;
      // context is the fetch Response: its body is a stream, so read it as JSON.
      const body = await fnError?.context?.json?.().catch(() => undefined) ?? fnError?.context?.body;

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
      if (isSaved) return;
      try {
        // refreshSession() fires TOKEN_REFRESHED which updates the PostgREST
        // client's Authorization header — without this, auth.uid() is NULL in
        // Postgres and the RLS INSERT policy silently blocks the row.
        let userId: string | null = null;
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError && refreshData.session?.user) {
          userId = refreshData.session.user.id;
        } else {
          const { data: { session: fallback } } = await supabase.auth.getSession();
          if (!fallback?.user) {
            toast.error("Session expired. Please sign in again to save your report.");
            navigate("/auth", { replace: true });
            return;
          }
          userId = fallback.user.id;
        }
        const userData = { user: { id: userId } };

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
          toast.error(`Could not save report: ${saveError.message}`);
        } else {
          setIsSaved(true);
          setSavedReportId((savedReport as any)?.id ?? null);
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

      // Skip the network call if submitAssessment already computed this —
      // still needs to go through the normal save/email path since, unlike
      // initialSavedAnalysis above, this hasn't been persisted anywhere yet.
      if (initialPrefetchedAnalysis) {
        console.log("[ReportPreview] Using prefetched analysis — saving to database");
        setIsLoading(false);
        saveReportToDatabase(initialPrefetchedAnalysis);
        return;
      }

      const MAX_RETRIES = 2;

      setIsLoading(true);
      setError(null);
      setAnalysis(null);

      console.log("[ReportPreview] Starting curriculum analysis");

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

          const { data, error: fnError } = await supabase.functions.invoke("analyze-curriculum", {
            body: { formData: safeFormData },
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "X-API-Version": "v1",
            },
          });

          if (fnError) {
            const { status, message } = await parseFunctionError(fnError);
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

          if (!nextAnalysis) {
            console.error("[ReportPreview] No analysis in response");
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
  }, [formData, navigate, hasValidFormData, initialSavedAnalysis, initialPrefetchedAnalysis]);

  const handleDownloadPDF = async () => {
    if (!analysis || !reportRef.current) return;
    try {
      await generateReportPDF(reportRef.current);
      toast.success("PDF downloaded successfully!");
    } catch {
      toast.error("Failed to generate PDF. Please try again.");
    }
  };

  const handleShare = async () => {
    if (!savedReportId) return;
    setIsSharing(true);
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
          report_id: savedReportId,
          user_id: userData.user.id,
          expires_at: expiresAt.toISOString(),
        } as any)
        .select("token")
        .single();

      if (error) {
        console.error("Share DB error:", error);
        toast.error(`Failed to generate share link: ${error.message}`);
        return;
      }

      const shareUrl = `${window.location.origin}/report/${(data as any).token}`;
      // Show dialog with URL — this is the reliable path regardless of clipboard
      setShareDialogUrl(shareUrl);
      setShareCopied(false);
      // Try clipboard silently
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareCopied(true);
      } catch {
        // Clipboard failed — user can copy from the dialog
      }
    } catch (err) {
      console.error("Share error:", err);
      toast.error("Failed to generate share link");
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyShareUrl = async () => {
    if (!shareDialogUrl) return;
    try {
      await navigator.clipboard.writeText(shareDialogUrl);
      setShareCopied(true);
    } catch {
      // Fallback: user can manually select the text
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Share Link Dialog */}
      <Dialog open={!!shareDialogUrl} onOpenChange={(open) => { if (!open) setShareDialogUrl(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Report</DialogTitle>
            <DialogDescription>
              Anyone with this link can view the report for 7 days.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 mt-2">
            <Input
              readOnly
              value={shareDialogUrl ?? ""}
              className="font-mono text-xs"
              onFocus={(e) => e.target.select()}
            />
            <Button size="sm" variant="outline" onClick={handleCopyShareUrl} className="shrink-0">
              {shareCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          {shareCopied && <p className="text-xs text-green-600 mt-1">Copied to clipboard!</p>}
        </DialogContent>
      </Dialog>

      <section className="py-6 md:py-10">
        <div className="container mx-auto max-w-5xl px-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-heading text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 no-print"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </button>

          {redirecting ? (
            <Card className="border border-border">
              <CardContent role="status" aria-live="polite" className="flex flex-col items-center justify-center py-16 space-y-4">
                <div className="relative">
                  <div className="relative p-4 bg-muted rounded-full">
                    <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" aria-hidden="true" />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <h1 className="text-lg font-semibold">No Assessment Data Found</h1>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Redirecting you to the assessment form...
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <ReportGenerationLoader persona={persona} />
          ) : error ? (
            <Card className="border border-destructive/20">
              <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
                <div className="p-3 bg-destructive/10 rounded-full">
                  <AlertTriangle className="h-10 w-10 text-destructive" />
                </div>
                <h1 className="text-lg font-semibold">Analysis Failed</h1>
                <p className="text-sm text-muted-foreground text-center max-w-sm">{error}</p>
                <Button onClick={() => window.location.reload()} size="sm">Try Again</Button>
              </CardContent>
            </Card>
          ) : (
            <div ref={reportRef}>
              <ReportBody
                formData={formData}
                analysis={analysis}
                onDownload={handleDownloadPDF}
                onShare={savedReportId ? handleShare : undefined}
                isSharing={isSharing}
                comparison={previousReport && analysis ? (
                  <ReportComparison
                    previousAnalysis={previousReport.analysis_data}
                    currentAnalysis={analysis}
                    previousDate={previousReport.created_at}
                  />
                ) : undefined}
              />
            </div>
          )}
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default ReportPreview;
