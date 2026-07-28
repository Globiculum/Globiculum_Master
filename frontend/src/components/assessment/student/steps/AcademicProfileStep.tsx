import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen } from "lucide-react";
import type { StudentStepProps } from "./types";
import SectionCard from "../../shared/SectionCard";
import QuestionCard from "../../shared/QuestionCard";
import InputCard from "../../shared/InputCard";
import CustomSubjectList from "../../shared/CustomSubjectList";

// Step 2: Academic Path — current subjects, per-subject confidence, language
// exposure for Indian schooling, and foreign language details. Current
// Curriculum now lives in Step 1 (School Profile). AP Courses / Math Track /
// Extracurriculars are intentionally Parent-journey-only, not rendered here.

const SUBJECTS = [
  "Mathematics",
  "Science",
  "English / Language Arts",
  "Social Studies",
  "Foreign Language",
  "Elective (Art/Music/CS/Other)",
];

// Grades 11-12 see one unified higher-secondary subject list instead of the
// generic list above — same academicPath array field either way.
const HIGHER_SECONDARY_GRADES = ["11", "12"];

const HIGHER_SECONDARY_SUBJECTS = [
  "Physics", "Chemistry", "Biology", "Mathematics", "Computer Science",
  "Accountancy", "Economics", "Business Studies", "English",
  "History", "Political Science", "Geography", "Psychology", "Sociology",
];

const OTHER_SUBJECT = "Other";

const CONFIDENCE_LEVELS = [
  { value: "strong", label: "Strong" },
  { value: "moderate", label: "Moderate" },
  { value: "needs-help", label: "Needs Help" },
];

const INDIAN_LANGUAGES = ["Hindi", "Sanskrit", "Tamil", "Telugu", "Kannada", "Malayalam", "Marathi", "Gujarati", "Bengali"];

const AcademicProfileStep = ({ formData, setField, toggleArrayField, setRecordField, errors }: StudentStepProps) => {
  const isHigherSecondary = HIGHER_SECONDARY_GRADES.includes(formData.snapshotGrade);
  const activeSubjectList = isHigherSecondary ? HIGHER_SECONDARY_SUBJECTS : SUBJECTS;
  // Any academicPath entry not in the current predefined list is a custom
  // "Other" subject the user typed in — no separate literal "Other" marker
  // is ever stored, so every entry here is a real subject name.
  const customSubjects = formData.academicPath.filter((subject) => !activeSubjectList.includes(subject));

  const [showOtherInput, setShowOtherInput] = useState(customSubjects.length > 0);

  const addCustomSubject = (subject: string) => {
    setField("academicPath", [...formData.academicPath, subject]);
  };

  const removeCustomSubject = (subject: string) => {
    setField(
      "academicPath",
      formData.academicPath.filter((s) => s !== subject)
    );
  };

  return (
    <SectionCard icon={BookOpen} title="Academic Path" description="Tell us what you're studying right now.">
      <QuestionCard
        label="Current Subjects"
        required
        tooltip={
          isHigherSecondary
            ? "Select every subject you're currently studying — Grade 11-12 shows the higher-secondary subject list."
            : "Select every subject you're currently studying."
        }
        error={errors.academicPath}
      >
        {isHigherSecondary ? (
          <div role="group" aria-label="Current Subjects" className="flex flex-wrap gap-2">
            {HIGHER_SECONDARY_SUBJECTS.map((subject) => (
              <InputCard
                key={subject}
                mode="checkbox"
                label={subject}
                selected={formData.academicPath.includes(subject)}
                onClick={() => toggleArrayField("academicPath", subject)}
              />
            ))}
            <InputCard
              mode="checkbox"
              label={OTHER_SUBJECT}
              selected={showOtherInput || customSubjects.length > 0}
              onClick={() => setShowOtherInput((prev) => !prev)}
            />
          </div>
        ) : (
          <div role="group" aria-label="Current Subjects" className="flex flex-wrap gap-2">
            {SUBJECTS.map((subject) => (
              <InputCard
                key={subject}
                mode="checkbox"
                label={subject}
                selected={formData.academicPath.includes(subject)}
                onClick={() => toggleArrayField("academicPath", subject)}
              />
            ))}
            <InputCard
              mode="checkbox"
              label={OTHER_SUBJECT}
              selected={showOtherInput || customSubjects.length > 0}
              onClick={() => setShowOtherInput((prev) => !prev)}
            />
          </div>
        )}

        {(showOtherInput || customSubjects.length > 0) && (
          <CustomSubjectList
            subjects={customSubjects}
            onAdd={addCustomSubject}
            onRemove={removeCustomSubject}
            placeholder="e.g. Robotics, Design Thinking"
          />
        )}
      </QuestionCard>

      {formData.academicPath.length > 0 && (
        <QuestionCard
          label="How confident do you feel in each subject?"
          tooltip="This helps us prioritize gap identification in your report — it doesn't affect your alignment score."
        >
          <div className="space-y-2">
            {formData.academicPath.map((subject) => (
              <div key={subject} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 p-3">
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

      <QuestionCard
        label="Language Exposure for Indian Schooling"
        tooltip="Indian schools often require Hindi or a regional language — select any you already have some exposure to."
      >
        <div role="group" aria-label="Language Exposure for Indian Schooling" className="flex flex-wrap gap-2">
          {INDIAN_LANGUAGES.map((lang) => (
            <InputCard
              key={lang}
              mode="checkbox"
              label={lang}
              selected={formData.selectedLanguages.includes(lang)}
              onClick={() => toggleArrayField("selectedLanguages", lang)}
            />
          ))}
        </div>
      </QuestionCard>

      {formData.selectedLanguages.length > 0 && (
        <QuestionCard label="Proficiency per language" tooltip="How comfortable you are with each language you selected above.">
          <div className="space-y-3">
            {formData.selectedLanguages.map((lang) => (
              <div key={lang} className="flex items-center gap-3">
                <span className="min-w-[90px] text-sm font-medium text-foreground">{lang}</span>
                <Select
                  value={formData.languageProficiencies[lang] || ""}
                  onValueChange={(value) => setRecordField("languageProficiencies", lang, value)}
                >
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

      {formData.academicPath.includes("Foreign Language") && (
        <QuestionCard
          label="Foreign Language Studied"
          tooltip="The foreign language you study at school, if any, and your current level."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select value={formData.foreignLanguageName} onValueChange={(value) => setField("foreignLanguageName", value)}>
              <SelectTrigger>
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
            <Select value={formData.foreignLanguageLevel} onValueChange={(value) => setField("foreignLanguageLevel", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Proficiency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formData.foreignLanguageName === "other" && (
            <Input
              className="mt-2"
              placeholder="Enter language name"
              value={formData.foreignLanguageNameOther}
              onChange={(e) => setField("foreignLanguageNameOther", e.target.value)}
            />
          )}
        </QuestionCard>
      )}

      <QuestionCard
        label="Other language"
        htmlFor="custom-language"
        optional
        tooltip="Any additional language you speak that wasn't listed above."
      >
        <Input
          id="custom-language"
          value={formData.customLanguage}
          onChange={(e) => setField("customLanguage", e.target.value)}
        />
      </QuestionCard>
    </SectionCard>
  );
};

export default AcademicProfileStep;
