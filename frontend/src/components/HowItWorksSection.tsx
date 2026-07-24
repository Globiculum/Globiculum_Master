import { Fragment } from "react";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

interface Step {
  number: string;
  title: string;
  description: string;
  color: string;
}

const STEPS: Step[] = [
  {
    number: "01",
    title: "Tell us about your child",
    description: "Grade, country, current curriculum (US Common Core, IB, Cambridge), and your target Indian board.",
    color: "hsl(var(--accent))",
  },
  {
    number: "02",
    title: "Complete the assessment",
    description: "4 short steps — academic track, subjects, strengths, challenges, and move timeline.",
    color: "hsl(var(--violet))",
  },
  {
    number: "03",
    title: "Receive your report",
    description: "AI-generated gap analysis: alignment %, chapter-level NCERT gaps, a confidence-first view, and a personalised bridge plan.",
    color: "hsl(var(--secondary))",
  },
  {
    number: "04",
    title: "Act with confidence",
    description: "Share with tutors, track progress on your dashboard, book sessions — retake as your child improves.",
    color: "hsl(var(--mint))",
  },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const StepCard = ({ step }: { step: Step }) => {
  const shouldReduceMotion = useReducedMotion() ?? false;

  return (
    <motion.div
      variants={fadeUp}
      whileHover={shouldReduceMotion ? undefined : { y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="group relative flex h-full flex-col rounded-2xl border border-black/[0.04] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-12px_rgba(15,23,42,0.18)] transition-shadow duration-300 hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_20px_40px_-14px_rgba(15,23,42,0.28)] sm:p-7"
    >
      <div className="relative mb-5 flex items-center gap-2">
        <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: step.color }} />
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-foreground"
          style={{ backgroundColor: `${step.color}1f` }}
        >
          {step.number}
        </span>
      </div>
      <h3 className="mb-2 text-base font-bold text-foreground sm:text-lg">{step.title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
    </motion.div>
  );
};

const HowItWorksSection = () => {
  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden py-16 sm:py-20 md:py-24"
      style={{ background: "linear-gradient(180deg, hsl(175 84% 26%) 0%, hsl(175 84% 16%) 100%)" }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-x-0 top-0 h-2/3"
          style={{ background: "radial-gradient(60% 50% at 50% 0%, hsl(var(--mint) / 0.18) 0%, transparent 70%)" }}
        />
      </div>

      <div className="container relative mx-auto px-4 sm:px-6">
        <motion.div
          className="mx-auto mb-14 max-w-2xl text-center sm:mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={staggerContainer}
        >
          <motion.p
            variants={fadeUp}
            className="mb-5 flex items-center justify-center gap-2 text-sm font-semibold uppercase text-white"
            style={{ letterSpacing: "2px" }}
          >
            <span aria-hidden="true" className="h-px w-5 bg-white/60" />
            How It Works
          </motion.p>

          <motion.span
            variants={fadeUp}
            className="mb-6 inline-block rounded-full bg-accent px-6 py-2.5 text-base font-bold uppercase tracking-wide text-accent-foreground shadow-[0_8px_24px_-8px_rgba(245,158,11,0.55)] sm:text-lg"
          >
            The Solution
          </motion.span>

          <motion.h2 variants={fadeUp} className="text-[28px] font-extrabold leading-tight text-white sm:text-[36px] md:text-[42px]">
            From uncertainty to a clear roadmap in 10 minutes
          </motion.h2>

          <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-xl text-white/95">
            A focused assessment that produces a report tutors, parents, and students can all act on immediately.
          </motion.p>
        </motion.div>

        <motion.div
          className="mx-auto grid max-w-6xl grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {STEPS.map((step, index) => (
            <Fragment key={step.number}>
              <StepCard step={step} />
              {index < STEPS.length - 1 && (
                <div aria-hidden="true" className="hidden items-center justify-center lg:flex">
                  <ArrowRight className="h-5 w-5 text-white/40" />
                </div>
              )}
            </Fragment>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
