import { BookOpen, GraduationCap, Languages } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import OptionCard from "../shared/OptionCard";
import MultiSelect from "../shared/MultiSelect";
import SectionContainer from "../shared/SectionContainer";
import QuestionCard from "../shared/QuestionCard";
import { ElementaryFoundations } from "../ElementaryFoundations";
import { HighSchoolMathDeepDive } from "../HighSchoolMathDeepDive";
import { AcademicSignals } from "../AcademicSignals";
import type { ParentStepProps } from "./types";

// Step 2: Academic Profile.
// Ported verbatim from AssessmentForm.tsx's renderAcademicPath() (originally
// Step 2 of 4). Every conditional branch (elementary foundations, foreign
// language details, math deep-dive, stream readiness, AP subjects, etc.) is
// preserved exactly.

const INDIAN_LANGUAGES = ["Hindi", "Sanskrit", "Telugu", "Tamil", "Kannada", "Malayalam", "Marathi", "Bengali", "Gujarati"];
const HOME_LANGUAGES = ["English", "Hindi", "Tamil", "Telugu", "Kannada", "Malayalam", "Marathi", "Bengali", "Gujarati", "Spanish", "Mandarin", "Arabic"];
const EXTRACURRICULARS = [
  "Sports & Athletics", "Music & Arts", "Debate & Public Speaking", "Science Olympiad",
  "Math Competitions", "Robotics & Coding", "Community Service", "Cultural Activities",
];
const AP_SUBJECTS = [
  "AP (Advanced Placement) Calculus", "AP (Advanced Placement) Physics", "AP (Advanced Placement) Chemistry",
  "AP (Advanced Placement) Biology", "AP (Advanced Placement) Computer Science Principles",
  "AP (Advanced Placement) English", "AP (Advanced Placement) US History",
];

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

  const subjects = getSubjectsByGradeBand(formData.schoolStage, formData.currentCurriculum, gradeNumber);

  return (
    <div className="space-y-10">
      <SectionContainer
        icon={BookOpen}
        title="Current Academic Path"
        description={isEarlyElementary ? "Help us understand your child's foundational learning" : "Tell us what the student studies today"}
      >
        <QuestionCard label={subjectQuestion} hint={subjectHelp} required error={fieldErrors.academicPath}>
          <div role="group" aria-label={subjectQuestion} className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {subjects.map((subject) => (
              <OptionCard key={subject} variant="block" selected={formData.academicPath.includes(subject)} onClick={() => onArrayToggle("academicPath", subject)}>
                {subject}
              </OptionCard>
            ))}
          </div>
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
                      { value: "needs-support", label: "Needs support" },
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

      {formData.schoolStage === "elementary" && gradeNumber >= 3 && (
        <ElementaryFoundations
          confidences={formData.elementaryConfidences}
          onChange={(area, level) => onRecordFieldChange("elementaryConfidences", area, level)}
        />
      )}

      {formData.schoolStage === "elementary" && formData.academicPath.includes("Foreign Language") && (
        <SectionContainer title="Foreign Language Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <QuestionCard label="Which foreign language is the student studying?" htmlFor="elem-foreign-lang-name">
              <Select value={formData.foreignLanguageName} onValueChange={(value) => onFieldChange("foreignLanguageName", value)}>
                <SelectTrigger id="elem-foreign-lang-name">
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
            <QuestionCard label="What is the student's current level in this language?" htmlFor="elem-foreign-lang-level">
              <Select value={formData.foreignLanguageLevel} onValueChange={(value) => onFieldChange("foreignLanguageLevel", value)}>
                <SelectTrigger id="elem-foreign-lang-level">
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

      {formData.schoolStage === "middle" && formData.academicPath.includes("Foreign Language") && (
        <SectionContainer title="Foreign Language Details">
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

      {!(formData.schoolStage === "high" && parseInt(formData.snapshotGrade) >= 11) && (
        <SectionContainer
          icon={Languages}
          title="Language Readiness for Indian Schooling"
          description="Indian schools typically require Hindi and sometimes a regional or third language. English proficiency is assumed for US-based students and will not be heavily weighted."
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
      )}

      {formData.schoolStage === "high" && parseInt(formData.snapshotGrade) >= 11 && (
        <SectionContainer
          icon={GraduationCap}
          title="Indian Stream Readiness"
          description="In Indian Grades 11–12, students specialize into streams. Your US coursework will be mapped to determine stream readiness. Language requirements typically apply only until Grade 10."
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "PCM (Science – Math)", desc: "Physics, Chemistry, Mathematics" },
              { label: "PCB (Science – Bio)", desc: "Physics, Chemistry, Biology" },
              { label: "Commerce", desc: "Business, Accountancy, Economics" },
              { label: "Humanities", desc: "History, Political Science, Psychology" },
            ].map((stream) => (
              <div key={stream.label} className="rounded-xl border border-border bg-card p-3 text-center shadow-soft">
                <div className="text-sm font-medium">{stream.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{stream.desc}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground italic text-center">
            Your report will automatically assess stream readiness based on the subjects you selected above.
          </p>
        </SectionContainer>
      )}

      <QuestionCard label="Languages Spoken at Home">
        <MultiSelect
          idPrefix="home"
          options={HOME_LANGUAGES}
          selected={formData.languagesAtHome}
          onToggle={(lang) => onArrayToggle("languagesAtHome", lang)}
        />
      </QuestionCard>

      {formData.schoolStage === "high" && (
        <AcademicSignals selectedSignals={formData.academicSignals} onToggle={(signal) => onArrayToggle("academicSignals", signal)} />
      )}

      {formData.schoolStage === "high" && (
        <SectionContainer title="High School Courses">
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

      {formData.schoolStage !== "elementary" && (
        <QuestionCard label="Current Extracurricular Activities">
          <MultiSelect
            idPrefix="extra"
            options={EXTRACURRICULARS}
            selected={formData.extracurriculars}
            onToggle={(activity) => onArrayToggle("extracurriculars", activity)}
          />
        </QuestionCard>
      )}
    </div>
  );
};

export default ParentStep2;
