import { Label } from "@/components/ui/label";

// Realistic study time patterns
export const studyTimeOptions = [
  { 
    value: "30-45-school", 
    label: "~30–45 mins on school days",
    description: "Light daily practice alongside homework"
  },
  { 
    value: "1-2-school", 
    label: "1–2 hours on school days",
    description: "Moderate daily study commitment"
  },
  { 
    value: "4-5-weekly", 
    label: "~4–5 hours per week",
    description: "Flexible weekly schedule"
  },
  { 
    value: "mostly-weekends", 
    label: "Mostly weekends",
    description: "Concentrated weekend sessions"
  },
  { 
    value: "varies", 
    label: "Varies week to week",
    description: "Schedule changes based on activities"
  },
];

interface StudyTimePatternsProps {
  selectedTime: string;
  onChange: (value: string) => void;
}

export function StudyTimePatterns({ selectedTime, onChange }: StudyTimePatternsProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium">Available Study Time</Label>
        <p className="text-sm text-muted-foreground mt-1">
          How much time can your child realistically spend outside school?
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-2">
        {studyTimeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all text-left ${
              selectedTime === option.value
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-primary/50"
            }`}
          >
            <div className="flex-1">
              <div className="font-medium">{option.label}</div>
              <div className="text-sm text-muted-foreground">{option.description}</div>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              selectedTime === option.value
                ? "border-primary bg-primary"
                : "border-muted-foreground"
            }`}>
              {selectedTime === option.value && (
                <div className="w-2 h-2 rounded-full bg-primary-foreground" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
