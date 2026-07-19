import { useState } from "react";
import { ArrowRight, Check, GraduationCap, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Persona = "parent" | "student";

interface PersonaOption {
  id: Persona;
  title: string;
  description: string;
  icon: typeof Users;
  gradient: string;
}

const PERSONAS: PersonaOption[] = [
  {
    id: "parent",
    title: "Parent",
    description:
      "I'm guiding my child through their curriculum transition and want a clear picture of their readiness.",
    icon: Users,
    gradient: "bg-gradient-primary",
  },
  {
    id: "student",
    title: "Student",
    description:
      "I'm the one making the move and want to know exactly what I need to bridge myself.",
    icon: GraduationCap,
    gradient: "bg-gradient-success",
  },
];

interface PersonaSelectionProps {
  onContinue: (persona: Persona) => void;
}

const PersonaSelection = ({ onContinue }: PersonaSelectionProps) => {
  const [selected, setSelected] = useState<Persona | null>(null);

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
        {PERSONAS.map((persona) => {
          const Icon = persona.icon;
          const isSelected = selected === persona.id;

          return (
            <Card
              key={persona.id}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onClick={() => setSelected(persona.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelected(persona.id);
                }
              }}
              className={cn(
                "group relative cursor-pointer select-none border-2 p-8 text-center transition-all duration-300 ease-smooth",
                "hover:-translate-y-2 hover:shadow-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected
                  ? "-translate-y-2 border-primary shadow-strong"
                  : "border-border shadow-soft"
              )}
            >
              {isSelected && (
                <span className="absolute right-4 top-4 flex h-7 w-7 animate-in zoom-in-50 items-center justify-center rounded-full bg-primary text-primary-foreground duration-300">
                  <Check className="h-4 w-4" />
                </span>
              )}

              <div
                className={cn(
                  "mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl text-primary-foreground shadow-medium transition-transform duration-300 ease-spring",
                  "group-hover:-rotate-3 group-hover:scale-110",
                  persona.gradient
                )}
              >
                <Icon className="h-10 w-10" />
              </div>

              <h3 className="mb-2 text-2xl font-bold text-foreground">
                {persona.title}
              </h3>
              <p className="text-base leading-relaxed text-muted-foreground">
                {persona.description}
              </p>
            </Card>
          );
        })}
      </div>

      <div className="mt-10 flex justify-center">
        <Button
          size="lg"
          disabled={!selected}
          onClick={() => selected && onContinue(selected)}
          className="group gap-2 px-8"
        >
          Continue
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Button>
      </div>
    </div>
  );
};

export default PersonaSelection;
