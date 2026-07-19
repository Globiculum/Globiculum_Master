import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen } from "lucide-react";
import type { StudentStepProps } from "./types";
import SectionCard from "../ui/SectionCard";
import QuestionCard from "../ui/QuestionCard";
import InputCard from "../ui/InputCard";

// Step 2: Academic Profile — current curriculum, current subjects, languages.
// Structural only: a simplified subject list (not the full grade-band logic
// from AssessmentForm.tsx) since this sprint is architecture, not parity of
// every conditional branch from the existing flow.

const CURRICULUM_OPTIONS = [
  { value: "us-common-core", label: "US Common Core" },
  { value: "state-specific", label: "State-Specific Standards" },
  { value: "ib", label: "IB (International Baccalaureate)" },
  { value: "cambridge", label: "Cambridge / IGCSE" },
  { value: "ap", label: "AP Track" },
  { value: "other", label: "Other" },
];

const CURRICULUM_TYPES = [
  { value: "standard-public", label: "Standard Public School" },
  { value: "honors-advanced", label: "Honors / Advanced" },
  { value: "ib", label: "IB" },
  { value: "private-charter", label: "Private / Charter" },
  { value: "not-sure", label: "Not sure" },
];

const SUBJECTS = [
  "Mathematics",
  "Science",
  "English / Language Arts",
  "Social Studies",
  "Foreign Language",
  "Elective (Art/Music/CS/Other)",
];

const INDIAN_LANGUAGES = ["Hindi", "Sanskrit", "Telugu", "Tamil", "Kannada", "Malayalam", "Marathi", "Bengali", "Gujarati"];

const AcademicProfileStep = ({ formData, setField, toggleArrayField, setRecordField, errors }: StudentStepProps) => {
  return (
    <SectionCard icon={BookOpen} title="Academic Profile" description="Help us understand your current academic setup.">
      <QuestionCard label="Current Curriculum" htmlFor="current-curriculum" required error={errors.currentCurriculum}>
        <Select value={formData.currentCurriculum} onValueChange={(value) => setField("currentCurriculum", value)}>
          <SelectTrigger id="current-curriculum">
            <SelectValue placeholder="Select current curriculum" />
          </SelectTrigger>
          <SelectContent>
            {CURRICULUM_OPTIONS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </QuestionCard>

      {formData.currentCurriculum === "other" && (
        <QuestionCard label="Please specify" htmlFor="current-curriculum-other">
          <Input
            id="current-curriculum-other"
            value={formData.currentCurriculumOther}
            onChange={(e) => setField("currentCurriculumOther", e.target.value)}
          />
        </QuestionCard>
      )}

      <QuestionCard label="Curriculum Type" htmlFor="curriculum-type">
        <Select value={formData.curriculumType} onValueChange={(value) => setField("curriculumType", value)}>
          <SelectTrigger id="curriculum-type">
            <SelectValue placeholder="Select curriculum type" />
          </SelectTrigger>
          <SelectContent>
            {CURRICULUM_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </QuestionCard>

      <QuestionCard label="Current Subjects" required hint="Select all subjects you're currently studying." error={errors.academicPath}>
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
        </div>
      </QuestionCard>

      <QuestionCard label="Languages" hint="Exposure to Indian languages">
        <div role="group" aria-label="Languages" className="flex flex-wrap gap-2">
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
        <QuestionCard label="Proficiency per language">
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

      <QuestionCard label="Other language" htmlFor="custom-language" hint="Optional">
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
