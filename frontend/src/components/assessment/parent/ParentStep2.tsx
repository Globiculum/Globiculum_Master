import { BookOpen, Languages } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import OptionCard from "../shared/OptionCard";
import MultiSelect from "../shared/MultiSelect";
import SectionContainer from "../shared/SectionContainer";
import QuestionCard from "../shared/QuestionCard";
import { HighSchoolMathDeepDive } from "../HighSchoolMathDeepDive";
import type { ParentStepProps } from "./types";

// Step 2: Academic Path — current subjects, per-subject confidence, AP
// courses + math track (High School only), language exposure for Indian
// schooling, foreign language details, extracurriculars (Middle & High).

const INDIAN_LANGUAGES = ["Hindi", "Sanskrit", "Tamil", "Telugu", "Kannada", "Malayalam", "Marathi", "Gujarati", "Bengali"];
const EXTRACURRICULARS = [
  "Sports & Athletics", "Music & Arts", "Debate & Public Speaking", "Science Olympiad",
  "Math Competitions", "Robotics & Coding", "Community Service", "Cultural Activities",
];
const AP_SUBJECTS = [
  "AP (Advanced Placement) Calculus", "AP (Advanced Placement) Physics", "AP (Advanced Placement) Chemistry",
  "AP (Advanced Placement) Biology", "AP (Advanced Placement) Computer Science Principles",
  "AP (Advanced Placement) English", "AP (Advanced Placement) US History",
];

// Grades 11-12 see one unified higher-secondary subject list instead of the
// curriculum-based list below — same academicPath array field either way.
const HIGHER_SECONDARY_GRADES = [11, 12];

const HIGHER_SECONDARY_SUBJECTS = [
  "Physics", "Chemistry", "Biology", "Mathematics", "Computer Science",
  "Accountancy", "Economics", "Business Studies", "English",
  "History", "Political Science", "Geography", "Psychology", "Sociology",
];

const OTHER_SUBJECT = "Other";

const getSubjectsByGradeBand = (schoolStage: string, currentCurriculum: string, gradeNumber: number) => {
  if (schoolStage === "elementary" && (gradeNumber === 1 || gradeNumber === 2)) {
    return ["Reading & Comprehension", "Foundational Math", "Writing Skills", "General Awareness / Environmental Learning"];
  }
  if (schoolStage === "elementary") {
    return ["Mathematics", "English / Language Arts", "Basic Science", "Social Studies", "Foreign Language"];
  }

  const cur = (currentCurriculum || "").toLowerCase();

  if (cur.includes("ib")) {
    return ["Mathematics", "Sciences", "Language and Literature", "Language Acquisition", "Individuals and Societies"];
  }
  if (cur.includes("cambridge") || cur.includes("igcse") || cur.includes("a-levels")) {
    return ["Mathematics", "Sciences", "English Language", "Humanities", "Foreign Language"];
  }
  if (schoolStage === "high") {
    return [
      "Algebra", "Geometry", "Pre-Calculus / Calculus", "Biology", "Chemistry", "Physics",
      "English / Language Arts", "Social Studies / US History", "Foreign Language", "Elective (Art/Music/CS/Other)",
    ];
  }

  return ["Mathematics", "Science", "English / Language Arts", "Social Studies", "Foreign Language", "Elective (Art/Music/Technology)"];
};

const ParentStep2 = ({ formData, onFieldChange, onArrayToggle, onRecordFieldChange, fieldErrors }: ParentStepProps) => {
  const gradeNumber = parseInt(formData.snapshotGrade, 10);
  const isEarlyElementary = formData.schoolStage === "elementary" && (gradeNumber === 1 || gradeNumber === 2);
  const subjectQuestion = isEarlyElementary
    ? "Which areas would you like to strengthen for your child?"
    : "Which subjects does the student currently study in their school curriculum?";
  const subjectHelp = isEarlyElementary
    ? "Select the foundational learning areas you'd like the report to focus on."
    : "Select all subjects the student is currently enrolled in. These reflect the student's CURRENT curriculum.";

  const isHigherSecondary = HIGHER_SECONDARY_GRADES.includes(gradeNumber);
  const subjects = getSubjectsByGradeBand(formData.schoolStage, formData.currentCurriculum, gradeNumber);

  return (
    <SectionContainer variant="card" icon={BookOpen} title="Academic Path" description="Tell us what the student studies today.">
      <SectionContainer
        title="Current Academic Path"
        description={isEarlyElementary ? "Help us understand your child's foundational learning" : undefined}
      >
        <QuestionCard
          label={subjectQuestion}
          hint={isHigherSecondary ? "Suggested for Grade 11-12" : subjectHelp}
          required
          error={fieldErrors.academicPath}
        >
          {isHigherSecondary ? (
            <div role="group" aria-label={subjectQuestion} className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {HIGHER_SECONDARY_SUBJECTS.map((subject) => (
                <OptionCard key={subject} variant="block" selected={formData.academicPath.includes(subject)} onClick={() => onArrayToggle("academicPath", subject)}>
                  {subject}
                </OptionCard>
              ))}
              <OptionCard variant="block" selected={formData.academicPath.includes(OTHER_SUBJECT)} onClick={() => onArrayToggle("academicPath", OTHER_SUBJECT)}>
                {OTHER_SUBJECT}
              </OptionCard>
            </div>
          ) : (
            <div role="group" aria-label={subjectQuestion} className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {subjects.map((subject) => (
                <OptionCard key={subject} variant="block" selected={formData.academicPath.includes(subject)} onClick={() => onArrayToggle("academicPath", subject)}>
                  {subject}
                </OptionCard>
              ))}
              <OptionCard variant="block" selected={formData.academicPath.includes(OTHER_SUBJECT)} onClick={() => onArrayToggle("academicPath", OTHER_SUBJECT)}>
                {OTHER_SUBJECT}
              </OptionCard>
            </div>
          )}

          {formData.academicPath.includes(OTHER_SUBJECT) && (
            <Input
              className="mt-3"
              placeholder="Enter Subject"
              value={formData.otherSubject}
              onChange={(e) => onFieldChange("otherSubject", e.target.value)}
            />
          )}
        </QuestionCard>

        {formData.academicPath.length > 0 && (
          <QuestionCard
            label="How comfortable is the student with each subject?"
            hint="This helps us prioritize gap identification — it does not change the alignment scoring."
          >
            <div className="space-y-2">
              {formData.academicPath.map((subject) => (
                <div key={`conf-${subject}`} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 rounded-xl border border-border bg-card/50 p-3">
                  <span className="text-sm font-medium">{subject}</span>
                  <div role="radiogroup" aria-label={`${subject} confidence`} className="grid grid-cols-3 gap-2 md:flex md:gap-2">
                    {[
                      { value: "strong", label: "Strong" },
                      { value: "moderate", label: "Moderate" },
                      { value: "needs-help", label: "Needs Help" },
                    ].map((opt) => (
                      <OptionCard
                        key={opt.value}
                        variant="compact-pill"
                        mode="radio"
                        selected={formData.subjectConfidences[subject] === opt.value}
                        onClick={() => onRecordFieldChange("subjectConfidences", subject, opt.value)}
                      >
                        {opt.label}
                      </OptionCard>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </QuestionCard>
        )}
      </SectionContainer>

      {formData.schoolStage === "high" && (
        <SectionContainer title="AP Courses & University Prep" description="High School only.">
          <OptionCard variant="block" className="w-full" selected={formData.academicPath.includes("University Entrance Test Prep")} onClick={() => onArrayToggle("academicPath", "University Entrance Test Prep")}>
            University Entrance Test Prep
          </OptionCard>

          <QuestionCard label="AP (Advanced Placement) Subjects">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {AP_SUBJECTS.map((ap) => (
                <OptionCard key={ap} variant="pill" selected={formData.academicPath.includes(ap)} onClick={() => onArrayToggle("academicPath", ap)}>
                  {ap}
                </OptionCard>
              ))}
            </div>
          </QuestionCard>
        </SectionContainer>
      )}

      {formData.schoolStage === "high" &&
        (formData.academicPath.includes("Algebra") || formData.academicPath.includes("Geometry") || formData.academicPath.includes("Pre-Calculus / Calculus")) &&
        formData.previousLocation === "us" &&
        formData.usState && (
          <HighSchoolMathDeepDive
            usState={formData.usState}
            curriculum={formData.currentCurriculum}
            selectedCourse={formData.mathCourse}
            programLevel={formData.mathProgramLevel}
            onCourseChange={(course) => onFieldChange("mathCourse", course)}
            onLevelChange={(level) => onFieldChange("mathProgramLevel", level)}
          />
        )}

      <SectionContainer
        icon={Languages}
        title="Language Exposure for Indian Schooling"
        description="Indian schools typically require Hindi and sometimes a regional or third language."
      >
        <QuestionCard label="Select languages your child has exposure to">
          <div className="flex flex-wrap gap-2">
            {INDIAN_LANGUAGES.map((lang) => (
              <OptionCard key={lang} variant="pill" selected={formData.selectedLanguages.includes(lang)} onClick={() => onArrayToggle("selectedLanguages", lang)}>
                {lang}
              </OptionCard>
            ))}
            <OptionCard variant="pill" selected={formData.selectedLanguages.includes("Other")} onClick={() => onArrayToggle("selectedLanguages", "Other")}>
              Other
            </OptionCard>
          </div>
        </QuestionCard>

        {formData.selectedLanguages.includes("Other") && (
          <QuestionCard label="Type the language" htmlFor="custom-language">
            <Input
              id="custom-language"
              type="text"
              placeholder="Enter language name"
              value={formData.customLanguage}
              onChange={(e) => onFieldChange("customLanguage", e.target.value)}
            />
          </QuestionCard>
        )}

        {formData.selectedLanguages.length > 0 && (
          <QuestionCard label="Proficiency Level for Each Language">
            <div className="space-y-3">
              {formData.selectedLanguages.map((lang) => (
                <div key={lang} className="flex items-center gap-3">
                  <span className="min-w-[100px] text-sm font-medium">{lang}</span>
                  <Select value={formData.languageProficiencies[lang] || ""} onValueChange={(value) => onRecordFieldChange("languageProficiencies", lang, value)}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select proficiency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Exposure</SelectItem>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="fluent">Fluent</SelectItem>
                      <SelectItem value="native">Native</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </QuestionCard>
        )}
      </SectionContainer>

      {formData.academicPath.includes("Foreign Language") && (
        <SectionContainer title="Foreign Language Studied">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <QuestionCard label="Which foreign language is the student studying?" htmlFor="foreign-lang-name">
              <Select value={formData.foreignLanguageName} onValueChange={(value) => onFieldChange("foreignLanguageName", value)}>
                <SelectTrigger id="foreign-lang-name">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spanish">Spanish</SelectItem>
                  <SelectItem value="french">French</SelectItem>
                  <SelectItem value="german">German</SelectItem>
                  <SelectItem value="mandarin">Mandarin</SelectItem>
                  <SelectItem value="japanese">Japanese</SelectItem>
                  <SelectItem value="latin">Latin</SelectItem>
                  <SelectItem value="arabic">Arabic</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {formData.foreignLanguageName === "other" && (
                <Input
                  className="mt-2"
                  type="text"
                  placeholder="Enter language name"
                  value={formData.foreignLanguageNameOther}
                  onChange={(e) => onFieldChange("foreignLanguageNameOther", e.target.value)}
                />
              )}
            </QuestionCard>
            <QuestionCard label="What is the student's current level?" htmlFor="foreign-lang-level">
              <Select value={formData.foreignLanguageLevel} onValueChange={(value) => onFieldChange("foreignLanguageLevel", value)}>
                <SelectTrigger id="foreign-lang-level">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </QuestionCard>
          </div>
        </SectionContainer>
      )}

      {formData.schoolStage !== "elementary" && (
        <QuestionCard label="Current Extracurricular Activities" hint="Optional">
          <MultiSelect
            idPrefix="extra"
            options={EXTRACURRICULARS}
            selected={formData.extracurriculars}
            onToggle={(activity) => onArrayToggle("extracurriculars", activity)}
          />
        </QuestionCard>
      )}
    </SectionContainer>
  );
};

export default ParentStep2;
