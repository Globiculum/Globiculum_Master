import type { LucideIcon } from "lucide-react";
import { Award, BrainCircuit, Globe, LifeBuoy, ShieldCheck } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

interface TrustFeature {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient: string;
}

const FEATURES: TrustFeature[] = [
  {
    icon: LifeBuoy,
    title: "24/7 Expert Support",
    description: "Always available guidance from education specialists.",
    gradient: "linear-gradient(135deg, hsl(var(--secondary)), hsl(var(--violet)))",
  },
  {
    icon: ShieldCheck,
    title: "100% Secure & Compliant",
    description: "Enterprise-grade privacy and trusted data protection.",
    gradient: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))",
  },
  {
    icon: Award,
    title: "Multi-Board Excellence",
    description: "Supporting CBSE, ICSE, Cambridge, IB and more.",
    gradient: "linear-gradient(135deg, hsl(var(--secondary)), hsl(var(--mint)))",
  },
  {
    icon: BrainCircuit,
    title: "AI-Powered Learning Intelligence",
    description: "Adaptive insights tailored to every learner.",
    gradient: "linear-gradient(135deg, hsl(var(--violet)), hsl(var(--secondary)))",
  },
  {
    icon: Globe,
    title: "Global Family Community",
    description: "Helping families worldwide navigate education confidently.",
    gradient: "linear-gradient(135deg, hsl(var(--accent)), hsl(var(--secondary)))",
  },
];

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

const TrustCard = ({ feature, index }: { feature: TrustFeature; index: number }) => {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const Icon = feature.icon;

  return (
    <motion.div
      variants={cardVariants}
      whileHover={shouldReduceMotion ? undefined : { y: -4 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="group relative"
    >
      {/* Ambient glow — fades in behind the card on hover */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-3 rounded-2xl opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: feature.gradient }}
      />

      {/* Gradient ring — 1px border revealed on hover */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: feature.gradient }}
      />

      <div className="relative flex h-full flex-col items-center gap-2 rounded-xl border border-border/70 bg-card/90 px-4 py-3 text-center shadow-soft backdrop-blur-sm transition-shadow duration-300 group-hover:shadow-glow-md">
        <motion.div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-glow-sm"
          style={{ background: feature.gradient }}
          animate={shouldReduceMotion ? undefined : { y: [0, -3, 0] }}
          transition={{
            duration: 3.4 + index * 0.3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: index * 0.25,
          }}
          whileHover={shouldReduceMotion ? undefined : { scale: 1.1, rotate: 6 }}
        >
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </motion.div>

        <h3 className="text-xs font-semibold leading-snug text-foreground sm:text-sm">{feature.title}</h3>
      </div>
    </motion.div>
  );
};

const AboutSection = () => {
  const shouldReduceMotion = useReducedMotion() ?? false;

  return (
    <section id="about" className="relative overflow-hidden bg-background py-8 sm:py-10 md:py-12">
      {/* Decorative backdrop — soft brand-toned orbs, purely presentational */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-x-0 top-0 h-full"
          style={{ background: "radial-gradient(55% 35% at 50% 0%, hsl(var(--secondary) / 0.05) 0%, transparent 70%)" }}
        />
        <motion.div
          className="absolute -top-16 -left-16 h-56 w-56 rounded-full bg-violet/10 blur-3xl"
          animate={shouldReduceMotion ? undefined : { x: [0, 14, 0], y: [0, 10, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-16 -right-12 h-56 w-56 rounded-full bg-mint/10 blur-3xl"
          animate={shouldReduceMotion ? undefined : { x: [0, -12, 0], y: [0, -12, 0] }}
          transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="container relative mx-auto px-4 sm:px-6">
        <motion.div
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {FEATURES.map((feature, index) => (
            <TrustCard key={feature.title} feature={feature} index={index} />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default AboutSection;
