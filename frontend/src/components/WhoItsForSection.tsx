import type { LucideIcon } from "lucide-react";
import { ArrowRight, CalendarClock, CalendarRange, Siren } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

interface Persona {
  badge: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  description: string;
  cta: string;
  color: string;
}

const PERSONAS: Persona[] = [
  {
    badge: "Highest Urgency",
    icon: Siren,
    title: "Forced Movers",
    subtitle: "Moving in 30–90 days",
    description: "A structured plan for exactly what to fix — before the school bell rings.",
    cta: "Start your plan — free",
    color: "hsl(var(--violet))",
  },
  {
    badge: "Actively Preparing",
    icon: CalendarClock,
    title: "Contingency Preppers",
    subtitle: "Possible return in 3–6 months",
    description: "Track gaps monthly and prepare steadily, without disrupting your child's current school.",
    cta: "Begin free assessment",
    color: "hsl(var(--accent))",
  },
  {
    badge: "Long-Term Planning",
    icon: CalendarRange,
    title: "Long-Term Planners",
    subtitle: "Deliberate return in 1–2 years",
    description: "A clear picture of where your child stands today, so you invest in what matters.",
    cta: "See where your child stands",
    color: "hsl(var(--secondary))",
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

const PersonaCard = ({ persona }: { persona: Persona }) => {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const Icon = persona.icon;

  return (
    <motion.div variants={fadeUp} className="group relative h-full">
      {/* Ambient glow — fades in behind the card on hover, matching the Problem section's pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-3 rounded-[32px] opacity-0 blur-2xl transition-opacity duration-[450ms] group-hover:opacity-30"
        style={{ background: persona.color }}
      />

      <motion.div
        whileHover={shouldReduceMotion ? undefined : { y: -6 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="relative flex h-full flex-col overflow-hidden rounded-[28px] border border-[rgba(15,23,42,0.06)] bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-xl sm:p-7"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
            style={{
              backgroundColor: `${persona.color}14`,
              color: persona.color,
              boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.6), 0 2px 6px -2px rgba(15,23,42,0.12)",
            }}
          >
            <Icon className="h-6 w-6" aria-hidden="true" />
          </div>
          <span
            className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
            style={{ backgroundColor: `${persona.color}14`, color: persona.color }}
          >
            {persona.badge}
          </span>
        </div>

        <h3 className="text-lg font-bold text-foreground">{persona.title}</h3>
        <p className="mb-3 text-sm font-semibold" style={{ color: persona.color }}>
          {persona.subtitle}
        </p>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{persona.description}</p>

        <a
          href="/begin-journey"
          className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ color: persona.color }}
        >
          {persona.cta}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>

        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1" style={{ backgroundColor: persona.color }} />
      </motion.div>
    </motion.div>
  );
};

const WhoItsForSection = () => {
  return (
    <section className="relative overflow-hidden bg-white py-16 sm:py-20 md:py-24">
      <div className="container relative mx-auto px-4 sm:px-6">
        <motion.div
          className="mx-auto mb-12 max-w-2xl text-center sm:mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={staggerContainer}
        >
          <motion.p
            variants={fadeUp}
            className="mb-4 flex items-center justify-center gap-2 text-sm font-semibold uppercase text-secondary"
            style={{ letterSpacing: "2px" }}
          >
            <span aria-hidden="true" className="h-px w-5 bg-secondary" />
            Who It&apos;s For
          </motion.p>

          <motion.h2 variants={fadeUp} className="text-[28px] font-extrabold leading-tight text-foreground sm:text-[36px] md:text-[42px]">
            Built for every NRI family&apos;s timeline
          </motion.h2>

          <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Whether you&apos;re moving in 60 days or planning a year ahead, Globiculum meets you where you are.
          </motion.p>
        </motion.div>

        <motion.div
          className="mx-auto grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {PERSONAS.map((persona) => (
            <PersonaCard key={persona.title} persona={persona} />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default WhoItsForSection;
