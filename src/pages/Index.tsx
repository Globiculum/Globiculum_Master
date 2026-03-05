import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import ProblemSection from "@/components/ProblemSection";
import ProgressIndicator from "@/components/ProgressIndicator";
import CTASection from "@/components/CTASection";
import FAQSection from "@/components/FAQSection";
import StickyMobileCTA from "@/components/StickyMobileCTA";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />
      <HeroSection />
      <ProblemSection />
      
      {/* AI-Driven Gap Analysis Process Section */}
      <section id="gap-analysis" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <ProgressIndicator />
        </div>
      </section>
      
      <CTASection />
      <FAQSection />
      <Footer />
      <StickyMobileCTA />
    </div>
  );
};

export default Index;
