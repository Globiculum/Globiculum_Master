import { BarChart3, User } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import OptionCard from "../shared/OptionCard";
import SectionContainer from "../shared/SectionContainer";
import QuestionCard from "../shared/QuestionCard";
import { LearningStyleObservations } from "../LearningStyleObservations";
import { StudyTimePatterns } from "../StudyTimePatterns";
import type { ParentStepProps } from "./types";

// Step 3: Learning Profile.
// Ported verbatim from AssessmentForm.tsx's renderEducationalAssessment()
// (originally Step 3 of 4), minus the Transition Concerns / Support Needs
// sections, which this sprint's brief moves to Step 4 "Concerns & Support".

const ParentStep3 = ({ formData, onFieldChange, onArrayToggle }: ParentStepProps) => {
  const selectedSubjectOptions = formData.academicPath.length > 0 ? formData.academicPath : [];

  const boardSubjects = (() => {
    const targetGoal = formData.targetGoal?.toLowerCase() || "";
    let subjects: string[] = [];

    if (targetGoal.includes("icse") || targetGoal.includes("isc")) {
      subjects = ["Mathematics", "Physics / Chemistry / Biology", "English", "Second Language (Hindi / Regional)", "History / Civics / Geography"];
    } else if (targetGoal.includes("ib") || targetGoal.includes("international")) {
      subjects = ["Mathematics", "Sciences", "Language and Literature", "Language Acquisition", "Individuals and Societies"];
    } else if (targetGoal.includes("igcse") || targetGoal.includes("cambridge")) {
      subjects = ["Mathematics", "Coordinated Science / Separate Sciences", "English Language", "Humanities / Global Perspectives", "Foreign Language"];
    } else {
      subjects = ["Mathematics", "Science", "English", "Hindi / Second Language", "Social Science"];
    }

    return [...subjects, "Study habits for Indian curriculum"].filter((v, i, a) => a.indexOf(v) === i);
  })();

  return (
    <div className="space-y-10">
      <SectionContainer icon={User} title="Educational Assessment" description="Help us understand your child's learning profile">
        <LearningStyleObservations selectedStyles={formData.learningStyles} onToggle={(styleId) => onArrayToggle("learningStyles", styleId)} />

        <StudyTimePatterns selectedTime={formData.studyTime} onChange={(value) => onFieldChange("studyTime", value)} />

        <QuestionCard label="Overall Academic Performance" htmlFor="previous-grades">
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
      </SectionContainer>

      <QuestionCard
        label={
          selectedSubjectOptions.length > 0
            ? "Which of the subjects you selected is the student's strongest?"
            : "Strongest Subjects (select subjects in Step 3 first)"
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
            : "Most Challenging Subjects (select subjects in Step 3 first)"
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
              {goal}
            </OptionCard>
          ))}
        </div>
      </SectionContainer>
    </div>
  );
};

export default ParentStep3;
