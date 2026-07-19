import { useLocation } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AssessmentForm from "@/components/AssessmentForm";
import { BookOpen } from "lucide-react";

const BeginJourney = () => {
  const location = useLocation();
  const prefillFormData = location.state?.prefillFormData;
  const prevReportId = location.state?.prevReportId;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <section className="py-10 md:py-20 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-4">
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
          
          <AssessmentForm prefillData={prefillFormData} prevReportId={prevReportId} />
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default BeginJourney;
