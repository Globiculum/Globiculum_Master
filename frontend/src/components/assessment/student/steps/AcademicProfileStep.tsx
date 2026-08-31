import type { StudentStepProps } from "./types";
import SectionCard from "../../shared/SectionCard";
import QuestionCard from "../../shared/QuestionCard";
import InputCard from "../../shared/InputCard";
import AcademicPathFlashcards from "./AcademicPathFlashcards";
import LanguageJourneyCard from "./LanguageJourneyCard";
import academicPathIcon from "@/assets/icons-3d/academic-path.png";

// Mirrors Parent's Overall Performance question (see ParentStep2.tsx) —
// same options, first-person copy, placed after Language Exposure to match
// where Parent puts it.
const OVERALL_PERFORMANCE_OPTIONS = [
  { value: "excelling", label: "Excelling" },
  { value: "above-average", label: "Above Average" },
  { value: "on-track", label: "On Track" },
  { value: "needs-support", label: "Needs Support" },
];

// Step 2: Academic Path — current subjects, per-subject confidence, language
// exposure for Indian schooling, and foreign language details. Current
// Curriculum now lives in Step 1 (School Profile). AP Courses / Math Track /
// Extracurriculars are intentionally Parent-journey-only, not rendered here.
//
// Phase A revision: Language Exposure for Indian Schooling + Proficiency per
// language + Foreign Language Studied are now one unified "Language
// Exposure" journey (LanguageJourneyCard.tsx) — select everything that
// applies at once, rate only what was selected, then a compact summary.
// AcademicPathFlashcards itself is untouched (reverted to its original
// per-subject form) since the language experience no longer reuses it — one
// flashcard per language was the exact fatigue this revision removes.

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

// Answering confidence for these four is treated as the confirmation that
// the student takes them — no separate "select subjects" question. The
// higher-secondary list (grades 11-12) has no such fixed core; a student's
// stream (PCM/PCB/Commerce/Humanities) determines their subjects, so every
// entry there is skippable via "I don't take this".
const REQUIRED_SUBJECTS = new Set(["Mathematics", "Science", "English / Language Arts", "Social Studies"]);

const AcademicProfileStep = ({ formData, setField, setRecordField, errors }: StudentStepProps) => {
  const isHigherSecondary = HIGHER_SECONDARY_GRADES.includes(formData.snapshotGrade);
  const activeSubjectList = isHigherSecondary ? HIGHER_SECONDARY_SUBJECTS : SUBJECTS;
  const requiredSubjects = isHigherSecondary ? new Set<string>() : REQUIRED_SUBJECTS;
  return (
    <SectionCard icon={academicPathIcon} title="Academic Path">
      <div className="-mt-4 text-sm text-muted-foreground">Tell us what you're studying right now.</div>

      <AcademicPathFlashcards
        activeSubjectList={activeSubjectList}
        requiredSubjects={requiredSubjects}
        academicPath={formData.academicPath}
        subjectConfidences={formData.subjectConfidences}
        setAcademicPath={(value) => setField("academicPath", value)}
        setConfidence={(subject, value) => setRecordField("subjectConfidences", subject, value)}
        error={errors.academicPath}
      />

      <span id="academic-path-next-section" className="sr-only" aria-hidden="true" />

      <LanguageJourneyCard formData={formData} setField={setField} setRecordField={setRecordField} />

      <QuestionCard
        label="Overall Performance"
        tooltip="A general sense of how you're performing academically overall."
        error={errors.overallPerformance}
      >
        <div role="radiogroup" aria-label="Overall Performance" className="flex flex-wrap gap-2">
          {OVERALL_PERFORMANCE_OPTIONS.map((opt) => (
            <InputCard
              key={opt.value}
              variant="chip"
              mode="radio"
              label={opt.label}
              selected={formData.overallPerformance === opt.value}
              onClick={() => setField("overallPerformance", opt.value)}
            />
          ))}
        </div>
      </QuestionCard>
    </SectionCard>
  );
};

export default AcademicProfileStep;
