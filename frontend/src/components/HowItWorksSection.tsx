import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowRight, ClipboardList, FileBarChart, ListChecks, Rocket } from "lucide-react";
import { motion, type Variants } from "framer-motion";

interface Step {
  number: string;
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  bgColor: string;
}

const STEPS: Step[] = [
  {
    number: "01",
    icon: ClipboardList,
    title: "Tell us about your child",
    description: "Grade, country, curriculum, and your target Indian board.",
    color: "hsl(var(--accent))",
    bgColor: "hsl(var(--accent) / 0.16)",
  },
  {
    number: "02",
    icon: ListChecks,
    title: "Complete the assessment",
    description: "Academic track, subjects, strengths, and your timeline.",
    color: "hsl(var(--violet))",
    bgColor: "hsl(var(--violet) / 0.18)",
  },
  {
    number: "03",
    icon: FileBarChart,
    title: "Receive your report",
    description: "Alignment %, NCERT gaps, and a personalised bridge plan.",
    color: "hsl(var(--mint))",
    bgColor: "hsl(var(--mint) / 0.2)",
  },
  {
    number: "04",
    icon: Rocket,
    title: "Act with confidence",
    description: "Share with tutors, track progress, and retake anytime.",
    color: "hsl(var(--accent))",
    bgColor: "hsl(var(--accent) / 0.16)",
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

const stepReveal: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
};

const badgePop: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] } },
};

// The number badge is the visual spine of the flow — large, bold, and tied
// together by a connecting line/rail so the four steps read as one
// sequence rather than four unrelated cards.
const StepBadge = ({ step }: { step: Step }) => (
  <motion.div
    variants={badgePop}
    className="relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-black sm:h-20 sm:w-20 sm:text-3xl"
    style={{
      color: step.color,
      backgroundColor: step.bgColor,
      boxShadow: `inset 0 0 0 2px ${step.color}`,
    }}
  >
    {step.number}
  </motion.div>
);

const StepContent = ({ step }: { step: Step }) => {
  const Icon = step.icon;
  return (
    <div>
      <Icon className="mb-2 h-4 w-4" style={{ color: step.color }} aria-hidden="true" />
      <h3 className="mb-1.5 text-base font-bold text-white sm:text-lg">{step.title}</h3>
      <p className="text-sm leading-relaxed text-white/65">{step.description}</p>
    </div>
  );
};

const HowItWorksSection = () => {
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
          className="mx-auto mb-14 max-w-2xl text-center sm:mb-20"
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

        {/* Desktop / tablet: horizontal flow — an arrow sits at the midpoint
            between each pair of badges so the sequence reads as a directed
            step 1 -> step 2 -> step 3 -> step 4 path, not a plain line. */}
        <motion.div
          className="relative mx-auto hidden max-w-5xl lg:grid lg:grid-cols-4 lg:gap-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
            {[25, 50, 75].map((pct) => (
              <ArrowRight
                key={pct}
                className="absolute top-8 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-white/30 sm:top-10"
                style={{ left: `${pct}%` }}
              />
            ))}
          </div>
          {STEPS.map((step) => (
            <motion.div key={step.number} variants={stepReveal} className="relative flex flex-col items-center text-center">
              <StepBadge step={step} />
              <div className="mt-5">
                <StepContent step={step} />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Mobile: vertical flow — the same badge + a connecting arrow,
            stacked top-to-bottom with content to the right of each badge. */}
        <motion.div
          className="mx-auto max-w-md lg:hidden"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {STEPS.map((step, i) => (
            <motion.div key={step.number} variants={stepReveal} className="flex gap-5">
              <div className="flex flex-col items-center">
                <StepBadge step={step} />
                {i < STEPS.length - 1 && (
                  <div aria-hidden="true" className="flex flex-1 items-center justify-center py-1">
                    <ArrowDown className="h-5 w-5 text-white/30" />
                  </div>
                )}
              </div>
              <div className={i < STEPS.length - 1 ? "pb-9 pt-1" : "pt-1"}>
                <StepContent step={step} />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
