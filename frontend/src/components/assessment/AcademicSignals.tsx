import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// Academic signals (reframed electives) for High School
export const academicSignalOptions = [
  { id: "robotics", label: "Robotics" },
  { id: "engineering", label: "Engineering" },
  { id: "computer-science", label: "Computer Science" },
  { id: "economics", label: "Economics" },
  { id: "psychology", label: "Psychology" },
  { id: "research", label: "Research / Independent Study" },
  { id: "debate", label: "Debate & Model UN" },
  { id: "journalism", label: "Journalism / Publications" },
];

interface AcademicSignalsProps {
  selectedSignals: string[];
  onToggle: (signalId: string) => void;
}

export function AcademicSignals({ selectedSignals, onToggle }: AcademicSignalsProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium">Academic Signals (Optional)</Label>
        <p className="text-sm text-muted-foreground mt-1">
          These help us understand academic rigor and readiness for Indian curriculum depth.
        </p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {academicSignalOptions.map((signal) => (
          <div
            key={signal.id}
            className={`flex items-center space-x-2 rounded-xl border-2 p-3 transition-all duration-200 ease-smooth cursor-pointer hover:-translate-y-0.5 hover:shadow-soft ${
              selectedSignals.includes(signal.id)
                ? "border-secondary bg-secondary/5 shadow-soft"
                : "border-border bg-card hover:border-secondary/40"
            }`}
            onClick={() => onToggle(signal.id)}
          >
            <Checkbox
              id={`signal-${signal.id}`}
              checked={selectedSignals.includes(signal.id)}
              onCheckedChange={() => onToggle(signal.id)}
            />
            <Label htmlFor={`signal-${signal.id}`} className="text-sm cursor-pointer">
              {signal.label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
