import { BookOpen, Languages } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import InputCard from "../shared/InputCard";
import MultiSelect from "../shared/MultiSelect";
import SectionCard from "../shared/SectionCard";
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
    <SectionCard icon={BookOpen} title="Academic Path" description="Tell us what the student studies today.">
      <SectionContainer
        title="Current Academic Path"
        description={isEarlyElementary ? "Help us understand your child's foundational learning" : undefined}
      >
        <QuestionCard
          label={subjectQuestion}
          tooltip={isEarlyElementary ? subjectHelp : `${subjectHelp}${isHigherSecondary ? " Grade 11-12 shows the higher-secondary subject list." : ""}`}
          required
          error={fieldErrors.academicPath}
        >
          {isHigherSecondary ? (
            <div role="group" aria-label={subjectQuestion} className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {HIGHER_SECONDARY_SUBJECTS.map((subject) => (
                <InputCard key={subject} variant="block" label={subject} selected={formData.academicPath.includes(subject)} onClick={() => onArrayToggle("academicPath", subject)} />
              ))}
              <InputCard variant="block" label={OTHER_SUBJECT} selected={formData.academicPath.includes(OTHER_SUBJECT)} onClick={() => onArrayToggle("academicPath", OTHER_SUBJECT)} />
            </div>
          ) : (
            <div role="group" aria-label={subjectQuestion} className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {subjects.map((subject) => (
                <InputCard key={subject} variant="block" label={subject} selected={formData.academicPath.includes(subject)} onClick={() => onArrayToggle("academicPath", subject)} />
              ))}
              <InputCard variant="block" label={OTHER_SUBJECT} selected={formData.academicPath.includes(OTHER_SUBJECT)} onClick={() => onArrayToggle("academicPath", OTHER_SUBJECT)} />
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
            tooltip="This helps us prioritize gap identification in the report — it does not change the alignment score."
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
                      <InputCard
                        key={opt.value}
                        variant="compact-pill"
                        mode="radio"
                        label={opt.label}
                        selected={formData.subjectConfidences[subject] === opt.value}
                        onClick={() => onRecordFieldChange("subjectConfidences", subject, opt.value)}
                      />
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
          <InputCard
            variant="block"
            className="w-full"
            label="University Entrance Test Prep"
            selected={formData.academicPath.includes("University Entrance Test Prep")}
            onClick={() => onArrayToggle("academicPath", "University Entrance Test Prep")}
          />

          <QuestionCard
            label="AP (Advanced Placement) Subjects"
            tooltip="Any Advanced Placement courses your child is currently taking or has completed."
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {AP_SUBJECTS.map((ap) => (
                <InputCard key={ap} variant="chip" label={ap} selected={formData.academicPath.includes(ap)} onClick={() => onArrayToggle("academicPath", ap)} />
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
        <QuestionCard
          label="Select languages your child has exposure to"
          tooltip="Indian schools often require Hindi or a regional language — let us know what your child already knows."
        >
          <div className="flex flex-wrap gap-2">
            {INDIAN_LANGUAGES.map((lang) => (
              <InputCard key={lang} variant="chip" label={lang} selected={formData.selectedLanguages.includes(lang)} onClick={() => onArrayToggle("selectedLanguages", lang)} />
            ))}
          </div>
        </QuestionCard>

        {formData.selectedLanguages.length > 0 && (
          <QuestionCard
            label="Proficiency Level for Each Language"
            tooltip="How comfortable your child is with each language you selected above."
          >
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
            <QuestionCard
              label="Which foreign language is the student studying?"
              htmlFor="foreign-lang-name"
              tooltip="The foreign language (e.g. Spanish, French) your child studies at their current school, if any."
            >
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
            <QuestionCard
              label="What is the student's current level?"
              htmlFor="foreign-lang-level"
              tooltip="Your child's proficiency level in that foreign language."
            >
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

      <QuestionCard
        label="Other language"
        htmlFor="custom-language"
        optional
        tooltip="Any additional language your child speaks that wasn't listed above."
      >
        <Input
          id="custom-language"
          type="text"
          value={formData.customLanguage}
          onChange={(e) => onFieldChange("customLanguage", e.target.value)}
        />
      </QuestionCard>

      {formData.schoolStage !== "elementary" && (
        <QuestionCard
          label="Current Extracurricular Activities"
          optional
          tooltip="Activities outside academics that may highlight strengths or interests relevant to the transition."
        >
          <MultiSelect
            idPrefix="extra"
            options={EXTRACURRICULARS}
            selected={formData.extracurriculars}
            onToggle={(activity) => onArrayToggle("extracurriculars", activity)}
          />
        </QuestionCard>
      )}
    </SectionCard>
  );
};

export default ParentStep2;
