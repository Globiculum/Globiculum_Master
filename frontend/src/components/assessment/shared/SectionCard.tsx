import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import InfoTooltip from "./InfoTooltip";

// icon accepts either a Lucide component or a string src for the 3D PNG
// icon family (frontend/src/assets/icons-3d/) — the raster set has no
// dynamic fill to satisfy the old LucideIcon-only contract, so this widens
// to a union rather than forcing every caller through an adapter component.
type SectionIcon = LucideIcon | string;

interface SectionCardProps {
  /** Ignored when `logo` is provided. */
  icon?: SectionIcon;
  title: string;
  /** Shown as a hover/tap info tooltip next to the title. Omit when the step
   * already has its own always-visible description text below the title. */
  description?: string;
  /** Bobbing + orbiting-dot motion on the icon badge. Default true; set
   * false for a static badge, e.g. when an `illustration` is present and the
   * motion would compete with it. Ignored when `logo` is provided. */
  animated?: boolean;
  /** Optional decorative image shown to the right of the icon badge, filling
   * the otherwise-empty space next to it on wider screens. Hidden on small
   * screens to avoid crowding the title. */
  illustration?: string;
  /** A standalone logo image shown plainly (no gradient badge, no white
   * backing circle, no bob/orbit animation) in place of the usual icon
   * badge — for a persona's own logo rather than a topical step icon. */
  logo?: string;
  children: ReactNode;
}

// Small scene above the title — an icon badge, optionally with a gentle bob
// and two tiny accent dots slowly orbiting it. Reuses the step's own icon and
// the existing brand gradient/mint/amber tones. Shared by both the Parent
// and Student assessments as the single outer wrapper for a step's content.
const StepIllustration = ({ icon: Icon, animated }: { icon: SectionIcon; animated: boolean }) => {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const motionEnabled = animated && !shouldReduceMotion;

  return (
    <div className="relative h-16 w-16 shrink-0" aria-hidden="true">
      <motion.div
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-cta text-white shadow-glow-sm"
        animate={motionEnabled ? { y: [0, -4, 0] } : undefined}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      >
        {typeof Icon === "string" ? (
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/95 shadow-sm">
            <img src={Icon} className="h-7 w-7 object-contain" alt="" draggable={false} />
          </span>
        ) : (
          <Icon className="h-7 w-7" />
        )}
      </motion.div>

      {motionEnabled && (
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

const SectionCard = ({ icon: Icon, title, description, animated = true, illustration, logo, children }: SectionCardProps) => (
  <motion.div
    className="rounded-2xl border border-border bg-card p-6 shadow-soft md:p-8"
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
  >
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {logo ? (
          <img src={logo} className="h-20 w-20 shrink-0 object-contain" alt="" aria-hidden="true" draggable={false} />
        ) : (
          Icon && <StepIllustration icon={Icon} animated={animated} />
        )}
        <div className="flex items-center gap-1.5">
          <h2 className="text-h3 text-foreground">{title}</h2>
          {description && <InfoTooltip description={description} />}
        </div>
      </div>
      {illustration && (
        <div
          className="hidden h-20 flex-1 overflow-hidden rounded-2xl sm:block sm:h-24 md:h-28"
          style={{
            WebkitMaskImage: "linear-gradient(to right, transparent, black 4%, black 96%, transparent)",
            maskImage: "linear-gradient(to right, transparent, black 4%, black 96%, transparent)",
          }}
        >
          <img
            src={illustration}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="h-full w-full object-cover"
            style={{ objectPosition: "32% 72%" }}
          />
        </div>
      )}
    </div>
    <div className="space-y-6">{children}</div>
  </motion.div>
);

export default SectionCard;
