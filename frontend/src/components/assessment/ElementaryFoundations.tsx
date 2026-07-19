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

      <div className="space-y-4">
        {foundationalAreas.map((area) => (
          <div key={area.id} className="space-y-3 rounded-2xl border border-border bg-card/50 p-4 shadow-soft">
            <div>
              <Label className="font-medium text-base">{area.label}</Label>
              <p className="text-sm text-muted-foreground">{area.description}</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {confidenceLevels.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  role="radio"
                  aria-checked={confidences[area.id] === level.value}
                  onClick={() => onChange(area.id, level.value)}
                  className={`rounded-xl border-2 p-3 text-center transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    confidences[area.id] === level.value
                      ? "border-secondary bg-secondary/5 text-secondary shadow-soft"
                      : "border-border bg-card hover:border-secondary/40"
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
