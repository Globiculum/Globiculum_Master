import Header from "@/components/Header";
import Dashboard from "@/components/Dashboard";
import GuardianDashboard from "@/components/dashboard/GuardianDashboard";
import GuardianBanner from "@/components/dashboard/GuardianBanner";
import Footer from "@/components/Footer";
import EmailVerificationBanner from "@/components/EmailVerificationBanner";
import { useAuth } from "@/hooks/useAuth";
import { useGuardianMode } from "@/hooks/useGuardianMode";
import { Loader2 } from "lucide-react";

const DashboardPage = () => {
  const { user, loading } = useAuth();
  const { isGuardian, selectedStudent, loading: guardianLoading } = useGuardianMode();

  if (loading || guardianLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 pt-6 space-y-4">
        {user && <EmailVerificationBanner user={user} />}
        {isGuardian && selectedStudent && (
          <GuardianBanner studentName={selectedStudent.studentName} />
        )}
      </div>
      {isGuardian && selectedStudent ? (
        <GuardianDashboard
          studentUserId={selectedStudent.studentUserId}
          studentName={selectedStudent.studentName}
        />
      ) : (
        <Dashboard />
      )}
      <Footer />
    </div>
  );
};

export default DashboardPage;
