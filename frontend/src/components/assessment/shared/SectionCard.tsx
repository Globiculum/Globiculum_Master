import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import InfoTooltip from "./InfoTooltip";

interface SectionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}

// Small animated scene above the title — a gently bobbing icon badge with
// two tiny accent dots slowly orbiting it. Reuses the step's own icon and
// the existing brand gradient/mint/amber tones. Shared by both the Parent
// and Student assessments as the single outer wrapper for a step's content.
const StepIllustration = ({ icon: Icon }: { icon: LucideIcon }) => {
  const shouldReduceMotion = useReducedMotion() ?? false;

  return (
    <div className="relative mb-3 h-16 w-16" aria-hidden="true">
      <motion.div
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-cta text-white shadow-glow-sm"
        animate={shouldReduceMotion ? undefined : { y: [0, -4, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <Icon className="h-7 w-7" />
      </motion.div>

      {!shouldReduceMotion && (
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        >
          <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-mint" />
          <span className="absolute bottom-0 -right-1 h-1.5 w-1.5 rounded-full bg-accent" />
        </motion.div>
      )}
    </div>
  );
};

const SectionCard = ({ icon: Icon, title, description, children }: SectionCardProps) => (
  <motion.div
    className="rounded-2xl border border-border bg-card p-6 shadow-soft md:p-8"
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
  >
    <StepIllustration icon={Icon} />

    <div className="mb-6 flex items-center gap-1.5">
      <h2 className="text-h3 text-foreground">{title}</h2>
      {description && <InfoTooltip description={description} />}
    </div>
    <div className="space-y-6">{children}</div>
  </motion.div>
);

export default SectionCard;
