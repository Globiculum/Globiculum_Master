import type { StudentStepProps } from "./types";
import SectionCard from "../../shared/SectionCard";
import QuestionCard from "../../shared/QuestionCard";
import InputCard from "../../shared/InputCard";
import AcademicPathFlashcards from "./AcademicPathFlashcards";
import LanguageJourneyCard from "./LanguageJourneyCard";
import { ALL_COURSES, AP_COURSES, HIGH_SCHOOL_COURSES, courseLabel } from "../../shared/highSchoolCourses";
import childLogo from "@/assets/childlogo.png";
import {
  useCurriculumSubjects,
  useCanonicalSubjects,
  usStateSourceSystem,
  targetBoardToCurriculumSystem,
  normalizeTargetStream,
  targetStreamLabel,
  entryGrade,
} from "@/hooks/useCurriculumSubjects";

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

// Grades 11-12 read their subject list from the curriculum database, filtered by
// the stream chosen in the profile step. This replaced a hardcoded array that
// duplicated the one in ParentStep2 and had drifted from the data: it offered
// Psychology and Sociology, which are not ingested, so they could only ever
// render as "0% aligned" in the report.
const HIGHER_SECONDARY_GRADES = ["11", "12"];

// Answering confidence for these four is treated as the confirmation that
// the student takes them — no separate "select subjects" question. The
// higher-secondary list (grades 11-12) has no such fixed core; a student's
// stream (PCM/PCB/Commerce/Humanities) determines their subjects, so every
// entry there is skippable via "I don't take this".
const REQUIRED_SUBJECTS = new Set(["Mathematics", "Science", "English / Language Arts", "Social Studies"]);

// Canonical core subjects, matching subject_mappings. Shown to a US student only
// if their state's list can't be loaded; the first four are universal in US
// schooling, which is also what the gap engine assumes.
const US_CORE_FALLBACK = ["Mathematics", "English", "Science", "Social Studies", "Computer Science"];
const US_REQUIRED_SUBJECTS = new Set(["Mathematics", "English", "Science", "Social Studies"]);

const AcademicProfileStep = ({ formData, setField, setRecordField, errors }: StudentStepProps) => {
  const isHigherSecondary = HIGHER_SECONDARY_GRADES.includes(formData.snapshotGrade);
  const gradeNumber = parseInt(formData.snapshotGrade, 10);

  // Regular-US-curriculum students get their own state's subjects at every
  // grade (see ParentStep2 for the full reasoning). Everyone else keeps the
  // generic list below Class XI and the target board's stream subjects from it.
  const usSourceSystem = usStateSourceSystem(formData.snapshotLocation, formData.usState, formData.currentCurriculum);
  const { subjects: usSubjects, loading: usLoading } = useCanonicalSubjects({
    curriculumSystem: usSourceSystem,
    grade: gradeNumber,
    enabled: !!usSourceSystem,
  });

  const showTargetList = isHigherSecondary && !usSourceSystem;
  // See ParentStep2: for a US student the board's subjects are read at the
  // grade being entered.
  const boardGrade = usSourceSystem ? entryGrade(formData.snapshotGrade, formData.targetGrade) ?? gradeNumber : gradeNumber;
  const boardIsHigherSecondary = boardGrade >= 11;
  const curriculumSystem = targetBoardToCurriculumSystem(formData.targetGoal, boardGrade);
  const { subjects: dbSubjects } = useCurriculumSubjects({
    curriculumSystem,
    grade: boardGrade,
    stream: normalizeTargetStream(formData.targetStream) || null,
    enabled: boardIsHigherSecondary && !!curriculumSystem,
  });

  // See ParentStep2: tells a US student which board subjects their current
  // subjects will be compared with.
  const boardLabel = formData.targetGoal === "icse" ? (boardIsHigherSecondary ? "ISC" : "ICSE") : formData.targetGoal?.toUpperCase();
  const streamName = targetStreamLabel(formData.targetStream);
  const streamLabel = streamName ? `${streamName} stream` : "subjects";
  const comparisonNote =
    usSourceSystem && boardIsHigherSecondary && dbSubjects.length > 0
      ? `These are the subjects you study now. Your report compares them with the ${boardLabel} Class ${boardGrade} ${streamLabel}: ${dbSubjects.map((s) => s.subject).join(", ")}.`
      : null;

  const activeSubjectList = usSourceSystem
    ? (usSubjects.length > 0 ? usSubjects.map((s) => s.subject) : US_CORE_FALLBACK)
    : showTargetList
      ? dbSubjects.map((s) => s.subject)
      : SUBJECTS;
  const requiredSubjects = usSourceSystem
    ? US_REQUIRED_SUBJECTS
    : isHigherSecondary ? new Set<string>() : REQUIRED_SUBJECTS;
  return (
    <SectionCard logo={childLogo} title="Academic Path">
      <div className="-mt-4 text-sm text-muted-foreground">Tell us what you're studying right now.</div>

      {comparisonNote && (
        <div className="rounded-lg border border-secondary/30 bg-secondary/5 px-4 py-3 text-sm text-foreground">
          {comparisonNote}
        </div>
      )}

      {usSourceSystem && usLoading ? (
        <div className="text-sm text-muted-foreground">Loading your state&apos;s subjects…</div>
      ) : (
        <AcademicPathFlashcards
          activeSubjectList={activeSubjectList}
          requiredSubjects={requiredSubjects}
          academicPath={formData.academicPath}
          subjectConfidences={formData.subjectConfidences}
          setAcademicPath={(value) => setField("academicPath", value)}
          setConfidence={(subject, value) => setRecordField("subjectConfidences", subject, value)}
          error={errors.academicPath}
          excludeFromCustom={ALL_COURSES}
        />
      )}

      <span id="academic-path-next-section" className="sr-only" aria-hidden="true" />

      {formData.schoolStage === "high" && (
        // Same course list as the parent flow (shared/highSchoolCourses.ts):
        // the report credits what these courses teach beyond state standards.
        <QuestionCard
          label="High School & AP Courses"
          tooltip="Courses you have taken or are taking. State standards are a minimum; these tell us what you actually covered."
        >
          {[
            { title: "Courses", courses: HIGH_SCHOOL_COURSES },
            { title: "AP courses", courses: AP_COURSES },
          ].map(({ title, courses }) => (
            <div key={title} className="mt-3 first:mt-0">
              <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h5>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {courses.map((course) => {
                  const selected = formData.academicPath.includes(course);
                  return (
                    <InputCard
                      key={course}
                      variant="chip"
                      label={courseLabel(course)}
                      selected={selected}
                      onClick={() =>
                        setField(
                          "academicPath",
                          selected ? formData.academicPath.filter((s) => s !== course) : [...formData.academicPath, course]
                        )
                      }
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </QuestionCard>
      )}

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
