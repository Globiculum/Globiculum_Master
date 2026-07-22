import { motion, useReducedMotion } from "framer-motion";

// Subtle, generated (no image asset) noise texture — keeps the surface from
// looking like flat vector fill, matching the "handcrafted" premium SaaS feel
// of Linear/Vercel marketing surfaces. Opacity is intentionally very low.
const GRAIN_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'>" +
      "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/>" +
      "<feColorMatrix type='saturate' values='0'/></filter>" +
      "<rect width='100%' height='100%' filter='url(#n)'/></svg>"
  );

interface OrbConfig {
  className: string;
  driftX: number;
  driftY: number;
  duration: number;
}

const ORBS: OrbConfig[] = [
  { className: "absolute -top-24 -left-20 h-72 w-72 rounded-full bg-secondary/10 blur-3xl", driftX: 18, driftY: 12, duration: 22 },
  { className: "absolute top-10 -right-24 h-80 w-80 rounded-full bg-violet/10 blur-3xl", driftX: -16, driftY: 18, duration: 26 },
  { className: "absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-mint/10 blur-3xl", driftX: 14, driftY: -14, duration: 24 },
];

// Purely decorative — soft radial spotlight, slow-drifting blurred orbs, and
// a faint grain overlay. No content, no interaction, safe to render behind
// anything.
const PersonaBackground = () => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-x-0 -top-1/4 h-[130%]"
        style={{
          background: "radial-gradient(60% 45% at 50% 0%, hsl(var(--secondary) / 0.08) 0%, transparent 70%)",
        }}
      />

      {ORBS.map((orb, index) => (
        <motion.div
          key={index}
          className={orb.className}
          animate={shouldReduceMotion ? undefined : { x: [0, orb.driftX, 0], y: [0, orb.driftY, 0] }}
          transition={{ duration: orb.duration, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      <div
        className="absolute inset-0 opacity-[0.025] mix-blend-overlay"
        style={{ backgroundImage: `url("${GRAIN_SVG}")`, backgroundSize: "120px 120px" }}
      />
    </div>
  );
};

export default PersonaBackground;
