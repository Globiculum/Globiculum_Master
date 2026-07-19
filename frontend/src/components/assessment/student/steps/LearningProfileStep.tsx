import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StepFieldError, type StudentStepProps } from "./types";

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
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Learning Profile</h2>

      <div>
        <Label>Learning Style</Label>
        <div className="space-y-2 mt-2">
          {LEARNING_STYLES.map((style) => (
            <label key={style.value} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={formData.learningStyles.includes(style.value)}
                onCheckedChange={() => toggleArrayField("learningStyles", style.value)}
              />
              {style.label}
            </label>
          ))}
        </div>
        <StepFieldError errors={errors} field="learningStyles" />
      </div>

      <div>
        <Label htmlFor="study-time">Realistic Weekly Study Time</Label>
        <Select value={formData.studyTime} onValueChange={(value) => setField("studyTime", value)}>
          <SelectTrigger id="study-time">
            <SelectValue placeholder="Select study time pattern" />
          </SelectTrigger>
          <SelectContent>
            {STUDY_TIME_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <StepFieldError errors={errors} field="studyTime" />
      </div>

      <div>
        <Label htmlFor="previous-grades">Previous Grades / Performance (optional)</Label>
        <Input
          id="previous-grades"
          placeholder="e.g. A- average, top 20% of class"
          value={formData.previousGrades}
          onChange={(e) => setField("previousGrades", e.target.value)}
        />
      </div>

      {formData.academicPath.length > 0 && (
        <div>
          <Label>Subject Confidence</Label>
          <div className="space-y-2 mt-2">
            {formData.academicPath.map((subject) => (
              <div key={subject} className="flex items-center justify-between gap-2 text-sm">
                <span>{subject}</span>
                <div className="flex gap-2">
                  {CONFIDENCE_LEVELS.map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => setRecordField("subjectConfidences", subject, level.value)}
                      className={
                        formData.subjectConfidences[subject] === level.value
                          ? "px-2 py-1 border rounded border-primary text-primary"
                          : "px-2 py-1 border rounded"
                      }
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <Label>Strongest Subjects</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {formData.academicPath.map((subject) => (
            <label key={`strong-${subject}`} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={formData.strongestSubjects.includes(subject)}
                onCheckedChange={() => toggleArrayField("strongestSubjects", subject)}
              />
              {subject}
            </label>
          ))}
          {formData.academicPath.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-2">Select subjects in Academic Profile first.</p>
          )}
        </div>
      </div>

      <div>
        <Label>Challenging Subjects</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {formData.academicPath.map((subject) => (
            <label key={`challenge-${subject}`} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={formData.challengingSubjects.includes(subject)}
                onCheckedChange={() => toggleArrayField("challengingSubjects", subject)}
              />
              {subject}
            </label>
          ))}
          {formData.academicPath.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-2">Select subjects in Academic Profile first.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LearningProfileStep;
