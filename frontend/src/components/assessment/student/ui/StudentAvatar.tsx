import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface StudentAvatarProps {
  /** Change this value (e.g. the current step index) to trigger a one-time celebration burst. */
  celebrateKey?: number | string;
  /** 0-100 — the smile grows a little wider as progress climbs. */
  percent?: number;
}

// Discrete smile shapes swapped by cross-fade rather than animating the SVG
// `d` attribute directly — Framer Motion can't interpolate between two path
// strings, only fade/scale the element as a whole (see InputCard/ReportGenerationLoader
// for the same constraint).
const SMILE_TIERS = [
  { max: 33, d: "M26,41 Q32,44 38,41" },
  { max: 66, d: "M23,40 Q32,48 41,40" },
  { max: 99, d: "M20,39 Q32,53 44,39" },
  { max: 100, d: "M18,38 Q32,56 46,38" },
];

const getSmilePath = (percent: number) => (SMILE_TIERS.find((tier) => percent <= tier.max) ?? SMILE_TIERS[SMILE_TIERS.length - 1]).d;

// Simple, friendly mascot for the Student assessment sidebar — built entirely
// from the existing brand gradient (no new colors), a couple of dots for
// eyes, and a curved smile that grows with progress. Blinks occasionally,
// floats gently, and pops a few sparkles when celebrateKey changes (e.g.
// finishing a step).
const StudentAvatar = ({ celebrateKey, percent = 50 }: StudentAvatarProps) => {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const [blink, setBlink] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const smilePath = getSmilePath(Math.max(0, Math.min(100, percent)));

  useEffect(() => {
    if (shouldReduceMotion) return;
    let timeoutId: number;
    const scheduleBlink = () => {
      timeoutId = window.setTimeout(() => {
        setBlink(true);
        window.setTimeout(() => setBlink(false), 150);
        scheduleBlink();
      }, 2800 + Math.random() * 2400);
    };
    scheduleBlink();
    return () => window.clearTimeout(timeoutId);
  }, [shouldReduceMotion]);

  useEffect(() => {
    if (celebrateKey === undefined) return;
    setCelebrating(true);
    const id = window.setTimeout(() => setCelebrating(false), 800);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebrateKey]);

  return (
    <div className="relative h-12 w-12 shrink-0" role="presentation" aria-hidden="true">
      <motion.div
        className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-cta shadow-glow-sm"
        animate={{
          y: shouldReduceMotion ? 0 : [0, -3, 0],
          scale: celebrating ? [1, 1.15, 1] : 1,
        }}
        transition={{
          y: { duration: 3, repeat: shouldReduceMotion ? 0 : Infinity, ease: "easeInOut" },
          scale: { duration: 0.45, ease: "easeOut" },
        }}
      >
        <svg viewBox="0 0 64 64" className="h-6 w-6">
          <motion.circle cx="24" cy="30" r="3.6" fill="white" style={{ transformOrigin: "24px 30px" }} animate={{ scaleY: blink ? 0.1 : 1 }} transition={{ duration: 0.08 }} />
          <motion.circle cx="40" cy="30" r="3.6" fill="white" style={{ transformOrigin: "40px 30px" }} animate={{ scaleY: blink ? 0.1 : 1 }} transition={{ duration: 0.08 }} />
          <AnimatePresence mode="wait" initial={false}>
            <motion.path
              key={smilePath}
              d={smilePath}
              stroke="white"
              strokeWidth="3.4"
              strokeLinecap="round"
              fill="none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            />
          </AnimatePresence>
        </svg>
      </motion.div>

      <AnimatePresence>
        {celebrating && !shouldReduceMotion && (
          <>
            {[0, 1, 2].map((i) => {
              const angle = (i / 3) * Math.PI * 2 - Math.PI / 2;
              return (
                <motion.span
                  key={i}
                  className="absolute left-1/2 top-1/2 text-mint"
                  initial={{ opacity: 0, scale: 0.4, x: 0, y: 0 }}
                  animate={{ opacity: [1, 0], scale: [0.6, 1], x: Math.cos(angle) * 32, y: Math.sin(angle) * 32 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                >
                  <Sparkles className="h-3 w-3" />
                </motion.span>
              );
            })}
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentAvatar;
