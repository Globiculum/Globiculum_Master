import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import StudentCompanionAvatar from "./StudentCompanionAvatar";

interface AssessmentHeaderProps {
  onChangePersona: () => void;
  title: string;
  subtitle: string;
  currentIndex?: number;
  totalSteps?: number;
}

const AssessmentHeader = ({ onChangePersona, title, subtitle, currentIndex, totalSteps }: AssessmentHeaderProps) => (
  <div className="mb-8 flex items-start gap-4">
    <StudentCompanionAvatar size="lg" celebrateKey={currentIndex} className="hidden shrink-0 sm:block" />

    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onChangePersona}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-secondary"
        >
          <ArrowLeft className="h-4 w-4" />
          Change persona
        </button>

        {currentIndex !== undefined && totalSteps !== undefined && (
          <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
            Step {currentIndex + 1} of {totalSteps}
          </span>
        )}
      </div>

      <motion.h1
        key={title}
        className="mt-3 text-h2 text-foreground"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        {title}
      </motion.h1>
      <p className="mt-2 text-body text-muted-foreground">{subtitle}</p>
    </div>
  </div>
);

export default AssessmentHeader;
