import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import DashboardPage from "./pages/DashboardPage";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import BeginJourney from "./pages/BeginJourney";
import StudentAssessment from "./pages/StudentAssessment";
import Onboarding from "./pages/Onboarding";
import About from "./pages/About";
import ReportPreview from "./pages/ReportPreview";
import ReportsHistory from "./pages/ReportsHistory";
import ContentExport from "./pages/ContentExport";
import AdminPage from "./pages/AdminPage";
import SharedReportPage from "./pages/SharedReportPage";
import PricingPage from "./pages/PricingPage";

const queryClient = new QueryClient();

// Dev-only escape hatch: /report-preview?dev=true skips ProtectedRoute so the
// Report Preview UI can be reviewed locally without signing in. import.meta.env.DEV
// is statically false in production builds, so this branch is compiled out and
// dead-code-eliminated — it can never activate outside a local Vite dev server.
// Every other route, and /report-preview itself without the exact query param,
// stays behind ProtectedRoute as before.
const ReportPreviewRoute = () => {
  const location = useLocation();
  const devPreviewActive = import.meta.env.DEV && new URLSearchParams(location.search).get("dev") === "true";

  if (devPreviewActive) {
    return <ReportPreview />;
  }

  return (
    <ProtectedRoute skipOnboardingCheck>
      <ReportPreview />
    </ProtectedRoute>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      {/* Applies to every motion.* component on every route — a single source of
          truth for prefers-reduced-motion instead of relying on each animated
          component to remember its own useReducedMotion() check. */}
      <MotionConfig reducedMotion="user">
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/begin-journey" element={<BeginJourney />} />
          <Route path="/student-assessment" element={<StudentAssessment />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/about" element={<About />} />
          <Route
            path="/report-preview"
            element={<ReportPreviewRoute />}
          />
          <Route 
            path="/reports" 
            element={
              <ProtectedRoute>
                <ReportsHistory />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/content-export" 
            element={
              <AdminProtectedRoute>
                <ContentExport />
              </AdminProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <AdminProtectedRoute>
                <AdminPage />
              </AdminProtectedRoute>
            } 
          />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute skipOnboardingCheck>
                <Onboarding />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
          <Route path="/report/:token" element={<SharedReportPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </MotionConfig>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
