import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ParentAssessment from "@/components/assessment/parent/ParentAssessment";
import AssessmentHero from "@/components/assessment/shared/AssessmentHero";
import PersonaSelection, { type Persona } from "@/components/PersonaSelection";
import { BookOpen, GraduationCap, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

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

      <section
        className={cn(
          "py-10 md:py-20",
          showPersonaStep ? "relative overflow-hidden bg-background" : "bg-gradient-subtle"
        )}
      >
        {showPersonaStep && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-secondary/10 blur-3xl" />
            <div className="absolute top-10 -right-24 h-80 w-80 rounded-full bg-violet/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-mint/20 blur-3xl" />
            <GraduationCap className="absolute right-[8%] top-16 hidden h-16 w-16 -rotate-6 text-secondary/10 md:block" />
            <BookOpen className="absolute left-[10%] bottom-10 hidden h-14 w-14 rotate-6 text-violet/10 md:block" />
          </div>
        )}
        <div className="container relative mx-auto px-4">
          {showPersonaStep ? (
            <>
              <div className="text-center mb-12 space-y-4">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Sparkles className="h-4 w-4 text-secondary" />
                  <span className="text-sm font-semibold uppercase tracking-wide text-secondary">
                    Begin Your Journey
                  </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                  Let's build your{" "}
                  <span className="bg-gradient-cta bg-clip-text text-transparent">
                    personalized transition roadmap
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                  Every learner's journey is unique. Tell us who this assessment is for so we
                  can personalize every question and recommendation.
                </p>
              </div>

              <PersonaSelection onContinue={handlePersonaContinue} />
            </>
          ) : (
            <>
              <AssessmentHero
                eyebrow="Parent Assessment"
                showChangePersona={!isRetake && Boolean(persona)}
                onChangePersona={handleChangePersona}
                title={
                  prefillFormData ? (
                    <>
                      Retake Your <span className="bg-gradient-cta bg-clip-text text-transparent">Assessment</span>
                    </>
                  ) : (
                    <>
                      Let's build your child's{" "}
                      <span className="bg-gradient-cta bg-clip-text text-transparent">personalized transition roadmap</span>
                    </>
                  )
                }
                subtitle={
                  prefillFormData
                    ? "Your previous answers have been pre-filled. Update any fields and submit to generate a new report."
                    : "Answer a few simple questions and our AI will generate a detailed curriculum transition report with learning gaps, strengths, and a personalized bridge plan."
                }
                notice={
                  !prefillFormData && (
                    <>
                      This assessment takes just 5-10 minutes and is currently designed for students in{" "}
                      <span className="font-semibold">Grades 1–10</span> transitioning between curricula.
                    </>
                  )
                }
              />

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
