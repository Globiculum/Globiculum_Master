import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import OurAdvantage from "./pages/OurAdvantage";
import About from "./pages/About";
import ReportPreview from "./pages/ReportPreview";
import ReportsHistory from "./pages/ReportsHistory";
import ContentExport from "./pages/ContentExport";
import AdminPage from "./pages/AdminPage";
import SharedReportPage from "./pages/SharedReportPage";
import PricingPage from "./pages/PricingPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/begin-journey" element={<BeginJourney />} />
          <Route path="/student-assessment" element={<StudentAssessment />} />
          <Route path="/our-advantage" element={<OurAdvantage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/about" element={<About />} />
          <Route 
            path="/report-preview" 
            element={
              <ProtectedRoute skipOnboardingCheck>
                <ReportPreview />
              </ProtectedRoute>
            } 
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
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
