import { Textarea } from "@/components/ui/textarea";
import { Wand2 } from "lucide-react";
import type { StudentStepProps } from "./types";
import SectionCard from "../../shared/SectionCard";
import QuestionCard from "../../shared/QuestionCard";
import InputCard from "../../shared/InputCard";
import VoiceInputButton from "../../shared/VoiceInputButton";

// Step 3: Almost Done — the friendlier, shorter close to the Student journey.
// No study-time/grades/strongest-subjects drilling (that stays Parent-only);
// just learning style, what feels nervy about the move, and optional notes.

const LEARNING_STYLES = [
  { value: "structured-repetition", label: "I like clear steps and practice" },
  { value: "exploration-discussion", label: "I like exploring ideas and talking them through" },
  { value: "visual-demonstrations", label: "I like pictures, diagrams and videos" },
  { value: "problem-solving-application", label: "I like solving problems hands-on" },
];

const NERVOUSNESS_OPTIONS = [
  "New subjects",
  "Different tests",
  "New language",
  "Making friends",
  "Everything feels new",
];

const WrapUpStep = ({ formData, setField, toggleArrayField, errors }: StudentStepProps) => {
  return (
    <SectionCard icon={Wand2} title="Almost Done" description="Just a couple more friendly questions.">
      <QuestionCard
        label="Pick what sounds like you"
        required
        tooltip="This tells us how you learn best so we can tailor recommendations for you."
        error={errors.learningStyles}
      >
        <div role="group" aria-label="Pick what sounds like you" className="grid grid-cols-1 gap-2">
          {LEARNING_STYLES.map((style) => (
            <InputCard
              key={style.value}
              variant="large"
              mode="checkbox"
              label={style.label}
              selected={formData.learningStyles.includes(style.value)}
              onClick={() => toggleArrayField("learningStyles", style.value)}
            />
          ))}
        </div>
      </QuestionCard>

      <QuestionCard
        label="What makes you nervous?"
        tooltip="Let us know what feels most stressful about the move — pick as many as apply."
      >
        <div role="group" aria-label="What makes you nervous?" className="flex flex-wrap gap-2">
          {NERVOUSNESS_OPTIONS.map((option) => (
            <InputCard
              key={option}
              mode="checkbox"
              label={option}
              selected={formData.nervousness.includes(option)}
              onClick={() => toggleArrayField("nervousness", option)}
            />
          ))}
        </div>
      </QuestionCard>

      <QuestionCard
        label="Anything else?"
        htmlFor="additional-notes"
        optional
        tooltip="Share anything else that would help us understand your situation better."
      >
        <div className="relative">
          <Textarea
            id="additional-notes"
            rows={4}
            placeholder="Tell us anything else that would help..."
            value={formData.additionalNotes}
            onChange={(e) => setField("additionalNotes", e.target.value)}
            className="pr-12"
          />
          <VoiceInputButton
            label="Say your answer"
            onResult={(text) => setField("additionalNotes", formData.additionalNotes ? `${formData.additionalNotes} ${text}` : text)}
            className="absolute right-2 top-2"
          />
        </div>
      </QuestionCard>
    </SectionCard>
  );
};

export default WrapUpStep;
