import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import ChallengeSection from "@/components/ChallengeSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import ProblemSection from "@/components/ProblemSection";
import ResultsSection from "@/components/ResultsSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import CTASection from "@/components/CTASection";
import FAQSection from "@/components/FAQSection";
import StickyMobileCTA from "@/components/StickyMobileCTA";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />
      <HeroSection />
      <AboutSection />
      <ChallengeSection />
      <HowItWorksSection />
      <ProblemSection />
      <ResultsSection />
      <TestimonialsSection />
      <CTASection />
      <FAQSection />
      <Footer />
      <StickyMobileCTA />
    </div>
  );
};

export default Index;
