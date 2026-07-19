import { GraduationCap } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import OptionCard from "../shared/OptionCard";
import MultiSelect from "../shared/MultiSelect";
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

const ParentStep2 = ({ formData, onFieldChange, onArrayToggle, onRecordFieldChange }: ParentStepProps) => {
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
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-foreground mb-2">Current Academic Path</h3>
        <p className="text-muted-foreground">
          {isEarlyElementary ? "Help us understand your child's foundational learning" : "Tell us what the student studies today"}
        </p>
      </div>

      {/* Subject selection */}
      <div className="space-y-4">
        <h4 className="font-semibold text-lg">{subjectQuestion}</h4>
        <p className="text-sm text-muted-foreground">{subjectHelp}</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {subjects.map((subject) => (
            <OptionCard key={subject} variant="block" selected={formData.academicPath.includes(subject)} onClick={() => onArrayToggle("academicPath", subject)}>
              {subject}
            </OptionCard>
          ))}
        </div>
      </div>

      {/* Subject Confidence */}
      {formData.academicPath.length > 0 && (
        <div className="space-y-3">
          <div>
            <Label className="text-base font-medium">How comfortable is the student with each subject?</Label>
            <p className="text-sm text-muted-foreground mt-1">
              This helps us prioritize gap identification — it does not change the alignment scoring.
            </p>
          </div>
          <div className="space-y-2">
            {formData.academicPath.map((subject) => (
              <div key={`conf-${subject}`} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 p-3 rounded-lg border border-border bg-card/50">
                <span className="text-sm font-medium">{subject}</span>
                <div className="grid grid-cols-3 gap-2 md:flex md:gap-2">
                  {[
                    { value: "strong", label: "Strong" },
                    { value: "moderate", label: "Moderate" },
                    { value: "needs-support", label: "Needs support" },
                  ].map((opt) => (
                    <OptionCard
                      key={opt.value}
                      variant="compact-pill"
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
        </div>
      )}

      {/* Elementary: Additional foundational confidence assessment */}
      {formData.schoolStage === "elementary" && gradeNumber >= 3 && (
        <ElementaryFoundations
          confidences={formData.elementaryConfidences}
          onChange={(area, level) => onRecordFieldChange("elementaryConfidences", area, level)}
        />
      )}

      {/* Foreign Language Details - Elementary */}
      {formData.schoolStage === "elementary" && formData.academicPath.includes("Foreign Language") && (
        <div className="space-y-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
          <h4 className="font-semibold text-base">Foreign Language Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="elem-foreign-lang-name">Which foreign language is the student studying?</Label>
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
            </div>
            <div>
              <Label htmlFor="elem-foreign-lang-level">What is the student's current level in this language?</Label>
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
            </div>
          </div>
        </div>
      )}

      {/* Foreign Language Details - Middle School */}
      {formData.schoolStage === "middle" && formData.academicPath.includes("Foreign Language") && (
        <div className="space-y-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
          <h4 className="font-semibold text-base">Foreign Language Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="foreign-lang-name">Which foreign language is the student studying?</Label>
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
            </div>
            <div>
              <Label htmlFor="foreign-lang-level">What is the student's current level?</Label>
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
            </div>
          </div>
        </div>
      )}

      {/* High School Math Deep-Dive */}
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

      {/* Language Readiness for Indian Schooling - hide for grades 11-12 */}
      {!(formData.schoolStage === "high" && parseInt(formData.snapshotGrade) >= 11) && (
        <div className="space-y-4">
          <h4 className="font-semibold text-lg">Language Readiness for Indian Schooling</h4>
          <p className="text-sm text-muted-foreground">
            Indian schools typically require Hindi and sometimes a regional or third language. English proficiency
            is assumed for US-based students and will not be heavily weighted.
          </p>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Select languages your child has exposure to</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {INDIAN_LANGUAGES.map((lang) => (
                <OptionCard key={lang} variant="pill" selected={formData.selectedLanguages.includes(lang)} onClick={() => onArrayToggle("selectedLanguages", lang)}>
                  {lang}
                </OptionCard>
              ))}
              <OptionCard variant="pill" selected={formData.selectedLanguages.includes("Other")} onClick={() => onArrayToggle("selectedLanguages", "Other")}>
                Other
              </OptionCard>
            </div>
          </div>

          {formData.selectedLanguages.includes("Other") && (
            <div>
              <Label htmlFor="custom-language">Type the language</Label>
              <Input
                id="custom-language"
                type="text"
                placeholder="Enter language name"
                value={formData.customLanguage}
                onChange={(e) => onFieldChange("customLanguage", e.target.value)}
              />
            </div>
          )}

          {formData.selectedLanguages.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Proficiency Level for Each Language</Label>
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
          )}
        </div>
      )}

      {/* High School Stream Readiness Context (Grades 11-12) */}
      {formData.schoolStage === "high" && parseInt(formData.snapshotGrade) >= 11 && (
        <div className="space-y-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
          <h4 className="font-semibold text-lg flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Indian Stream Readiness
          </h4>
          <p className="text-sm text-muted-foreground">
            In Indian Grades 11–12, students specialize into streams. Your US coursework will be mapped to determine
            stream readiness. Language requirements typically apply only until Grade 10.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "PCM (Science – Math)", desc: "Physics, Chemistry, Mathematics" },
              { label: "PCB (Science – Bio)", desc: "Physics, Chemistry, Biology" },
              { label: "Commerce", desc: "Business, Accountancy, Economics" },
              { label: "Humanities", desc: "History, Political Science, Psychology" },
            ].map((stream) => (
              <div key={stream.label} className="p-3 rounded-lg border border-border bg-card text-center">
                <div className="text-sm font-medium">{stream.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{stream.desc}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground italic">
            Your report will automatically assess stream readiness based on the subjects you selected above.
          </p>
        </div>
      )}

      {/* Languages Spoken at Home */}
      <div className="space-y-4">
        <Label className="text-base font-medium">Languages Spoken at Home</Label>
        <MultiSelect
          idPrefix="home"
          options={HOME_LANGUAGES}
          selected={formData.languagesAtHome}
          onToggle={(lang) => onArrayToggle("languagesAtHome", lang)}
          columns="grid-cols-2 md:grid-cols-3"
        />
      </div>

      {/* High School: Academic Signals (reframed electives) */}
      {formData.schoolStage === "high" && (
        <AcademicSignals selectedSignals={formData.academicSignals} onToggle={(signal) => onArrayToggle("academicSignals", signal)} />
      )}

      {/* High School AP Subjects */}
      {formData.schoolStage === "high" && (
        <div className="space-y-4">
          <h4 className="font-semibold text-lg">High School Courses</h4>

          <div>
            <OptionCard variant="block" className="w-full" selected={formData.academicPath.includes("University Entrance Test Prep")} onClick={() => onArrayToggle("academicPath", "University Entrance Test Prep")}>
              University Entrance Test Prep
            </OptionCard>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">AP (Advanced Placement) Subjects</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {AP_SUBJECTS.map((ap) => (
                <OptionCard key={ap} variant="pill" selected={formData.academicPath.includes(ap)} onClick={() => onArrayToggle("academicPath", ap)}>
                  {ap}
                </OptionCard>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Extracurricular Activities - Keep for Middle/High only */}
      {formData.schoolStage !== "elementary" && (
        <div className="space-y-4">
          <Label className="text-base font-medium">Current Extracurricular Activities</Label>
          <MultiSelect
            idPrefix="extra"
            options={EXTRACURRICULARS}
            selected={formData.extracurriculars}
            onToggle={(activity) => onArrayToggle("extracurriculars", activity)}
            columns="grid-cols-2 md:grid-cols-3"
          />
        </div>
      )}
    </div>
  );
};

export default ParentStep2;
