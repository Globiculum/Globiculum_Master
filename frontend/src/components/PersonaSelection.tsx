import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { BarChart3, GraduationCap, Lightbulb, Route, Users } from "lucide-react";
import PersonaCard, { type PersonaCardChip } from "@/components/persona/PersonaCard";
import PersonaCTAButton from "@/components/persona/PersonaCTAButton";

export type Persona = "parent" | "student";

interface PersonaOption {
  id: Persona;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: "primary" | "violet";
  chips: PersonaCardChip[];
}

const PERSONAS: PersonaOption[] = [
  {
    id: "parent",
    title: "Parent",
    description: "Helping my child transition confidently.",
    icon: Users,
    accent: "primary",
    chips: [
      { icon: Route, label: "Personalized Roadmap" },
      { icon: BarChart3, label: "Curriculum Comparison" },
    ],
  },
  {
    id: "student",
    title: "Student",
    description: "Preparing for my own learning journey.",
    icon: GraduationCap,
    accent: "violet",
    chips: [
      { icon: Lightbulb, label: "Skill Insights" },
      { icon: Route, label: "Personalized Learning Path" },
    ],
  },
];

// Entrance-only variants — content and interaction logic live in PersonaCard
// / PersonaCTAButton; this component just orchestrates selection state and
// the staggered mount sequence.
const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

const ctaVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

interface PersonaSelectionProps {
  onContinue: (persona: Persona) => void;
  /** Fires as soon as a card is picked (before Continue), so a parent step
   * indicator can reflect the right flow length ahead of confirmation. */
  onSelectionChange?: (persona: Persona | null) => void;
}

const PersonaSelection = ({ onContinue, onSelectionChange }: PersonaSelectionProps) => {
  const [selected, setSelected] = useState<Persona | null>(null);

  const handleSelect = (persona: Persona) => {
    setSelected(persona);
    onSelectionChange?.(persona);
  };

  return (
    <motion.div className="mx-auto max-w-3xl" initial="hidden" animate="show" variants={containerVariants}>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {PERSONAS.map((persona) => (
          <motion.div key={persona.id} variants={cardVariants}>
            <PersonaCard
              icon={persona.icon}
              title={persona.title}
              description={persona.description}
              chips={persona.chips}
              accent={persona.accent}
              selected={selected === persona.id}
              onSelect={() => handleSelect(persona.id)}
            />
          </motion.div>
        ))}
      </div>

      <motion.div className="mt-6 flex flex-col items-center gap-2" variants={ctaVariants}>
        <PersonaCTAButton disabled={!selected} onClick={() => selected && onContinue(selected)}>
          Continue
        </PersonaCTAButton>
        <p className="text-caption text-muted-foreground">We personalize everything based on your choice.</p>
      </motion.div>
    </motion.div>
  );
};

export default PersonaSelection;
