import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

// Lightweight, non-bordered section heading — used to break each step's
// content into digestible, clearly-labeled subsections without stacking a
// card-inside-a-card (the whole step already sits inside one big card via
// ParentAssessmentLayout).

interface SectionContainerProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

const SectionContainer = ({ icon: Icon, title, description, children, className }: SectionContainerProps) => (
  <div className={className ?? "space-y-5"}>
    <div className="text-center">
      {Icon && (
        <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-cta text-white shadow-medium">
          <Icon className="h-5 w-5" />
        </span>
      )}
      <h3 className="text-2xl font-bold text-foreground">{title}</h3>
      {description && <p className="mt-1 text-muted-foreground">{description}</p>}
    </div>
    {children}
  </div>
);

export default SectionContainer;
