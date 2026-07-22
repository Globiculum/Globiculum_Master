import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import InfoTooltip from "./InfoTooltip";

// Two variants:
// - "card" — the single outer wrapper for an entire step's content,
//   deliberately identical to the Student assessment's SectionCard
//   (student/ui/SectionCard.tsx): rounded-2xl border, shadow-soft, icon
//   badge + left-aligned title row.
// - "plain" (default) — a compact, left-aligned sub-heading used to group
//   fields *within* a step's card. Parent steps have more distinct field
//   groups per step than Student's, so this variant exists purely to keep
//   those groups readable without stacking a card-inside-a-card.

interface SectionContainerProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  variant?: "plain" | "card";
}

const SectionContainer = ({ icon: Icon, title, description, children, className, variant = "plain" }: SectionContainerProps) => {
  if (variant === "card") {
    return (
      <div
        className={cn(
          "animate-in fade-in-0 slide-in-from-bottom-2 rounded-2xl border border-border bg-card p-6 shadow-soft duration-300 md:p-8",
          className
        )}
      >
        <div className="mb-6 flex items-start gap-3">
          {Icon && (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-cta text-white shadow-medium">
              <Icon className="h-5 w-5" />
            </span>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xl font-bold text-foreground">{title}</h2>
              {description && <InfoTooltip description={description} />}
            </div>
          </div>
        </div>
        <div className="space-y-6">{children}</div>
      </div>
    );
  }

  return (
    <div className={className ?? "space-y-4"}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-secondary" />}
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        {description && <InfoTooltip description={description} />}
      </div>
      {children}
    </div>
  );
};

export default SectionContainer;
