import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";

const STEPS = [
  "Enter your child's grade, country & curriculum",
  "Complete the 4-step assessment (10 min)",
  "Receive your full Transition Readiness Report",
  "Optionally upgrade for monthly progress tracking",
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const StepRow = ({ step, index }: { step: string; index: number }) => {
  const shouldReduceMotion = useReducedMotion() ?? false;

  return (
    <motion.div
      variants={fadeUp}
      whileHover={shouldReduceMotion ? undefined : { y: -3, x: 2 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className="group flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-sm transition-colors duration-300 hover:border-secondary/40 hover:bg-white/[0.07]"
    >
      <motion.span
        whileHover={shouldReduceMotion ? undefined : { scale: 1.12 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-sm font-bold text-secondary transition-colors duration-300 group-hover:bg-secondary group-hover:text-secondary-foreground"
      >
        {index + 1}
      </motion.span>
      <span className="text-sm text-white/90 sm:text-[15px]">{step}</span>
    </motion.div>
  );
};

const CTAButton = () => {
  const shouldReduceMotion = useReducedMotion() ?? false;

  return (
    <motion.div
      whileHover={shouldReduceMotion ? undefined : { scale: 1.03, y: -2 }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className="inline-block"
    >
      <Button
        size="lg"
        className="group/btn relative overflow-hidden bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/35 transition-shadow duration-300 rounded-full font-semibold px-7 sm:px-9 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
        asChild
      >
        <a href="/begin-journey">
          {/* Shimmer sweep on hover */}
          <span
            aria-hidden="true"
            className="motion-reduce:hidden pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/25 opacity-0 transition-all duration-700 group-hover/btn:left-[130%] group-hover/btn:opacity-100"
          />
          <span className="relative">Start Free — 10 Minutes</span>
          <ArrowRight className="relative ml-2 h-5 w-5 transition-transform duration-300 group-hover/btn:translate-x-1" />
        </a>
      </Button>
    </motion.div>
  );
};

const FreeStartSection = () => {
  const shouldReduceMotion = useReducedMotion() ?? false;

  return (
    <section className="relative bg-background py-16 sm:py-20 md:py-24">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-gradient-hero shadow-[0_24px_70px_-20px_rgba(13,148,136,0.35)]"
        >
          {/* Ambient depth — soft glows, contained within the card */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              className="absolute -left-16 -top-16 h-72 w-72 rounded-full opacity-40 blur-3xl"
              style={{ background: "hsl(var(--violet) / 0.35)" }}
            />
            <div
              className="absolute -right-10 -bottom-16 h-80 w-80 rounded-full opacity-40 blur-3xl"
              style={{ background: "hsl(var(--mint) / 0.3)" }}
            />
          </div>

          <div className="relative grid grid-cols-1 items-center gap-10 p-8 sm:p-12 lg:grid-cols-2 lg:gap-16 lg:p-16">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={staggerContainer}
            >
              <motion.p
                variants={fadeUp}
                className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase text-secondary sm:text-sm"
                style={{ letterSpacing: "1.5px" }}
              >
                <motion.span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-secondary"
                  animate={shouldReduceMotion ? undefined : { scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                Free to Start
              </motion.p>

              <motion.h2 variants={fadeUp} className="text-[28px] font-extrabold leading-tight text-white sm:text-[36px] md:text-[40px]">
                Your first gap analysis is free. No credit card.
              </motion.h2>

              <motion.p variants={fadeUp} className="mt-4 text-white/80 leading-relaxed">
                See the full report. Understand exactly what your child needs. Then decide if you want ongoing monthly support. We&apos;d rather earn your trust with the product than ask for commitment upfront.
              </motion.p>

              <motion.div variants={fadeUp} className="mt-8">
                <CTAButton />
              </motion.div>
            </motion.div>

            <motion.div
              className="space-y-3"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={staggerContainer}
            >
              {STEPS.map((step, index) => (
                <StepRow key={step} step={step} index={index} />
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FreeStartSection;
