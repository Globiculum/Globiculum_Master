import { Textarea } from "@/components/ui/textarea";
import { Target } from "lucide-react";
import type { StudentStepProps } from "./types";
import SectionCard from "../ui/SectionCard";
import QuestionCard from "../ui/QuestionCard";
import InputCard from "../ui/InputCard";

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
    <SectionCard icon={Target} title="Goals & Challenges" description="Let's map out what you're working towards.">
      <QuestionCard label="Target Curriculum / Goal" required error={errors.targetGoal}>
        <div role="radiogroup" aria-label="Target Curriculum / Goal" className="grid grid-cols-1 gap-3">
          {TARGET_GOALS.map((g) => (
            <InputCard
              key={g.value}
              variant="large"
              mode="radio"
              label={g.label}
              selected={formData.targetGoal === g.value}
              onClick={() => setField("targetGoal", g.value)}
            />
          ))}
        </div>
      </QuestionCard>

      <QuestionCard label="Preparation Timeline" required error={errors.timeline}>
        <div role="radiogroup" aria-label="Preparation Timeline" className="flex flex-wrap gap-2">
          {TIMELINES.map((t) => (
            <InputCard
              key={t.value}
              mode="radio"
              label={t.label}
              selected={formData.timeline === t.value}
              onClick={() => setField("timeline", t.value)}
            />
          ))}
        </div>
      </QuestionCard>

      <QuestionCard label="Transition Challenges" hint="What worries you most about the move?">
        <div role="group" aria-label="Transition Challenges" className="flex flex-wrap gap-2">
          {TRANSITION_CONCERNS.map((concern) => (
            <InputCard
              key={concern}
              mode="checkbox"
              label={concern}
              selected={formData.transitionConcerns.includes(concern)}
              onClick={() => toggleArrayField("transitionConcerns", concern)}
            />
          ))}
        </div>
      </QuestionCard>

      <QuestionCard label="Support Needed">
        <div role="group" aria-label="Support Needed" className="flex flex-wrap gap-2">
          {SUPPORT_NEEDS.map((need) => (
            <InputCard
              key={need}
              mode="checkbox"
              label={need}
              selected={formData.supportNeeds.includes(need)}
              onClick={() => toggleArrayField("supportNeeds", need)}
            />
          ))}
        </div>
      </QuestionCard>

      <QuestionCard
        label="Extra Notes"
        htmlFor="additional-notes"
        hint="Optional — frontend-only for now, not yet sent to the report generator."
      >
        <Textarea
          id="additional-notes"
          rows={4}
          value={formData.additionalNotes}
          onChange={(e) => setField("additionalNotes", e.target.value)}
        />
      </QuestionCard>
    </SectionCard>
  );
};

export default GoalsChallengesStep;
