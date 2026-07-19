import { Input } from "@/components/ui/input";
import { Brain } from "lucide-react";
import type { StudentStepProps } from "./types";
import SectionCard from "../ui/SectionCard";
import QuestionCard from "../ui/QuestionCard";
import InputCard from "../ui/InputCard";

// Step 3: Learning Profile — learning style, study time, per-subject confidence.

const LEARNING_STYLES = [
  { value: "structured-repetition", label: "Structured repetition" },
  { value: "exploration-discussion", label: "Exploration & discussion" },
  { value: "visual-demonstrations", label: "Visual demonstrations" },
  { value: "problem-solving-application", label: "Problem-solving / application" },
];

const STUDY_TIME_OPTIONS = [
  { value: "under-2", label: "Under 2 hours/week" },
  { value: "2-5", label: "2-5 hours/week" },
  { value: "5-10", label: "5-10 hours/week" },
  { value: "10-plus", label: "10+ hours/week" },
];

const CONFIDENCE_LEVELS = [
  { value: "strong", label: "Strong" },
  { value: "moderate", label: "Moderate" },
  { value: "needs-support", label: "Needs support" },
];

const LearningProfileStep = ({ formData, setField, toggleArrayField, setRecordField, errors }: StudentStepProps) => {
  return (
    <SectionCard icon={Brain} title="Learning Profile" description="Tell us how you learn best.">
      <QuestionCard label="Learning Style" required error={errors.learningStyles}>
        <div role="group" aria-label="Learning Style" className="flex flex-wrap gap-2">
          {LEARNING_STYLES.map((style) => (
            <InputCard
              key={style.value}
              mode="checkbox"
              label={style.label}
              selected={formData.learningStyles.includes(style.value)}
              onClick={() => toggleArrayField("learningStyles", style.value)}
            />
          ))}
        </div>
      </QuestionCard>

      <QuestionCard label="Realistic Weekly Study Time" required error={errors.studyTime}>
        <div role="radiogroup" aria-label="Weekly Study Time" className="flex flex-wrap gap-2">
          {STUDY_TIME_OPTIONS.map((opt) => (
            <InputCard
              key={opt.value}
              mode="radio"
              label={opt.label}
              selected={formData.studyTime === opt.value}
              onClick={() => setField("studyTime", opt.value)}
            />
          ))}
        </div>
      </QuestionCard>

      <QuestionCard label="Previous Grades / Performance" htmlFor="previous-grades" hint="Optional">
        <Input
          id="previous-grades"
          placeholder="e.g. A- average, top 20% of class"
          value={formData.previousGrades}
          onChange={(e) => setField("previousGrades", e.target.value)}
        />
      </QuestionCard>

      {formData.academicPath.length > 0 && (
        <QuestionCard label="Subject Confidence">
          <div className="space-y-3">
            {formData.academicPath.map((subject) => (
              <div
                key={subject}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 p-3"
              >
                <span className="text-sm font-medium text-foreground">{subject}</span>
                <div role="radiogroup" aria-label={`${subject} confidence`} className="flex gap-1.5">
                  {CONFIDENCE_LEVELS.map((level) => (
                    <InputCard
                      key={level.value}
                      mode="radio"
                      label={level.label}
                      selected={formData.subjectConfidences[subject] === level.value}
                      onClick={() => setRecordField("subjectConfidences", subject, level.value)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </QuestionCard>
      )}

      <QuestionCard label="Strongest Subjects">
        {formData.academicPath.length === 0 ? (
          <p className="text-sm text-muted-foreground">Select subjects in Academic Profile first.</p>
        ) : (
          <div role="group" aria-label="Strongest Subjects" className="flex flex-wrap gap-2">
            {formData.academicPath.map((subject) => (
              <InputCard
                key={`strong-${subject}`}
                mode="checkbox"
                label={subject}
                selected={formData.strongestSubjects.includes(subject)}
                onClick={() => toggleArrayField("strongestSubjects", subject)}
              />
            ))}
          </div>
        )}
      </QuestionCard>

      <QuestionCard label="Challenging Subjects">
        {formData.academicPath.length === 0 ? (
          <p className="text-sm text-muted-foreground">Select subjects in Academic Profile first.</p>
        ) : (
          <div role="group" aria-label="Challenging Subjects" className="flex flex-wrap gap-2">
            {formData.academicPath.map((subject) => (
              <InputCard
                key={`challenge-${subject}`}
                mode="checkbox"
                label={subject}
                selected={formData.challengingSubjects.includes(subject)}
                onClick={() => toggleArrayField("challengingSubjects", subject)}
              />
            ))}
          </div>
        )}
      </QuestionCard>
    </SectionCard>
  );
};

export default LearningProfileStep;
