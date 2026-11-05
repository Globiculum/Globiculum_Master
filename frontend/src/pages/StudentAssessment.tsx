import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRetakePrefill } from "@/hooks/useRetakePrefill";
import { useAssessmentDraft } from "@/hooks/useAssessmentDraft";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StudentAssessmentController from "@/components/assessment/student/StudentAssessmentController";

const PERSONA_STORAGE_KEY = "globiculum-selected-persona";

// Route-level page for the Student assessment flow — the Student
// counterpart to BeginJourney.tsx (which still owns the Parent flow,
// untouched). Kept intentionally thin: layout chrome + the step controller.
const StudentAssessment = () => {
  const navigate = useNavigate();
  const { pending: prefillPending, prefillFormData, prevReportId } = useRetakePrefill();
  // Answers saved earlier in this tab, restored after a refresh.
  const { pending: draftPending, draft, userId, startOver } = useAssessmentDraft("student", prevReportId);
  // Bumped by "Start over" so the form remounts empty.
  const [formKey, setFormKey] = useState(0);

  const handleChangePersona = () => {
    sessionStorage.removeItem(PERSONA_STORAGE_KEY);
    navigate("/begin-journey");
  };

  const handleStartOver = () => {
    startOver();
    setFormKey((k) => k + 1);
  };

  // Wait for the session check before mounting a retake or a saved draft
  // (see useRetakePrefill, useAssessmentDraft).
  if (prefillPending || draftPending) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section id="main-content" tabIndex={-1} className="py-10 outline-none md:py-16">
        <div className="container mx-auto px-4">
          <StudentAssessmentController
            key={formKey}
            prefillData={prefillFormData}
            prevReportId={prevReportId}
            onChangePersona={handleChangePersona}
            draft={draft}
            userId={userId}
            onStartOver={handleStartOver}
          />
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default StudentAssessment;
