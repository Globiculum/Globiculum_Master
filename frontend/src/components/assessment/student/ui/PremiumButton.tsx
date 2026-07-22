import { useState, type MouseEvent, type ReactNode } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export interface PremiumButtonProps {
  variant?: "primary" | "secondary";
  size?: "default" | "lg";
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
  children: ReactNode;
}

const wrapperVariants: Variants = {
  rest: { y: 0 },
  hover: { y: -2 },
};

let rippleSeq = 0;

const MotionButton = motion.create(Button);

// Shared premium nav/action button for the Student assessment: gradient
// fill + shine sweep + click ripple for "primary" (Continue / Generate My
// Report), a calmer bordered treatment for "secondary" (Back). Motion is
// applied directly to the underlying <button> (not a wrapping div) so
// Framer Motion's automatic tap-accessibility injection doesn't create a
// second, unstyled Tab stop — see PersonaCTAButton for the same fix.
//
// Loading state deliberately has no spinner icon — the shimmer sweep runs
// continuously (no pause between passes) so the button itself reads as
// "actively working" rather than a frozen box with a spinning glyph on top.
// Content (label/icon) stays exactly what the caller passes in; this
// component never injects its own loading copy or icon.
const PremiumButton = ({
  variant = "primary",
  size = "default",
  disabled,
  loading,
  onClick,
  type = "button",
  className,
  children,
}: PremiumButtonProps) => {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const isInteractive = !disabled && !loading;
  const isPrimary = variant === "primary";
  const showShimmer = isPrimary && !disabled;

  const handlePointerDown = (event: MouseEvent<HTMLButtonElement>) => {
    if (!isInteractive || !isPrimary) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const id = rippleSeq++;
    setRipples((prev) => [...prev, { id, x: event.clientX - rect.left, y: event.clientY - rect.top }]);
    window.setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 650);
  };

  return (
    <MotionButton
      type={type}
      size={size === "lg" ? "lg" : "default"}
      disabled={disabled || loading}
      onClick={onClick}
      onMouseDown={handlePointerDown}
      variants={wrapperVariants}
      initial="rest"
      whileHover={isInteractive ? "hover" : "rest"}
      whileTap={isInteractive ? { scale: 0.97 } : undefined}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={cn(
        "group relative gap-2 overflow-hidden rounded-full font-semibold transition-shadow duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isPrimary
          ? "bg-gradient-cta text-white shadow-medium hover:shadow-glow-md disabled:pointer-events-none disabled:shadow-none"
          : "border border-border bg-card text-foreground shadow-none hover:border-secondary/50 hover:bg-secondary/5 disabled:pointer-events-none disabled:opacity-40",
        // Only a genuinely-disabled (non-loading) button dims — a loading
        // button stays at full vividness so the shimmer reads clearly. The
        // explicit disabled:opacity-100 is needed to cancel out the base
        // shadcn Button's own unconditional disabled:opacity-50, which
        // still applies since the native `disabled` attribute is true
        // while loading too.
        disabled && !loading && "opacity-40",
        loading && "disabled:opacity-100",
        size === "lg" ? "px-8 py-6 text-base" : "px-5",
        className
      )}
    >
      {showShimmer && (
        <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
          <motion.span
            className={cn("absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12", loading ? "bg-white/35" : "bg-white/25")}
            initial={{ x: "-120%" }}
            animate={{ x: ["-120%", "260%"] }}
            transition={
              loading
                ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" }
                : { duration: 1.4, repeat: Infinity, repeatDelay: 2.4, ease: "easeInOut" }
            }
          />
        </span>
      )}

      {isPrimary && (
        <AnimatePresence>
          {ripples.map((ripple) => (
            <motion.span
              key={ripple.id}
              className="pointer-events-none absolute rounded-full bg-white/40"
              style={{ left: ripple.x, top: ripple.y, translateX: "-50%", translateY: "-50%" }}
              initial={{ width: 0, height: 0, opacity: 0.5 }}
              animate={{ width: 180, height: 180, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          ))}
        </AnimatePresence>
      )}

      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </MotionButton>
  );
};

export default PremiumButton;
