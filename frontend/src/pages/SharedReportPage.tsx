import { useState, useEffect, Component, ReactNode } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ReportView, { type AnalysisData } from "@/components/ReportView";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Clock, LinkIcon, ShieldAlert } from "lucide-react";

interface SharedReportData {
  id: string;
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form_data: any;
  analysis_data: AnalysisData;
  created_at: string;
  student_name: string;
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

  useEffect(() => {
    const fetchReport = async () => {
      if (!token) { setError("Invalid link"); setLoading(false); return; }

      const { data, error: fnError } = await supabase.functions.invoke("fetch-shared-report", {
        body: { token },
      });

      if (fnError || data?.error) {
        setError(data?.error || fnError?.message || "Failed to load report");
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

  const sharedBanner = (
    <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
      <LinkIcon className="h-4 w-4 shrink-0" />
      <span>Shared report for <strong className="text-foreground">{report.student_name}</strong></span>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <ReportView
          formData={report.form_data}
          analysisData={report.analysis_data}
          sharedBanner={sharedBanner}
        />
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
