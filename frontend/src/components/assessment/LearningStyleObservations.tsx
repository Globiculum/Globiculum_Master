import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// Updated behavior-based learning style observations (merged overlapping options)
export const learningStyleOptions = [
  { 
    id: "structured-repetition", 
    label: "Prefers structured learning with repetition and practice",
    description: "Thrives with clear schedules, routines, and repeated practice of concepts"
  },
  { 
    id: "exploration-discussion", 
    label: "Learns best through exploration and discussion",
    description: "Enjoys discovering ideas through conversation and open-ended inquiry"
  },
  { 
    id: "visual-demonstrations", 
    label: "Learns visually through diagrams and demonstrations",
    description: "Understands better with charts, videos, diagrams, and visual aids"
  },
  { 
    id: "problem-solving-application", 
    label: "Learns through problem-solving and application",
    description: "Likes working through real challenges and applying concepts hands-on"
  },
];

interface LearningStyleObservationsProps {
  selectedStyles: string[];
  onToggle: (styleId: string) => void;
}

export function LearningStyleObservations({ selectedStyles, onToggle }: LearningStyleObservationsProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium">Preferred Learning Style</Label>
        <p className="text-sm text-muted-foreground mt-1">
          Select all that apply — this helps personalize recommendations.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {learningStyleOptions.map((style) => (
          <div
            key={style.id}
            className={`flex items-start space-x-3 rounded-2xl border-2 p-4 transition-all duration-200 ease-smooth cursor-pointer hover:-translate-y-0.5 hover:shadow-medium ${
              selectedStyles.includes(style.id)
                ? "border-secondary bg-secondary/5 shadow-soft"
                : "border-border bg-card hover:border-secondary/40"
            }`}
            onClick={() => onToggle(style.id)}
          >
            <Checkbox
              id={`style-${style.id}`}
              checked={selectedStyles.includes(style.id)}
              onCheckedChange={() => onToggle(style.id)}
              className="mt-1"
            />
            <div className="flex-1">
              <Label htmlFor={`style-${style.id}`} className="font-medium cursor-pointer">
                {style.label}
              </Label>
              <p className="text-xs text-muted-foreground mt-1">{style.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
