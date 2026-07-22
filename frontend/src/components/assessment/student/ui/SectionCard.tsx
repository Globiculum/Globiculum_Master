import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import InfoTooltip from "../../shared/InfoTooltip";

interface SectionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}

const SectionCard = ({ icon: Icon, title, description, children }: SectionCardProps) => (
  <motion.div
    className="rounded-2xl border border-border bg-card p-6 shadow-soft md:p-8"
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
  >
    <div className="mb-6 flex items-start gap-3">
      <motion.span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-cta text-white shadow-medium"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.08, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <Icon className="h-5 w-5" />
      </motion.span>
      <div className="flex items-center gap-1.5">
        <h2 className="text-h3 text-foreground">{title}</h2>
        {description && <InfoTooltip description={description} />}
      </div>
    </div>
    <div className="space-y-6">{children}</div>
  </motion.div>
);

export default SectionCard;
