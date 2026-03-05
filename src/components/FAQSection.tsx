import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Which curricula does Globiculum support?",
    a: "Globiculum currently supports 47+ international curricula including US Common Core, IB (PYP/MYP/DP) — all mapped against CBSE and ICSE grade levels.",
  },
  {
    q: "My child is joining mid-year. Can Globiculum still help?",
    a: "Absolutely. In fact, mid-year transitions are where Globiculum makes the biggest difference. We factor in how much of the current academic year has passed and create a focused, timeline-aware plan for the remaining months.",
  },
  {
    q: "How accurate is the gap analysis?",
    a: "Our AI is trained on official CBSE, ICSE, and international board syllabi. The analysis is chapter and concept-level — far more specific than what any generic tutor could provide in an initial session.",
  },
  {
    q: "Do you cover all subjects?",
    a: "Yes. Globiculum covers Mathematics, Sciences (Physics, Chemistry, Biology at secondary level), English, Social Studies, and Hindi. Subject coverage continues to expand with each release.",
  },
  {
    q: "Is the gap report really free?",
    a: "Yes, your first full curriculum gap analysis is completely free. No credit card, no trial period, no hidden fees. We believe every family deserves to know where they stand before committing to anything.",
  },
  {
    q: "We're moving in 3 months — is that enough time?",
    a: "3 months is a solid window. Most families with a focused Globiculum plan close the key gaps within 6–8 weeks of consistent effort. We'll show you exactly how to use your time so nothing critical falls through the cracks.",
  },
  {
    q: "What if my child might return abroad later?",
    a: "Globiculum is built for globally mobile families. We keep your child's global curriculum profile active so if you move again — to the US, UK, or anywhere else — we can map in reverse just as effectively.",
  },
  {
    q: "How is Globiculum different from coaching centres?",
    a: "Coaching centres teach everyone the same thing. Globiculum starts with what your child already knows — then fills only the specific gaps they need to close. It's the difference between a generic class and a personal roadmap.",
  },
];

const FAQSection = () => {
  return (
    <section className="py-20 bg-background" id="faq">
      <div className="container mx-auto px-4 max-w-3xl">
        <p className="text-secondary font-semibold text-sm uppercase tracking-wider mb-3 text-center">
          Questions parents ask us
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-2 text-foreground">
          Everything you need to know before you get started.
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
