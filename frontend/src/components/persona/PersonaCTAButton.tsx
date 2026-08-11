import { useState, type MouseEvent, type ReactNode } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export interface PersonaCTAButtonProps {
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: ReactNode;
}

const wrapperVariants: Variants = {
  rest: { y: 0 },
  hover: { y: -2 },
};

const arrowVariants: Variants = {
  rest: { x: 0 },
  hover: { x: 4 },
};

const MotionButton = motion.create(Button);

let rippleSeq = 0;

// Premium CTA: gradient fill, periodic shine sweep, click ripple, hover lift,
// tap scale, and a built-in (but here unused) loading state for reuse
// elsewhere — disabled/onClick semantics are unchanged from a plain Button.
const PersonaCTAButton = ({ disabled, loading, onClick, children }: PersonaCTAButtonProps) => {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const isInteractive = !disabled && !loading;

  const handlePointerDown = (event: MouseEvent<HTMLButtonElement>) => {
    if (!isInteractive) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const id = rippleSeq++;
    setRipples((prev) => [...prev, { id, x: event.clientX - rect.left, y: event.clientY - rect.top }]);
    window.setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 650);
  };

  return (
    <MotionButton
      size="lg"
      disabled={disabled || loading}
      onClick={onClick}
      onMouseDown={handlePointerDown}
      variants={wrapperVariants}
      initial="rest"
      whileHover={isInteractive ? "hover" : "rest"}
      whileTap={isInteractive ? { scale: 0.97 } : undefined}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={cn(
        "group relative gap-2 overflow-hidden rounded-full bg-accent px-10 py-6 text-base font-semibold text-accent-foreground shadow-lg shadow-accent/25",
        "transition-all duration-200 hover:bg-accent/90 hover:shadow-xl hover:shadow-accent/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none"
      )}
    >
      {isInteractive && (
        <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
          <motion.span
            className="absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/25"
            initial={{ x: "-120%" }}
            animate={{ x: ["-120%", "260%"] }}
            transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 2.4, ease: "easeInOut" }}
          />
        </span>
      )}

      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            className="pointer-events-none absolute rounded-full bg-white/40"
            style={{ left: ripple.x, top: ripple.y, translateX: "-50%", translateY: "-50%" }}
            initial={{ width: 0, height: 0, opacity: 0.5 }}
            animate={{ width: 220, height: 220, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        ))}
      </AnimatePresence>

      <span className="relative z-10 inline-flex items-center gap-2">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </>
        ) : (
          <>
            {children}
            <motion.span variants={arrowVariants} transition={{ duration: 0.15 }} className="inline-flex">
              <ArrowRight className="h-4 w-4" />
            </motion.span>
          </>
        )}
      </span>
    </MotionButton>
  );
};

export default PersonaCTAButton;
