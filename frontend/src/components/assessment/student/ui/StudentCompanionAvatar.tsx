import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { GraduationCap, Sparkles } from "lucide-react";

interface StudentCompanionAvatarProps {
  size?: "sm" | "lg";
  /** Change this value (e.g. the current step index) to trigger a one-time celebration burst. */
  celebrateKey?: number | string;
  className?: string;
}

const SIZE_PX = { sm: 56, lg: 88 } as const;

// Purely decorative, icon-composed "companion" — no illustration assets
// available, so the friendly face is built from primitives: a gradient
// head, blinking eyes, a smile, and a tilted grad cap. Blinks on a random
// interval, floats gently, and bursts a few sparkles when celebrateKey
// changes (e.g. advancing to the next step).
const StudentCompanionAvatar = ({ size = "lg", celebrateKey, className }: StudentCompanionAvatarProps) => {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const px = SIZE_PX[size];
  const [blink, setBlink] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    if (shouldReduceMotion) return;
    let timeoutId: number;
    const scheduleBlink = () => {
      const delay = 2600 + Math.random() * 2600;
      timeoutId = window.setTimeout(() => {
        setBlink(true);
        window.setTimeout(() => setBlink(false), 160);
        scheduleBlink();
      }, delay);
    };
    scheduleBlink();
    return () => window.clearTimeout(timeoutId);
  }, [shouldReduceMotion]);

  useEffect(() => {
    if (celebrateKey === undefined) return;
    setCelebrating(true);
    const id = window.setTimeout(() => setCelebrating(false), 900);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebrateKey]);

  return (
    <div className={className} style={{ width: px, height: px }} role="presentation" aria-hidden="true">
      <div className="relative h-full w-full">
        <motion.div
          className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-cta shadow-glow-sm"
          animate={{
            y: shouldReduceMotion ? 0 : [0, -5, 0],
            scale: celebrating ? [1, 1.14, 1] : 1,
          }}
          transition={{
            y: { duration: 3.4, repeat: shouldReduceMotion ? 0 : Infinity, ease: "easeInOut" },
            scale: { duration: 0.5, ease: "easeOut" },
          }}
        >
          <svg viewBox="0 0 64 64" className="h-[58%] w-[58%]">
            {/* Eyes blink via scaleY transform (Framer Motion can't interpolate
                raw SVG geometry attrs like `ry`) — circle stays fixed size,
                only its vertical scale animates, so no attribute morphing. */}
            <motion.circle
              cx="24"
              cy="30"
              r="3.4"
              fill="white"
              style={{ transformOrigin: "24px 30px" }}
              animate={{ scaleY: blink ? 0.12 : 1 }}
              transition={{ duration: 0.09 }}
            />
            <motion.circle
              cx="40"
              cy="30"
              r="3.4"
              fill="white"
              style={{ transformOrigin: "40px 30px" }}
              animate={{ scaleY: blink ? 0.12 : 1 }}
              transition={{ duration: 0.09 }}
            />
            {/* Smile stays a fixed path (Framer Motion doesn't morph `d`
                between two shapes) — celebration reads through the avatar's
                own scale bounce + sparkle burst instead. */}
            <path d="M22,40 Q32,49 42,40" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
          </svg>

          <div className="absolute -top-2 left-1/2 -translate-x-1/2 -rotate-6 text-white/95" style={{ width: px * 0.36, height: px * 0.36 }}>
            <GraduationCap className="h-full w-full" />
          </div>
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
                    animate={{
                      opacity: [1, 0],
                      scale: [0.6, 1],
                      x: Math.cos(angle) * px * 0.72,
                      y: Math.sin(angle) * px * 0.72,
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  >
                    <Sparkles className="h-4 w-4" />
                  </motion.span>
                );
              })}
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default StudentCompanionAvatar;
