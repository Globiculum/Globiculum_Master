import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "How does EduSetu help with a curriculum transition to India?",
    a: "EduSetu uses AI-powered analysis to map what your child has already covered in their current curriculum against CBSE, ICSE, or State Board requirements. You receive a personalised readiness report highlighting areas to prepare for, so the transition feels confident — not stressful.",
  },
  {
    q: "Which Indian boards does EduSetu support?",
    a: "We currently support CBSE, ICSE, and major State Board curricula. Our alignment engine is designed to scale, so additional boards and international systems are added regularly.",
  },
  {
    q: "Do I need to know the Indian syllabus in detail to get started?",
    a: "Not at all. Simply tell us your child's current grade, country, and subjects. EduSetu handles the curriculum mapping automatically and presents everything in parent-friendly language.",
  },
  {
    q: "How long does it take to generate a gap analysis report?",
    a: "Most reports are ready within a few minutes. You answer a short set of questions about your child's academics, and our AI engine produces a detailed alignment report you can review immediately.",
  },
  {
    q: "Is my child's data safe on EduSetu?",
    a: "Absolutely. We follow strict data privacy practices aligned with FERPA and COPPA guidelines. All student data is encrypted, and you can request deletion at any time from your dashboard.",
  },
];

const FAQSection = () => {
  return (
    <section className="py-20 bg-background" id="faq">
      <div className="container mx-auto px-4 max-w-3xl">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-2 text-foreground">
          Frequently Asked Questions
        </h2>
        <p className="text-center text-muted-foreground mb-10">
          Common questions from families preparing for a move to India.
        </p>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left text-base">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* FAQ structured data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
    </section>
  );
};

export default FAQSection;
