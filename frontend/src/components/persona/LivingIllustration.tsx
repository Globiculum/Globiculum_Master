import { motion, useReducedMotion } from "framer-motion";
import { GraduationCap, Users } from "lucide-react";

// Compact "living" centerpiece: two icon nodes with independent gentle
// float, a flowing dashed connector between them, slow-orbiting particles,
// and a soft pulsing ambient glow. Entirely decorative — respects
// prefers-reduced-motion by freezing every loop to its resting frame.
const LivingIllustration = () => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative mx-auto h-40 w-40 sm:h-44 sm:w-44" role="presentation" aria-hidden="true">
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-br from-secondary/25 via-violet/20 to-mint/25 blur-2xl"
        animate={shouldReduceMotion ? undefined : { opacity: [0.6, 1, 0.6], scale: [0.96, 1.02, 0.96] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {!shouldReduceMotion && (
        <motion.div className="absolute inset-0" animate={{ rotate: 360 }} transition={{ duration: 26, repeat: Infinity, ease: "linear" }}>
          <span className="absolute left-1/2 top-1 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-secondary/70" />
          <span className="absolute bottom-3 left-3 h-1 w-1 rounded-full bg-violet/70" />
          <span className="absolute bottom-5 right-1 h-1.5 w-1.5 rounded-full bg-mint/80" />
        </motion.div>
      )}

      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
        <motion.path
          d="M30,72 Q50,32 72,30"
          fill="none"
          stroke="hsl(var(--secondary))"
          strokeWidth="1.25"
          strokeDasharray="3 5"
          strokeLinecap="round"
          opacity="0.4"
          animate={shouldReduceMotion ? undefined : { strokeDashoffset: [0, -16] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
      </svg>

      <motion.div
        className="absolute bottom-5 left-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow-sm sm:h-16 sm:w-16"
        animate={shouldReduceMotion ? undefined : { y: [0, -4, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Users className="h-6 w-6 sm:h-7 sm:w-7" />
      </motion.div>

      <motion.div
        className="absolute right-4 top-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-violet text-primary-foreground shadow-glow-sm sm:h-16 sm:w-16"
        animate={shouldReduceMotion ? undefined : { y: [0, 5, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
      >
        <GraduationCap className="h-6 w-6 sm:h-7 sm:w-7" />
      </motion.div>
    </div>
  );
};

export default LivingIllustration;
