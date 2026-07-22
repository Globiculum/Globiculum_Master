import { BarChart3, TrendingUp, User } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import OptionCard from "../shared/OptionCard";
import SectionContainer from "../shared/SectionContainer";
import QuestionCard from "../shared/QuestionCard";
import { LearningStyleObservations } from "../LearningStyleObservations";
import type { ParentStepProps } from "./types";

// Step 3: Learning Profile.

const OVERALL_PERFORMANCE_OPTIONS = [
  { value: "excelling", label: "Excelling" },
  { value: "above-average", label: "Above Average" },
  { value: "on-track", label: "On Track" },
  { value: "needs-support", label: "Needs Support" },
];

const ParentStep3 = ({ formData, onFieldChange, onArrayToggle }: ParentStepProps) => {
  const selectedSubjectOptions = formData.academicPath.length > 0 ? formData.academicPath : [];

  const boardSubjects = (() => {
    const targetGoal = formData.targetGoal?.toLowerCase() || "";
    let subjects: string[] = [];

    if (targetGoal.includes("icse") || targetGoal.includes("isc")) {
      subjects = ["Mathematics", "Physics / Chemistry / Biology", "English", "Second Language (Hindi / Regional)", "History / Civics / Geography"];
    } else if (targetGoal === "ib" || targetGoal.includes("international")) {
      subjects = ["Mathematics", "Sciences", "Language and Literature", "Language Acquisition", "Individuals and Societies"];
    } else if (targetGoal.includes("igcse") || targetGoal.includes("cambridge")) {
      subjects = ["Mathematics", "Coordinated Science / Separate Sciences", "English Language", "Humanities / Global Perspectives", "Foreign Language"];
    } else {
      subjects = ["Mathematics", "Science", "English", "Hindi / Second Language", "Social Science"];
    }

    return [...subjects, "Exam Writing", "Revision Methods", "NCERT Practice", "Study habits for Indian curriculum"].filter(
      (v, i, a) => a.indexOf(v) === i
    );
  })();

  return (
    <SectionContainer variant="card" icon={User} title="Learning Profile" description="Help us understand your child's learning profile.">
      <div className="space-y-6">
        <QuestionCard label="How does your child learn best?" required>
          <LearningStyleObservations selectedStyles={formData.learningStyles} onToggle={(styleId) => onArrayToggle("learningStyles", styleId)} />
        </QuestionCard>

        <QuestionCard label="Typical Grade Range" htmlFor="previous-grades">
          <Select value={formData.previousGrades} onValueChange={(value) => onFieldChange("previousGrades", value)}>
            <SelectTrigger id="previous-grades">
              <SelectValue placeholder="Typical grade range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="excellent">Excellent (A/90%+)</SelectItem>
              <SelectItem value="good">Good (B+/80-89%)</SelectItem>
              <SelectItem value="average">Average (B/70-79%)</SelectItem>
              <SelectItem value="below-average">Below Average (C+/60-69%)</SelectItem>
              <SelectItem value="struggling">Struggling (&lt;60%)</SelectItem>
            </SelectContent>
          </Select>
        </QuestionCard>

        <QuestionCard label="Overall Performance" required>
          <div role="radiogroup" aria-label="Overall Performance" className="flex flex-wrap gap-2">
            {OVERALL_PERFORMANCE_OPTIONS.map((opt) => (
              <OptionCard
                key={opt.value}
                variant="pill"
                mode="radio"
                selected={formData.overallPerformance === opt.value}
                onClick={() => onFieldChange("overallPerformance", opt.value)}
              >
                {opt.label}
              </OptionCard>
            ))}
          </div>
        </QuestionCard>
      </div>

      <QuestionCard
        label={
          selectedSubjectOptions.length > 0
            ? "Which of the subjects you selected is the student's strongest?"
            : "Strongest Subjects (select subjects in Academic Path first)"
        }
      >
        {selectedSubjectOptions.length > 0 ? (
          <div role="group" aria-label="Strongest Subjects" className="flex flex-wrap gap-2">
            {selectedSubjectOptions.map((subject) => (
              <OptionCard
                key={`strong-${subject}`}
                variant="pill"
                selected={formData.strongestSubjects.includes(subject)}
                onClick={() => onArrayToggle("strongestSubjects", subject)}
              >
                {subject}
              </OptionCard>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">Please select subjects in the Academic Path step to populate this list.</p>
        )}
      </QuestionCard>

      <QuestionCard
        label={
          selectedSubjectOptions.length > 0
            ? "Which subject is currently most challenging for the student?"
            : "Most Challenging Subjects (select subjects in Academic Path first)"
        }
      >
        {selectedSubjectOptions.length > 0 ? (
          <div role="group" aria-label="Most Challenging Subjects" className="flex flex-wrap gap-2">
            {selectedSubjectOptions.map((subject) => (
              <OptionCard
                key={`challenge-${subject}`}
                variant="pill"
                selected={formData.challengingSubjects.includes(subject)}
                onClick={() => onArrayToggle("challengingSubjects", subject)}
              >
                {subject}
              </OptionCard>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">Please select subjects in the Academic Path step to populate this list.</p>
        )}
      </QuestionCard>

      <SectionContainer
        icon={BarChart3}
        title="Strengthen for Indian Schooling"
        description="Which subjects would you most like the student to strengthen? Select all that apply — helps identify priority transition goals."
      >
        <div role="group" aria-label="Subjects to strengthen" className="flex flex-wrap gap-2">
          {boardSubjects.map((goal) => (
            <OptionCard key={goal} variant="pill" selected={formData.strengthenGoals.includes(goal)} onClick={() => onArrayToggle("strengthenGoals", goal)}>
              {goal === "Exam Writing" || goal === "Revision Methods" || goal === "NCERT Practice" ? (
                <span className="inline-flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {goal}
                </span>
              ) : (
                goal
              )}
            </OptionCard>
          ))}
        </div>
      </SectionContainer>
    </SectionContainer>
  );
};

export default ParentStep3;
