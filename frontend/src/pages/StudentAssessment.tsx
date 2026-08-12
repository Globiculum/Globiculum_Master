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

      <section id="main-content" tabIndex={-1} className="py-10 outline-none md:py-16">
        <div className="container mx-auto px-4">
          <StudentAssessmentController
            prefillData={prefillFormData}
            prevReportId={prevReportId}
            onChangePersona={handleChangePersona}
          />
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default StudentAssessment;
