import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import ChallengeSection from "@/components/ChallengeSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import WhoItsForSection from "@/components/WhoItsForSection";
import ProblemSection from "@/components/ProblemSection";
import ComparisonTableSection from "@/components/ComparisonTableSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import ReadinessReportSection from "@/components/ReadinessReportSection";
import FAQSection from "@/components/FAQSection";
import FreeStartSection from "@/components/FreeStartSection";
import StickyMobileCTA from "@/components/StickyMobileCTA";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-muted">
      <Header />
      <HeroSection />
      <ChallengeSection />
      <HowItWorksSection />
      <WhoItsForSection />
      <ProblemSection />
      <ComparisonTableSection />
      <TestimonialsSection />
      <ReadinessReportSection />
      <FreeStartSection />
      <FAQSection />
      <Footer />
      {/* Phones: room under the footer for the sticky button, in the footer's colour. */}
      <div aria-hidden="true" className="h-[4.5rem] bg-primary md:hidden" />
      <StickyMobileCTA />
    </div>
  );
};

export default Index;
