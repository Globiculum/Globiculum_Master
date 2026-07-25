import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import ChallengeSection from "@/components/ChallengeSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import WhoItsForSection from "@/components/WhoItsForSection";
import ProblemSection from "@/components/ProblemSection";
import ResultsSection from "@/components/ResultsSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import CTASection from "@/components/CTASection";
import ReadinessReportSection from "@/components/ReadinessReportSection";
import FAQSection from "@/components/FAQSection";
import StickyMobileCTA from "@/components/StickyMobileCTA";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />
      <HeroSection />
      <ChallengeSection />
      <HowItWorksSection />
      <WhoItsForSection />
      <ProblemSection />
      <ResultsSection />
      <TestimonialsSection />
      <CTASection />
      <ReadinessReportSection />
      <FAQSection />
      <Footer />
      <StickyMobileCTA />
    </div>
  );
};

export default Index;
