import type { LucideIcon } from "lucide-react";
import { Bot, BookOpen, MessageCircle, Puzzle } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

interface ProblemCard {
  number: string;
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

const PROBLEM_CARDS: ProblemCard[] = [
  {
    number: "01",
    icon: MessageCircle,
    title: "WhatsApp Groups",
    description: "Generic advice that ignores your child's actual grade, board, or subject gaps.",
    color: "hsl(var(--accent))",
  },
  {
    number: "02",
    icon: Bot,
    title: "ChatGPT & Google",
    description: "No NCERT mapping, no grade context — just a list of learning platforms.",
    color: "hsl(var(--violet))",
  },
  {
    number: "03",
    icon: BookOpen,
    title: "Tutors Without Assessment",
    description: "Teaching starts before anyone knows where your child actually stands.",
    color: "hsl(var(--secondary))",
  },
  {
    number: "04",
    icon: Puzzle,
    title: "The Methodology Shock",
    description: "Discussion-based classrooms don't prepare kids for exam-heavy, teacher-led ones.",
    color: "hsl(var(--mint))",
  },
];

const NOISE_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'>" +
      "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/>" +
      "<feColorMatrix type='saturate' values='0'/></filter>" +
      "<rect width='100%' height='100%' filter='url(#n)'/></svg>"
  );

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

const iconPop: Variants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1], delay: 0.15 } },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const ProblemCardItem = ({ card }: { card: ProblemCard }) => {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const Icon = card.icon;

  return (
    <motion.div variants={fadeUp} className="group relative">
      {/* Ambient glow — fades in behind the card on hover */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-3 rounded-[32px] opacity-0 blur-2xl transition-opacity duration-[450ms] group-hover:opacity-40"
        style={{ background: card.color }}
      />

      <motion.div
        whileHover={shouldReduceMotion ? undefined : { y: -8, scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300, damping: 22, mass: 0.6 }}
        className="relative flex h-full flex-col overflow-hidden rounded-[28px] border border-[rgba(15,23,42,0.06)] bg-white p-6 shadow-sm transition-[box-shadow,border-color] duration-[450ms] hover:border-secondary hover:shadow-xl sm:p-7"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-5 top-2 select-none text-5xl font-black blur-[0.3px] transition-transform duration-[450ms] group-hover:-translate-y-1.5 sm:text-6xl"
          style={{ color: "rgba(15,23,42,0.14)" }}
        >
          {card.number}
        </span>

        <motion.div
          variants={iconPop}
          whileHover={shouldReduceMotion ? undefined : { scale: 1.08, rotate: 5 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-background"
          style={{
            color: card.color,
            boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.6), 0 2px 6px -2px rgba(15,23,42,0.12)",
          }}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </motion.div>

        <h3 className="relative mb-2 text-lg font-bold text-foreground">{card.title}</h3>
        <p className="relative text-sm leading-relaxed text-muted-foreground">{card.description}</p>
      </motion.div>
    </motion.div>
  );
};

const ChallengeSection = () => {
  const shouldReduceMotion = useReducedMotion() ?? false;

  return (
    <section className="relative overflow-hidden bg-white pb-20 pt-8 sm:pb-24 sm:pt-10 md:pb-28 md:pt-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-x-0 top-0 h-full"
          style={{ background: "radial-gradient(55% 40% at 50% 0%, hsl(var(--secondary) / 0.05) 0%, transparent 70%)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
          style={{ backgroundImage: `url("${NOISE_SVG}")`, backgroundSize: "120px 120px" }}
        />
      </div>

      <div className="container relative mx-auto px-4 sm:px-6">
        <motion.div
          className="mb-12 max-w-2xl sm:mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={staggerContainer}
        >
          <motion.span
            variants={fadeUp}
            className="mb-6 inline-block rounded-full bg-accent px-6 py-2.5 text-base font-bold uppercase tracking-wide text-accent-foreground shadow-[0_8px_24px_-8px_rgba(245,158,11,0.55)] sm:text-lg"
          >
            The Problem
          </motion.span>

          <motion.h2
            variants={fadeUp}
            className="text-[32px] font-extrabold text-foreground sm:text-[40px] md:text-[46px]"
            style={{ letterSpacing: "-0.01em", lineHeight: 1.25 }}
          >
            NRI families are navigating their child&apos;s academic transition{" "}
            <motion.span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: "linear-gradient(90deg, hsl(var(--accent)) 0%, #FDE0A6 50%, hsl(var(--accent)) 100%)",
                backgroundSize: "200% 100%",
              }}
              animate={shouldReduceMotion ? undefined : { backgroundPositionX: ["0%", "100%", "0%"] }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            >
              blind.
            </motion.span>
          </motion.h2>

          <motion.p variants={fadeUp} className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            No platform tells you what your specific child is actually missing — chapter by chapter. Here&apos;s what families are doing instead:
          </motion.p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {PROBLEM_CARDS.map((card) => (
            <ProblemCardItem key={card.title} card={card} />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default ChallengeSection;
