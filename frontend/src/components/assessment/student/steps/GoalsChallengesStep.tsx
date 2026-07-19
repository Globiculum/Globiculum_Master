import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StepFieldError, type StudentStepProps } from "./types";

// Step 4: Goals & Challenges.
// `additionalNotes` is a frontend-only placeholder field (see shared/types.ts)
// — it is captured in state but not currently sent to the backend, per the
// "frontend placeholders only" rule for fields the backend doesn't accept yet.

const TARGET_GOALS = [
  { value: "india-cbse", label: "Prepare for Indian CBSE Schools" },
  { value: "india-igcse", label: "Prepare for Indian IGCSE Schools" },
  { value: "india-ib", label: "Prepare for Indian IB Schools" },
];

const TIMELINES = [
  { value: "3months", label: "3 months" },
  { value: "6months", label: "6 months" },
  { value: "1year", label: "1 year" },
  { value: "2years", label: "2+ years" },
];

const TRANSITION_CONCERNS = [
  "Keeping up academically",
  "Language barrier",
  "Making friends / social adjustment",
  "Different teaching style",
  "Exam pressure",
];

const SUPPORT_NEEDS = ["Tutoring", "Counseling", "Peer mentoring", "Parent guidance", "Study materials"];

const GoalsChallengesStep = ({ formData, setField, toggleArrayField, errors }: StudentStepProps) => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Goals & Challenges</h2>

      <div>
        <Label htmlFor="target-goal">Target Curriculum / Goal</Label>
        <Select value={formData.targetGoal} onValueChange={(value) => setField("targetGoal", value)}>
          <SelectTrigger id="target-goal">
            <SelectValue placeholder="Which school system are you preparing for?" />
          </SelectTrigger>
          <SelectContent>
            {TARGET_GOALS.map((g) => (
              <SelectItem key={g.value} value={g.value}>
                {g.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <StepFieldError errors={errors} field="targetGoal" />
      </div>

      <div>
        <Label htmlFor="timeline">Preparation Timeline</Label>
        <Select value={formData.timeline} onValueChange={(value) => setField("timeline", value)}>
          <SelectTrigger id="timeline">
            <SelectValue placeholder="When do you need to be ready?" />
          </SelectTrigger>
          <SelectContent>
            {TIMELINES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <StepFieldError errors={errors} field="timeline" />
      </div>

      <div>
        <Label>Transition Challenges</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {TRANSITION_CONCERNS.map((concern) => (
            <label key={concern} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={formData.transitionConcerns.includes(concern)}
                onCheckedChange={() => toggleArrayField("transitionConcerns", concern)}
              />
              {concern}
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label>Support Needed</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {SUPPORT_NEEDS.map((need) => (
            <label key={need} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={formData.supportNeeds.includes(need)}
                onCheckedChange={() => toggleArrayField("supportNeeds", need)}
              />
              {need}
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="additional-notes">Extra Notes (optional)</Label>
        <p className="text-xs text-muted-foreground mb-1">
          Frontend-only for now — not yet sent to the report generator.
        </p>
        <Textarea
          id="additional-notes"
          rows={4}
          value={formData.additionalNotes}
          onChange={(e) => setField("additionalNotes", e.target.value)}
        />
      </div>
    </div>
  );
};

export default GoalsChallengesStep;
