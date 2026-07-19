import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-foreground mb-2">Educational Assessment</h3>
        <p className="text-muted-foreground">Help us understand your child's learning profile</p>
      </div>

      <LearningStyleObservations selectedStyles={formData.learningStyles} onToggle={(styleId) => onArrayToggle("learningStyles", styleId)} />

      <StudyTimePatterns selectedTime={formData.studyTime} onChange={(value) => onFieldChange("studyTime", value)} />

      <div className="space-y-4">
        <div>
          <Label htmlFor="previous-grades">Overall Academic Performance</Label>
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
        </div>
      </div>

      {/* Strongest Subjects - Dynamic based on selected subjects */}
      <div className="space-y-4">
        <Label className="text-base font-medium">
          {selectedSubjectOptions.length > 0 ? "Which of the subjects you selected is the student's strongest?" : "Strongest Subjects (select subjects in Step 3 first)"}
        </Label>
        {selectedSubjectOptions.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {selectedSubjectOptions.map((subject) => (
              <div key={subject} className="flex items-center space-x-2">
                <Checkbox id={`strong-${subject}`} checked={formData.strongestSubjects.includes(subject)} onCheckedChange={() => onArrayToggle("strongestSubjects", subject)} />
                <Label htmlFor={`strong-${subject}`} className="text-sm cursor-pointer">
                  {subject}
                </Label>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">Please select subjects in the Academic Path step to populate this list.</p>
        )}
      </div>

      {/* Most Challenging Subjects - Dynamic */}
      <div className="space-y-4">
        <Label className="text-base font-medium">
          {selectedSubjectOptions.length > 0 ? "Which subject is currently most challenging for the student?" : "Most Challenging Subjects (select subjects in Step 3 first)"}
        </Label>
        {selectedSubjectOptions.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {selectedSubjectOptions.map((subject) => (
              <div key={subject} className="flex items-center space-x-2">
                <Checkbox id={`challenge-${subject}`} checked={formData.challengingSubjects.includes(subject)} onCheckedChange={() => onArrayToggle("challengingSubjects", subject)} />
                <Label htmlFor={`challenge-${subject}`} className="text-sm cursor-pointer">
                  {subject}
                </Label>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">Please select subjects in the Academic Path step to populate this list.</p>
        )}
      </div>

      {/* Skills to strengthen for Indian schooling (board-aware) */}
      <div className="space-y-4">
        <Label className="text-base font-medium">Which subjects would you most like the student to strengthen for Indian schooling?</Label>
        <p className="text-sm text-muted-foreground">Select all that apply — helps identify priority transition goals.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {boardSubjects.map((goal) => (
            <div key={goal} className="flex items-center space-x-2">
              <Checkbox id={`strengthen-${goal}`} checked={formData.strengthenGoals.includes(goal)} onCheckedChange={() => onArrayToggle("strengthenGoals", goal)} />
              <Label htmlFor={`strengthen-${goal}`} className="text-sm cursor-pointer">
                {goal}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ParentStep3;
