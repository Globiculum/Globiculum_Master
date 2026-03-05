import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// Behavior-based learning style observations
export const learningStyleOptions = [
  { 
    id: "learns-examples", 
    label: "Learns better with examples",
    description: "Grasps concepts when shown real examples"
  },
  { 
    id: "needs-repetition", 
    label: "Needs repetition and practice",
    description: "Benefits from practicing concepts multiple times"
  },
  { 
    id: "enjoys-problem-solving", 
    label: "Enjoys problem-solving",
    description: "Likes working through challenges independently"
  },
  { 
    id: "learns-visually", 
    label: "Learns visually",
    description: "Understands better with diagrams, charts, and videos"
  },
  { 
    id: "needs-structure", 
    label: "Needs structure and routine",
    description: "Thrives with clear schedules and expectations"
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
          Select what you've observed — this helps personalize recommendations.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {learningStyleOptions.map((style) => (
          <div 
            key={style.id}
            className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
              selectedStyles.includes(style.id)
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-primary/50"
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
