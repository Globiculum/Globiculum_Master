import { Label } from "@/components/ui/label";

// Elementary foundational learning areas with confidence levels
export const foundationalAreas = [
  { 
    id: "reading", 
    label: "Reading & Comprehension",
    description: "Understanding texts, vocabulary, and comprehension skills"
  },
  { 
    id: "writing", 
    label: "Writing & Expression",
    description: "Writing sentences, paragraphs, and creative expression"
  },
  { 
    id: "math", 
    label: "Foundational Math",
    description: "Number sense, basic operations, and problem-solving"
  },
];

export const confidenceLevels = [
  { value: "emerging", label: "Emerging", description: "Just beginning to develop this skill" },
  { value: "developing", label: "Developing", description: "Making progress but needs support" },
  { value: "confident", label: "Confident", description: "Demonstrates strong understanding" },
];

interface ElementaryFoundationsProps {
  confidences: Record<string, string>;
  onChange: (area: string, level: string) => void;
}

export function ElementaryFoundations({ confidences, onChange }: ElementaryFoundationsProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h4 className="font-semibold text-lg mb-2">Foundational Learning Areas</h4>
        <p className="text-sm text-muted-foreground">
          Rate your child's confidence in each foundational area
        </p>
      </div>
      
      <div className="space-y-6">
        {foundationalAreas.map((area) => (
          <div key={area.id} className="space-y-3 p-4 rounded-lg border border-border bg-card/50">
            <div>
              <Label className="font-medium text-base">{area.label}</Label>
              <p className="text-sm text-muted-foreground">{area.description}</p>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {confidenceLevels.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => onChange(area.id, level.value)}
                  className={`p-3 rounded-lg border-2 transition-all text-center ${
                    confidences[area.id] === level.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <div className="font-medium text-sm">{level.label}</div>
                  <div className="text-xs text-muted-foreground mt-1 hidden md:block">
                    {level.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
