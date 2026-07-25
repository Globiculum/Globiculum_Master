import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { PartyPopper } from "lucide-react";

const MESSAGES = ["Nice work!", "You're doing great!", "Awesome job!", "Almost there!", "You did it!"];

interface StepCelebrationToastProps {
  /** The current step index — a friendly toast pops in each time this changes (skipped on first mount). */
  stepIndex: number;
}

// Small, transient "nice job" toast that celebrates moving on to the next
// step. Purely decorative and non-blocking (pointer-events-none), auto
// dismisses itself — never interrupts the flow, just rewards progress.
const StepCelebrationToast = ({ stepIndex }: StepCelebrationToastProps) => {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const [visible, setVisible] = useState(false);
  const prevIndex = useRef(stepIndex);

  useEffect(() => {
    // Only celebrate forward progress — going Back to fix an earlier answer
    // shouldn't feel like a reward. Skipped entirely under reduced motion,
    // same as the rest of this page's purely decorative flourishes.
    const advanced = stepIndex > prevIndex.current;
    prevIndex.current = stepIndex;
    if (!advanced || shouldReduceMotion) return;

    setVisible(true);
    const id = window.setTimeout(() => setVisible(false), 1700);
    return () => window.clearTimeout(id);
  }, [stepIndex, shouldReduceMotion]);

  const message = MESSAGES[stepIndex % MESSAGES.length];

  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[90] flex justify-center px-4" aria-live="polite">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: -14, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.92 }}
            transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-cta px-5 py-2.5 text-sm font-semibold text-white shadow-glow-md"
          >
            <motion.span
              animate={{ rotate: [0, -12, 12, 0] }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            >
              <PartyPopper className="h-4 w-4" />
            </motion.span>
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StepCelebrationToast;
