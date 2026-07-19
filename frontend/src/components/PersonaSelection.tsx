import { useState } from "react";
import {
  ArrowRight,
  Check,
  Clock,
  FileText,
  GraduationCap,
  Lock,
  Sparkles,
  Users,
} from "lucide-react";
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
  benefits: string[];
  estimatedTime: string;
  accentRing: string;
}

const PERSONAS: PersonaOption[] = [
  {
    id: "parent",
    title: "Parent",
    description:
      "I'm guiding my child through their curriculum transition and want a clear picture of their readiness.",
    icon: Users,
    gradient: "bg-gradient-primary",
    benefits: [
      "Child-focused assessment",
      "Personalized readiness report",
      "Action plan for parents",
    ],
    estimatedTime: "10 min",
    accentRing: "border-primary",
  },
  {
    id: "student",
    title: "Student",
    description:
      "I'm the one making the move and want to know exactly what I need to bridge myself.",
    icon: GraduationCap,
    gradient: "bg-gradient-violet",
    benefits: [
      "Student-focused assessment",
      "Skill gap analysis",
      "Personalized learning roadmap",
    ],
    estimatedTime: "8 min",
    accentRing: "border-violet",
  },
];

const TRUST_BADGES = [
  { icon: Sparkles, label: "AI Personalized" },
  { icon: Clock, label: "8–10 Minutes" },
  { icon: Lock, label: "Private & Secure" },
  { icon: FileText, label: "Free Readiness Report" },
];

interface PersonaSelectionProps {
  onContinue: (persona: Persona) => void;
}

const PersonaSelection = ({ onContinue }: PersonaSelectionProps) => {
  const [selected, setSelected] = useState<Persona | null>(null);

  return (
    <div className="mx-auto max-w-5xl animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <div className="mb-10 flex flex-wrap items-center justify-center gap-2.5">
        {TRUST_BADGES.map(({ icon: BadgeIcon, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/80 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-soft backdrop-blur-sm sm:text-sm"
          >
            <BadgeIcon className="h-3.5 w-3.5 text-secondary" />
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8">
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
                "group relative cursor-pointer select-none overflow-hidden rounded-2xl border-2 bg-card p-8 text-center transition-all duration-300 ease-smooth",
                "hover:-translate-y-2 hover:shadow-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected
                  ? cn("-translate-y-2 shadow-strong", persona.accentRing)
                  : "border-border shadow-soft"
              )}
            >
              {/* soft decorative glow */}
              <div
                className={cn(
                  "pointer-events-none absolute -top-10 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full opacity-20 blur-3xl transition-opacity duration-300 group-hover:opacity-30",
                  persona.gradient
                )}
              />

              {isSelected && (
                <span className="absolute right-4 top-4 flex h-7 w-7 animate-in zoom-in-50 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-medium duration-300">
                  <Check className="h-4 w-4" />
                </span>
              )}

              <div className="relative">
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
                <p className="mb-6 text-base leading-relaxed text-muted-foreground">
                  {persona.description}
                </p>

                <ul className="mb-6 space-y-2.5 border-t border-border pt-5 text-left">
                  {persona.benefits.map((benefit) => (
                    <li
                      key={benefit}
                      className="flex items-center gap-2.5 text-sm text-foreground"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                        <Check className="h-3 w-3" />
                      </span>
                      {benefit}
                    </li>
                  ))}
                </ul>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3.5 py-1 text-xs font-medium text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Estimated time: {persona.estimatedTime}
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-10 flex flex-col items-center gap-3">
        <Button
          size="lg"
          disabled={!selected}
          onClick={() => selected && onContinue(selected)}
          className="group gap-2 bg-gradient-cta px-10 text-base shadow-medium transition-all duration-300 hover:shadow-strong hover:brightness-105 disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none"
        >
          Continue
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Button>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          Your information is safe and secure
        </p>
      </div>
    </div>
  );
};

export default PersonaSelection;
