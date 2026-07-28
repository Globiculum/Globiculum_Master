import { motion, useReducedMotion } from "framer-motion";
import { BookOpen, GraduationCap, Globe, PenLine, Star } from "lucide-react";

// Purely decorative page backdrop shared by both assessments: soft radial
// glow, three slow-drifting blurred orbs, a faint grain overlay, and a
// handful of very low-opacity floating education icons. No image assets.
const GRAIN_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'>" +
      "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/>" +
      "<feColorMatrix type='saturate' values='0'/></filter>" +
      "<rect width='100%' height='100%' filter='url(#n)'/></svg>"
  );

const ORBS = [
  { className: "absolute -top-28 -left-24 h-96 w-96 rounded-full bg-violet/10 blur-3xl", driftX: 16, driftY: 14, duration: 24 },
  { className: "absolute top-32 -right-32 h-96 w-96 rounded-full bg-secondary/10 blur-3xl", driftX: -14, driftY: 18, duration: 28 },
  { className: "absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-mint/10 blur-3xl", driftX: 12, driftY: -12, duration: 26 },
];

const FLOATING_ICONS = [
  { Icon: BookOpen, className: "left-[6%] top-[18%]", color: "text-secondary/[0.14]", size: 24, duration: 9, delay: 0 },
  { Icon: Globe, className: "right-[8%] top-[12%]", color: "text-violet/[0.14]", size: 28, duration: 11, delay: 0.6 },
  { Icon: PenLine, className: "left-[10%] bottom-[22%]", color: "text-mint/[0.18]", size: 22, duration: 10, delay: 0.3 },
  { Icon: GraduationCap, className: "right-[6%] bottom-[16%]", color: "text-secondary/[0.14]", size: 26, duration: 12, delay: 0.9 },
  { Icon: Star, className: "left-[46%] top-[8%]", color: "text-accent/[0.18]", size: 18, duration: 8, delay: 0.2 },
];

const AssessmentBackground = () => {
  const shouldReduceMotion = useReducedMotion() ?? false;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-full"
        style={{ background: "radial-gradient(60% 40% at 50% 0%, hsl(var(--secondary) / 0.06) 0%, transparent 70%)" }}
      />

      {ORBS.map((orb, index) => (
        <motion.div
          key={index}
          className={orb.className}
          animate={shouldReduceMotion ? undefined : { x: [0, orb.driftX, 0], y: [0, orb.driftY, 0] }}
          transition={{ duration: orb.duration, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {!shouldReduceMotion &&
        FLOATING_ICONS.map(({ Icon, className, color, size, duration, delay }, index) => (
          <motion.div
            key={index}
            className={`absolute hidden md:block ${color} ${className}`}
            animate={{ y: [0, -12, 0], x: [0, 5, 0], rotate: [0, 8, -8, 0] }}
            transition={{ duration, repeat: Infinity, ease: "easeInOut", delay }}
          >
            <Icon style={{ width: size, height: size }} />
          </motion.div>
        ))}

      <div
        className="absolute inset-0 opacity-[0.02] mix-blend-overlay"
        style={{ backgroundImage: `url("${GRAIN_SVG}")`, backgroundSize: "120px 120px" }}
      />
    </div>
  );
};

export default AssessmentBackground;
