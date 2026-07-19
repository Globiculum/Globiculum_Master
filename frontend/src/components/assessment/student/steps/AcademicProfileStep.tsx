import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StepFieldError, type StudentStepProps } from "./types";

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
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Academic Profile</h2>

      <div>
        <Label htmlFor="current-curriculum">Current Curriculum</Label>
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
        <StepFieldError errors={errors} field="currentCurriculum" />
      </div>

      {formData.currentCurriculum === "other" && (
        <div>
          <Label htmlFor="current-curriculum-other">Please specify</Label>
          <Input
            id="current-curriculum-other"
            value={formData.currentCurriculumOther}
            onChange={(e) => setField("currentCurriculumOther", e.target.value)}
          />
        </div>
      )}

      <div>
        <Label htmlFor="curriculum-type">Curriculum Type</Label>
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
      </div>

      <div>
        <Label>Current Subjects</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {SUBJECTS.map((subject) => (
            <label key={subject} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={formData.academicPath.includes(subject)}
                onCheckedChange={() => toggleArrayField("academicPath", subject)}
              />
              {subject}
            </label>
          ))}
        </div>
        <StepFieldError errors={errors} field="academicPath" />
      </div>

      <div>
        <Label>Languages (exposure to Indian languages)</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {INDIAN_LANGUAGES.map((lang) => (
            <label key={lang} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={formData.selectedLanguages.includes(lang)}
                onCheckedChange={() => toggleArrayField("selectedLanguages", lang)}
              />
              {lang}
            </label>
          ))}
        </div>
      </div>

      {formData.selectedLanguages.length > 0 && (
        <div className="space-y-2">
          <Label>Proficiency per language</Label>
          {formData.selectedLanguages.map((lang) => (
            <div key={lang} className="flex items-center gap-3">
              <span className="text-sm min-w-[90px]">{lang}</span>
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
      )}

      <div>
        <Label htmlFor="custom-language">Other language (optional)</Label>
        <Input
          id="custom-language"
          value={formData.customLanguage}
          onChange={(e) => setField("customLanguage", e.target.value)}
        />
      </div>
    </div>
  );
};

export default AcademicProfileStep;
