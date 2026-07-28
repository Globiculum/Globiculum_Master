import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import InfoTooltip from "./InfoTooltip";

// Compact, left-aligned sub-heading used to group fields *within* a step's
// SectionCard. Parent steps have more distinct field groups per step than
// Student's, so this exists purely to keep those groups readable without
// stacking a card-inside-a-card.

interface SectionContainerProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

const SectionContainer = ({ icon: Icon, title, description, children, className }: SectionContainerProps) => (
  <div className={className ?? "space-y-4"}>
    <div className="flex items-center gap-2">
      {Icon && <Icon className="h-4 w-4 text-secondary" />}
      <h3 className="text-base font-bold text-foreground">{title}</h3>
      {description && <InfoTooltip description={description} />}
    </div>
    {children}
  </div>
);

export default SectionContainer;
