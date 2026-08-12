import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ParentAssessment from "@/components/assessment/parent/ParentAssessment";
import { PARENT_TOTAL_STEPS } from "@/components/assessment/parent/parentValidation";
import { STUDENT_TOTAL_STEPS } from "@/components/assessment/student/StudentAssessmentController";
import PersonaSelection, { type Persona } from "@/components/PersonaSelection";
import { Clock, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import beginJourneyImage from "@/assets/BEGIN-JOURNEY.png";

// Parent (5 steps) and Student (4 steps) are different lengths — the step
// indicator on this screen previews whichever flow is currently highlighted,
// defaulting to Parent's count until a card is picked.
const STEP_TOTALS: Record<Persona, number> = {
  parent: PARENT_TOTAL_STEPS,
  student: STUDENT_TOTAL_STEPS,
};

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
  const [previewPersona, setPreviewPersona] = useState<Persona | null>(null);
  const previewTotalSteps = STEP_TOTALS[previewPersona ?? "parent"];

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
    setPreviewPersona(null);
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
        id="main-content"
        tabIndex={-1}
        className={cn(
          "relative overflow-hidden outline-none",
          showPersonaStep ? "bg-primary" : "bg-gradient-subtle py-8 md:py-12"
        )}
      >
        {showPersonaStep && (
          <>
            <img
              src={beginJourneyImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-r from-primary via-primary/50 to-primary/10"
            />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-primary/10" />
          </>
        )}
        <div
          className={cn(
            "container relative mx-auto px-4",
            showPersonaStep && "flex min-h-[640px] flex-col justify-center py-12 sm:min-h-[740px] sm:py-14 lg:min-h-[840px] lg:py-16"
          )}
        >
          <MotionConfig reducedMotion="user">
            <AnimatePresence mode="wait">
              {showPersonaStep ? (
                <motion.div
                  key="persona-step"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                >
                  <div className="max-w-xl text-center lg:text-left">
                    <div className="mb-3 flex items-center justify-center gap-2.5 lg:justify-start">
                      <span className="text-xs font-semibold uppercase tracking-wide text-mint">
                        Step 1 of {previewTotalSteps}
                      </span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: previewTotalSteps }).map((_, index) => (
                          <span
                            key={index}
                            className={cn(
                              "h-1.5 rounded-full transition-all",
                              index === 0 ? "w-4 bg-mint" : "w-1.5 bg-white/20"
                            )}
                          />
                        ))}
                      </div>
                    </div>

                    <motion.h1
                      className="text-h1 text-white"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    >
                      Choose Your <span className="bg-gradient-mint bg-clip-text text-transparent">Journey</span>
                    </motion.h1>
                    <motion.p
                      className="font-body mx-auto mt-3 max-w-md text-body text-white/80 lg:mx-0"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                    >
                      Tell us who this assessment is for so we can personalize your experience.
                    </motion.p>

                    <motion.div
                      className="mx-auto mt-4 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-caption text-white/70 lg:mx-0 lg:justify-start"
                      initial="hidden"
                      animate="show"
                      variants={{
                        hidden: {},
                        show: { transition: { staggerChildren: 0.08, delayChildren: 0.25 } },
                      }}
                    >
                      <motion.span
                        className="inline-flex items-center gap-1.5"
                        variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
                        transition={{ duration: 0.3 }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <Lock className="h-3.5 w-3.5 text-mint" />
                        Private &amp; Secure
                      </motion.span>
                      <span className="text-white/30">•</span>
                      <motion.span
                        className="inline-flex items-center gap-1.5"
                        variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
                        transition={{ duration: 0.3 }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <Clock className="h-3.5 w-3.5 text-mint" />
                        8–10 Minutes
                      </motion.span>
                    </motion.div>
                  </div>

                  <div className="mt-10 sm:mt-12 lg:mt-16">
                    <PersonaSelection onContinue={handlePersonaContinue} onSelectionChange={setPreviewPersona} />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="parent-assessment-step"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                >
                  <ParentAssessment
                    prefillData={prefillFormData}
                    prevReportId={prevReportId}
                    onChangePersona={handleChangePersona}
                    showChangePersona={!isRetake}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </MotionConfig>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default BeginJourney;
