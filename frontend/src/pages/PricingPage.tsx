import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Bot,
  Check,
  Lock,
  Minus,
  Sparkles,
  XCircle,
  Zap,
  FileCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TRUST_BADGES = [
  { icon: Bot, label: "AI Powered" },
  { icon: Lock, label: "Private & Secure" },
  { icon: Zap, label: "Instant Reports" },
  { icon: XCircle, label: "Cancel Anytime" },
];

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "₹0",
    priceNote: "forever",
    description: "Try your first curriculum readiness report, on us.",
    featured: false,
    features: [
      "One AI Curriculum Readiness Report",
      "Readiness Summary",
      "Download PDF",
      "Shareable Report",
      "Subject Gap Snapshot",
    ],
    cta: { label: "Start Free", to: "/begin-journey" },
  },
  {
    id: "premium",
    name: "Premium",
    price: "₹1499",
    priceNote: "or $18/month",
    description: "For families actively navigating a curriculum transition.",
    featured: true,
    features: [
      "Unlimited Reports",
      "Progress Dashboard",
      "Parent + Student Profiles",
      "Tutor Recommendations",
      "Priority Support",
      "Session Booking",
      "Report History",
    ],
    cta: { label: "Upgrade Now", to: "/auth" },
  },
  {
    id: "institution",
    name: "Institution",
    price: "Custom Pricing",
    priceNote: "Schools · Tutors · EdTech · International Schools",
    description: "Built for organizations supporting many learners at once.",
    featured: false,
    features: [
      "Multi-student Dashboard",
      "API Integration",
      "White Label Reports",
      "Analytics",
      "Dedicated Support",
      "Onboarding Assistance",
    ],
    cta: { label: "Contact Sales", to: "/about" },
  },
];

const COMPARISON_ROWS = [
  { label: "AI Curriculum Readiness Reports", free: "1 report", premium: "Unlimited", institution: "Unlimited" },
  { label: "Progress Dashboard", free: false, premium: true, institution: true },
  { label: "Parent + Student Profiles", free: false, premium: true, institution: true },
  { label: "Tutor Recommendations", free: false, premium: true, institution: true },
  { label: "Priority Support", free: false, premium: true, institution: true },
  { label: "Session Booking", free: false, premium: true, institution: true },
  { label: "Report History", free: false, premium: true, institution: true },
  { label: "Multi-student Dashboard", free: false, premium: false, institution: true },
  { label: "API Integration", free: false, premium: false, institution: true },
  { label: "White Label Reports", free: false, premium: false, institution: true },
  { label: "Analytics", free: false, premium: false, institution: true },
  { label: "Dedicated Support", free: false, premium: false, institution: true },
];

const FAQS = [
  {
    question: "Can I cancel anytime?",
    answer: "Yes. Premium is billed month-to-month with no lock-in — cancel whenever you like and keep access until the end of your billing period.",
  },
  {
    question: "Can I upgrade later?",
    answer: "Absolutely. Start on the Free plan and upgrade to Premium the moment you need unlimited reports, tutor recommendations, or session booking.",
  },
  {
    question: "Is my data secure?",
    answer: "Yes. Every report is generated privately and used only to personalize your assessment and recommendations — we never sell or share your family's data.",
  },
  {
    question: "Can schools request custom plans?",
    answer: "Yes. Our Institution plan is fully customizable for schools, tutoring centers, EdTech platforms, and international schools — reach out and we'll tailor a plan to your scale.",
  },
];

const renderComparisonCell = (value: string | boolean) => {
  if (typeof value === "string") {
    return <span className="text-sm font-medium text-foreground">{value}</span>;
  }
  return value ? (
    <Check className="mx-auto h-5 w-5 text-secondary" />
  ) : (
    <Minus className="mx-auto h-4 w-4 text-muted-foreground/40" />
  );
};

const PricingPage = () => {
  const [openFaq, setOpenFaq] = useState<string | undefined>(undefined);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* SECTION 1 — HERO */}
      <section className="relative overflow-hidden bg-background py-16 md:py-24">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-secondary/10 blur-3xl" />
          <div className="absolute top-10 -right-24 h-80 w-80 rounded-full bg-violet/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-mint/20 blur-3xl" />
        </div>

        <div className="container relative mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4 text-secondary" />
              <span className="text-sm font-semibold uppercase tracking-wide text-secondary">Pricing</span>
            </div>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">
              Simple,{" "}
              <span className="bg-gradient-cta bg-clip-text text-transparent">transparent pricing.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground md:text-xl">
              Start free and upgrade only when you're ready. Designed for parents, students, tutors and
              institutions.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
              {TRUST_BADGES.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/80 px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-soft backdrop-blur-sm"
                >
                  <Icon className="h-3.5 w-3.5 text-secondary" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — PRICING CARDS */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-3 lg:items-center lg:gap-8">
            {PLANS.map((plan) => (
              <Card
                key={plan.id}
                className={cn(
                  "relative flex h-full flex-col rounded-2xl border-2 p-8 shadow-soft transition-all duration-300 ease-smooth hover:-translate-y-1 hover:shadow-strong",
                  plan.featured
                    ? "border-secondary bg-primary text-primary-foreground shadow-strong lg:scale-105"
                    : "border-border bg-card"
                )}
              >
                {plan.featured && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-cta px-4 py-1 text-xs font-semibold text-white shadow-medium hover:bg-gradient-cta">
                    Most Popular
                  </Badge>
                )}

                <div className="mb-6">
                  <h3 className={cn("text-xl font-bold", plan.featured ? "text-primary-foreground" : "text-foreground")}>
                    {plan.name}
                  </h3>
                  <p className={cn("mt-1 text-sm", plan.featured ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {plan.description}
                  </p>
                </div>

                <div className="mb-6">
                  <span className={cn("text-4xl font-bold", plan.featured ? "text-primary-foreground" : "text-foreground")}>
                    {plan.price}
                  </span>
                  <p className={cn("mt-1 text-sm", plan.featured ? "text-mint" : "text-muted-foreground")}>{plan.priceNote}</p>
                </div>

                <ul className="mb-8 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <Check
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0",
                          plan.featured ? "text-mint" : "text-secondary"
                        )}
                      />
                      <span className={plan.featured ? "text-primary-foreground/90" : "text-foreground"}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  size="lg"
                  className={cn(
                    "w-full rounded-full font-semibold transition-all duration-300",
                    plan.featured
                      ? "bg-gradient-cta text-white shadow-medium hover:shadow-strong hover:brightness-105"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                  variant={plan.featured ? undefined : "default"}
                >
                  <Link to={plan.cta.to}>{plan.cta.label}</Link>
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3 — FEATURE COMPARISON TABLE */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-3xl font-bold md:text-4xl">
              Compare <span className="text-secondary">plans</span>
            </h2>
            <p className="mt-3 text-muted-foreground">Every feature, side by side.</p>
          </div>

          <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-sm font-semibold text-foreground">Feature</TableHead>
                  <TableHead className="text-center text-sm font-semibold text-foreground">Free</TableHead>
                  <TableHead className="text-center text-sm font-semibold text-secondary">Premium</TableHead>
                  <TableHead className="text-center text-sm font-semibold text-foreground">Institution</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {COMPARISON_ROWS.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell className="text-sm font-medium text-foreground">{row.label}</TableCell>
                    <TableCell className="text-center">{renderComparisonCell(row.free)}</TableCell>
                    <TableCell className="bg-secondary/5 text-center">{renderComparisonCell(row.premium)}</TableCell>
                    <TableCell className="text-center">{renderComparisonCell(row.institution)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      {/* SECTION 4 — FAQ */}
      <section id="faq" className="bg-muted/30 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-3xl font-bold md:text-4xl">
              Frequently asked <span className="text-secondary">questions</span>
            </h2>
          </div>

          <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-2 shadow-soft sm:p-4">
            <Accordion type="single" collapsible value={openFaq} onValueChange={setOpenFaq}>
              {FAQS.map((faq, index) => (
                <AccordionItem key={faq.question} value={`faq-${index}`} className="border-border px-2">
                  <AccordionTrigger className="text-left text-base font-semibold hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* SECTION 5 — FINAL CTA */}
      <section className="relative overflow-hidden bg-primary py-16 md:py-20">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-16 left-1/4 h-64 w-64 rounded-full bg-secondary/20 blur-3xl" />
          <div className="absolute -bottom-16 right-1/4 h-64 w-64 rounded-full bg-violet/20 blur-3xl" />
        </div>
        <div className="container relative mx-auto px-4 text-center">
          <FileCheck className="mx-auto mb-4 h-10 w-10 text-mint" />
          <h2 className="text-3xl font-bold text-primary-foreground md:text-4xl">
            Ready to begin your curriculum journey?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/70">
            Get your first AI-powered readiness report free — no credit card required.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 gap-2 rounded-full bg-gradient-cta px-8 text-base font-semibold text-white shadow-medium transition-all duration-300 hover:shadow-strong hover:brightness-105"
          >
            <Link to="/begin-journey">
              Start Free Assessment
              <Sparkles className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PricingPage;
