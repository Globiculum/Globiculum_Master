import { useState, useEffect, useRef, Component, ReactNode } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ReportBody, type AnalysisData } from "@/components/report/ReportBody";
import { generateReportPDF } from "@/lib/generateReportPDF";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Clock, LinkIcon, ShieldAlert } from "lucide-react";

interface SharedReportData {
  id: string;
  /** Only the fields the report displays, first name only (fetch-shared-report). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form_data: any;
  analysis_data: AnalysisData;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Error boundary — catches render crashes so the page never goes blank
// ---------------------------------------------------------------------------
interface EBState { hasError: boolean }
class SharedReportErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(): EBState { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col">
          <Header />
          <div className="flex-1 flex items-center justify-center">
            <Card className="max-w-md w-full mx-4">
              <CardContent className="flex flex-col items-center py-12 space-y-4">
                <div className="p-4 bg-destructive/10 rounded-full">
                  <ShieldAlert className="h-10 w-10 text-destructive" />
                </div>
                <h1 className="text-xl font-semibold">Unable to Display Report</h1>
                <p className="text-muted-foreground text-center text-sm">
                  The report data could not be rendered. Please try again or contact support.
                </p>
                <Button asChild variant="outline"><a href="/">Back to Home</a></Button>
              </CardContent>
            </Card>
          </div>
          <Footer />
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
const SharedReportPage = () => {
  const { token } = useParams<{ token: string }>();
  const [report, setReport] = useState<SharedReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    try {
      await generateReportPDF(reportRef.current);
    } catch {
      toast.error("Failed to generate PDF. Please try again.");
    }
  };

  useEffect(() => {
    const fetchReport = async () => {
      if (!token) { setError("Invalid link"); setLoading(false); return; }

      const { data, error: fnError } = await supabase.functions.invoke("fetch-shared-report", {
        body: { token },
      });

      if (fnError || data?.error) {
        // A 404/410 arrives as fnError; its body says why ("expired", "not found").
        const reason = await fnError?.context?.json?.().then((b: { error?: string }) => b?.error).catch(() => undefined);
        setError(data?.error || reason || "Failed to load report");
      } else if (data?.report) {
        setReport(data.report as SharedReportData);
      } else {
        setError("Report not found");
      }
      setLoading(false);
    };
    fetchReport();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div role="status" aria-live="polite" className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          <span className="sr-only">Loading shared report…</span>
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
                {error?.includes("expired")
                  ? <Clock className="h-10 w-10 text-destructive" />
                  : error?.includes("not found")
                    ? <LinkIcon className="h-10 w-10 text-destructive" />
                    : <ShieldAlert className="h-10 w-10 text-destructive" />}
              </div>
              <h1 className="text-xl font-semibold">Unable to Load Report</h1>
              <p className="text-muted-foreground text-center">{error || "Report not found"}</p>
              <Button asChild variant="outline"><a href="/">Back to Home</a></Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto max-w-5xl px-4 py-6 md:py-10">
        <p className="no-print mb-4 inline-flex items-center gap-1.5 font-heading text-sm text-muted-foreground">
          <LinkIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          Shared report, view only
        </p>
        <div ref={reportRef}>
          <ReportBody formData={report.form_data} analysis={report.analysis_data} onDownload={handleDownloadPDF} />
        </div>
      </main>
      <Footer />
    </div>
  );
};

// Wrap with error boundary so any render crash shows a message, not blank page
const SharedReportPageWithBoundary = () => (
  <SharedReportErrorBoundary>
    <SharedReportPage />
  </SharedReportErrorBoundary>
);

export default SharedReportPageWithBoundary;
