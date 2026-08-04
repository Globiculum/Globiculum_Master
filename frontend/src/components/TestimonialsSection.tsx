import { useState } from "react";
import { Quote, User, GraduationCap, ChevronDown } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

interface Testimonial {
  name: string;
  role: string;
  quote: string;
  color: string;
  isEducator: boolean;
}

// A quote longer than this reliably overflows 3 clamped lines at card width — gate the
// "Read more" affordance on it so short quotes render fully with no dangling toggle.
const READ_MORE_THRESHOLD = 130;

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Vatsala",
    role: "NRI parent · Charlotte NC · Grade 6",
    quote:
      "This is something very important for the kids. For the parents especially — to find a pathway. Most of them are moving back. They have no clue what they're doing. Just trial and error. And kids are going through a lot.",
    color: "hsl(var(--secondary))",
    isEducator: false,
  },
  {
    name: "Sowmya S.",
    role: "Parent-tutor · Texas · Tatva Academy",
    quote:
      "If we give that structure today — you can learn this much in this subject — we don't have any pressure. If we train the kids in such a way they will be like an all-rounder.",
    color: "hsl(var(--accent))",
    isEducator: true,
  },
  {
    name: "Pia Chauhan",
    role: "Tutor · CBSE, Texas TEKS & Australian curriculum",
    quote:
      "A structured gap analysis report would significantly help both parents and tutors. Parents struggle finding qualified tutors and managing multiple demo classes. Assessment-first saves everyone time.",
    color: "hsl(var(--violet))",
    isEducator: true,
  },
  {
    name: "Sandhya",
    role: "NRI parent · Texas · Grade 8 child",
    quote:
      "Bridging the learning methodology gap with Indian syllabus taught through US pedagogical methods would help prepare children better for repatriation.",
    color: "hsl(var(--mint))",
    isEducator: false,
  },
  {
    name: "Usha",
    role: "Academic advisor · Grades 4–12 specialist",
    quote:
      "The detailed topics were given in each subject. Phases very helpful — the report is well done for all 3 boards: IGCSE, CBSE, IB. Rohan is already strong in Algebra — the hardest to catch up on.",
    color: "hsl(var(--secondary))",
    isEducator: true,
  },
  {
    name: "Gayatri",
    role: "NRI parent · Virginia · Grade 6 child",
    quote:
      "At least what to work on is important, right? One tutor — he conducted an assessment first before teaching. That is what every family needs. Not jumping straight into tutoring.",
    color: "hsl(var(--accent))",
    isEducator: false,
  },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const TestimonialCard = ({ testimonial }: { testimonial: Testimonial }) => {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const [expanded, setExpanded] = useState(false);
  const AvatarIcon = testimonial.isEducator ? GraduationCap : User;
  const needsReadMore = testimonial.quote.length > READ_MORE_THRESHOLD;

  return (
    <motion.div variants={fadeUp} className="group relative h-full">
      {/* Ambient glow — fades in behind the card on hover, consistent teal across every card */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-3 rounded-[32px] bg-secondary opacity-0 blur-2xl transition-opacity duration-[450ms] group-hover:opacity-30"
      />

      <motion.div
        layout={!shouldReduceMotion}
        whileHover={shouldReduceMotion ? undefined : { y: -6 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="relative flex h-full flex-col rounded-2xl border border-white/10 bg-primary/30 p-6 backdrop-blur-sm transition-colors duration-300 group-hover:bg-primary/25 sm:p-7"
      >
        <Quote className="mb-4 h-6 w-6 shrink-0" style={{ color: `${testimonial.color}b3` }} aria-hidden="true" />

        <div className="mb-6 flex-1">
          <p
            className={cn(
              "text-[15px] leading-[1.7] text-white/85",
              !expanded && needsReadMore && "line-clamp-3"
            )}
          >
            {testimonial.quote}
          </p>
          {needsReadMore && (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              aria-expanded={expanded}
              className="mt-2.5 inline-flex items-center gap-1 text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ color: testimonial.color }}
            >
              {expanded ? "Show less" : "Read more"}
              <ChevronDown
                className={cn("h-3.5 w-3.5 transition-transform duration-200", expanded && "rotate-180")}
                aria-hidden="true"
              />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-white/10 pt-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: `${testimonial.color}26` }}
          >
            <AvatarIcon className="h-5 w-5" style={{ color: testimonial.color }} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{testimonial.name}</div>
            <div className="truncate text-xs text-white/70">{testimonial.role}</div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const TestimonialsSection = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-hero py-16 sm:py-20 md:py-24">
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
            What They Said
          </motion.p>

          <motion.h2 variants={fadeUp} className="text-[28px] font-extrabold leading-tight text-white sm:text-[36px] md:text-[42px]">
            In their own words
          </motion.h2>

          <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-xl text-white/70">
            25+ families interviewed. 12 tutor-reviewed reports. These are the real voices behind Globiculum.
          </motion.p>
        </motion.div>

        <motion.div
          className="mx-auto grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {TESTIMONIALS.map((testimonial) => (
            <TestimonialCard key={testimonial.name} testimonial={testimonial} />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
