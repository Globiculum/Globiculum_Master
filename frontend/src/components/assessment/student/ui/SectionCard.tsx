import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface SectionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}

const SectionCard = ({ icon: Icon, title, description, children }: SectionCardProps) => (
  <div className="animate-in fade-in-0 slide-in-from-bottom-2 rounded-2xl border border-border bg-card p-6 shadow-soft duration-300 md:p-8">
    <div className="mb-6 flex items-start gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-cta text-white shadow-medium">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
    <div className="space-y-6">{children}</div>
  </div>
);

export default SectionCard;
