import type { LucideIcon } from "lucide-react";
import { ClipboardList, FileBarChart, ListChecks, Rocket } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

interface Step {
  number: string;
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

const STEPS: Step[] = [
  {
    number: "01",
    icon: ClipboardList,
    title: "Tell us about your child",
    description: "Grade, country, current curriculum (US Common Core, IB, Cambridge), and your target Indian board.",
    color: "hsl(var(--accent))",
  },
  {
    number: "02",
    icon: ListChecks,
    title: "Complete the assessment",
    description: "4 short steps — academic track, subjects, strengths, challenges, and move timeline.",
    color: "hsl(var(--violet))",
  },
  {
    number: "03",
    icon: FileBarChart,
    title: "Receive your report",
    description: "AI-generated gap analysis: alignment %, chapter-level NCERT gaps, a confidence-first view, and a personalised bridge plan.",
    color: "hsl(var(--mint))",
  },
  {
    number: "04",
    icon: Rocket,
    title: "Act with confidence",
    description: "Share with tutors, track progress on your dashboard, book sessions — retake as your child improves.",
    color: "hsl(var(--accent))",
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

const StepItem = ({ step }: { step: Step }) => {
  const Icon = step.icon;

  return (
    <motion.div variants={fadeUp} className="group relative p-7 transition-colors duration-300 hover:bg-white/[0.04] sm:p-8">
      <div className="mb-5 flex items-center justify-between">
        <Icon className="h-5 w-5" style={{ color: step.color }} aria-hidden="true" />
        <span className="text-xs font-bold tracking-wide text-white/30">{step.number}</span>
      </div>
      <h3 className="mb-2 text-base font-bold text-white sm:text-lg">{step.title}</h3>
      <p className="text-sm leading-relaxed text-white/65">{step.description}</p>
    </motion.div>
  );
};

const HowItWorksSection = () => {
  const shouldReduceMotion = useReducedMotion() ?? false;

  return (
    <section id="how-it-works" className="relative overflow-hidden bg-gradient-hero py-16 sm:py-20 md:py-24">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-x-0 top-0 h-2/3"
          style={{ background: "radial-gradient(60% 50% at 50% 0%, hsl(var(--mint) / 0.12) 0%, transparent 70%)" }}
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
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-5xl overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.05] backdrop-blur-sm"
        >
          <motion.div
            className="grid grid-cols-1 divide-y divide-white/10 lg:grid-cols-4 lg:divide-x lg:divide-y-0"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            {STEPS.map((step) => (
              <StepItem key={step.number} step={step} />
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
