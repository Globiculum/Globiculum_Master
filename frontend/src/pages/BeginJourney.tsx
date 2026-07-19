import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ParentAssessment from "@/components/assessment/parent/ParentAssessment";
import PersonaSelection, { type Persona } from "@/components/PersonaSelection";
import { ArrowLeft, BookOpen, Sparkles } from "lucide-react";

const PERSONA_STORAGE_KEY = "globiculum-selected-persona";

const readStoredPersona = (): Persona | null => {
  const stored = sessionStorage.getItem(PERSONA_STORAGE_KEY);
  return stored === "parent" || stored === "student" ? stored : null;
};

const BeginJourney = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const prefillFormData = location.state?.prefillFormData;
  const prevReportId = location.state?.prevReportId;

  // Retakes carry their own pre-filled data and skip persona selection entirely,
  // keeping the existing retake flow untouched.
  const isRetake = Boolean(prefillFormData);

  const [persona, setPersona] = useState<Persona | null>(readStoredPersona);

  const showPersonaStep = !isRetake && !persona;
  const isStudentRedirect = !isRetake && persona === "student";

  const handlePersonaContinue = (selected: Persona) => {
    sessionStorage.setItem(PERSONA_STORAGE_KEY, selected);

    if (selected === "student") {
      // Student now has its own, independent assessment module/route.
      navigate("/student-assessment");
      return;
    }

    // Parent keeps using the existing inline assessment flow, untouched.
    setPersona(selected);
  };

  const handleChangePersona = () => {
    sessionStorage.removeItem(PERSONA_STORAGE_KEY);
    setPersona(null);
  };

  // Covers landing on /begin-journey directly with "student" already stored
  // from a previous visit (handlePersonaContinue only fires on a fresh pick).
  useEffect(() => {
    if (isStudentRedirect) {
      navigate("/student-assessment", { replace: true });
    }
  }, [isStudentRedirect, navigate]);

  if (isStudentRedirect) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="py-10 md:py-20 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          {showPersonaStep ? (
            <>
              <div className="text-center mb-12 space-y-4">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Sparkles className="h-10 w-10 text-secondary" />
                  <h1 className="text-4xl md:text-5xl font-bold">
                    Choose Your <span className="text-primary">Persona</span>
                  </h1>
                </div>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Tell us who you are so we can personalize your curriculum mapping journey.
                </p>
              </div>

              <PersonaSelection onContinue={handlePersonaContinue} />
            </>
          ) : (
            <>
              <div className="text-center mb-12 space-y-4">
                {!isRetake && persona && (
                  <button
                    type="button"
                    onClick={handleChangePersona}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Change persona
                  </button>
                )}
                <div className="flex items-center justify-center gap-3 mb-4">
                  <BookOpen className="h-10 w-10 text-primary" />
                  <h1 className="text-4xl md:text-5xl font-bold">
                    {prefillFormData ? (
                      <>Retake Your <span className="text-primary">Assessment</span></>
                    ) : (
                      <>Start Your <span className="text-primary">Personalized Curriculum Mapping</span></>
                    )}
                  </h1>
                </div>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  {prefillFormData
                    ? "Your previous answers have been pre-filled. Update any fields and submit to generate a new report."
                    : "Answer a few simple questions to unlock your AI-generated readiness report."}
                </p>
                {!prefillFormData && (
                <p className="text-base text-muted-foreground max-w-2xl mx-auto">
                    This assessment takes just 5-10 minutes and provides a comprehensive analysis of your child's educational alignment across US and Indian curricula.
                  </p>
                )}
                <div className="max-w-2xl mx-auto mt-4 px-4 py-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="text-sm text-foreground">
                    This assessment is currently designed for students in <span className="font-semibold">Grades 1–10</span> transitioning between curricula.
                  </p>
                </div>
              </div>

              <ParentAssessment prefillData={prefillFormData} prevReportId={prevReportId} />
            </>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default BeginJourney;
