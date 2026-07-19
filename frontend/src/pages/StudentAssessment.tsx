import { useLocation, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StudentAssessmentController from "@/components/assessment/student/StudentAssessmentController";

const PERSONA_STORAGE_KEY = "globiculum-selected-persona";

// Route-level page for the Student assessment flow — the Student
// counterpart to BeginJourney.tsx (which still owns the Parent flow,
// untouched). Kept intentionally thin: layout chrome + the step controller.
const StudentAssessment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const prefillFormData = location.state?.prefillFormData;
  const prevReportId = location.state?.prevReportId;

  const handleChangePersona = () => {
    sessionStorage.removeItem(PERSONA_STORAGE_KEY);
    navigate("/begin-journey");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="py-10 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 space-y-2">
            <button type="button" onClick={handleChangePersona} className="text-sm text-muted-foreground underline">
              Change persona
            </button>
            <h1 className="text-3xl font-bold">Student Assessment</h1>
            <p className="text-muted-foreground">Answer a few questions to generate your readiness report.</p>
          </div>

          <StudentAssessmentController prefillData={prefillFormData} prevReportId={prevReportId} />
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default StudentAssessment;
