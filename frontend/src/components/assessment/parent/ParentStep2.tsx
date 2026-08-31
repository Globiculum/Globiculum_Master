import academicPathIcon from "@/assets/icons-3d/academic-path.png";
import goalsAspirationsIcon from "@/assets/icons-3d/goals-aspirations.png";
import InputCard from "../shared/InputCard";
import MultiSelect from "../shared/MultiSelect";
import SectionCard from "../shared/SectionCard";
import SectionContainer from "../shared/SectionContainer";
import QuestionCard from "../shared/QuestionCard";
import { HighSchoolMathDeepDive } from "../HighSchoolMathDeepDive";
import AcademicPathFlashcards from "../student/steps/AcademicPathFlashcards";
import ParentLanguageJourneyCard from "./ParentLanguageJourneyCard";
import type { ParentStepProps } from "./types";

// Step 2: Academic Path — current subjects, per-subject confidence, AP
// courses + math track (High School only), language exposure for Indian
// schooling, foreign language details, extracurriculars (Middle & High).
//
// Phase E prep: Language Exposure for Indian Schooling + Proficiency per
// language + Foreign Language Studied are now the same unified "Language
// Exposure" journey Student uses (ParentLanguageJourneyCard.tsx, mirroring
// student/steps/LanguageJourneyCard.tsx) — select everything that applies at
// once, rate only what was selected, then a compact summary.

const EXTRACURRICULARS = [
  "Sports & Athletics", "Music & Arts", "Debate & Public Speaking", "Science Olympiad",
  "Math Competitions", "Robotics & Coding", "Community Service", "Cultural Activities",
];
const AP_SUBJECTS = [
  "AP (Advanced Placement) Calculus", "AP (Advanced Placement) Physics", "AP (Advanced Placement) Chemistry",
  "AP (Advanced Placement) Biology", "AP (Advanced Placement) Computer Science Principles",
  "AP (Advanced Placement) English", "AP (Advanced Placement) US History",
];

// Moved here from the Learning Profile step, where it sat alongside a
// near-duplicate "Typical Grade Range" question asking essentially the same
// thing — see parentValidation.ts and ParentLearningProfileWizard.tsx.
const OVERALL_PERFORMANCE_OPTIONS = [
  { value: "excelling", label: "Excelling" },
  { value: "above-average", label: "Above Average" },
  { value: "on-track", label: "On Track" },
  { value: "needs-support", label: "Needs Support" },
];

// Grades 11-12 see one unified higher-secondary subject list instead of the
// curriculum-based list below — same academicPath array field either way.
const HIGHER_SECONDARY_GRADES = [11, 12];

const HIGHER_SECONDARY_SUBJECTS = [
  "Physics", "Chemistry", "Biology", "Mathematics", "Computer Science",
  "Accountancy", "Economics", "Business Studies", "English",
  "History", "Political Science", "Geography", "Psychology", "Sociology",
];

const getSubjectsByGradeBand = (schoolStage: string, currentCurriculum: string[], gradeNumber: number) => {
  if (schoolStage === "elementary" && (gradeNumber === 1 || gradeNumber === 2)) {
    return ["Reading & Comprehension", "Foundational Math", "Writing Skills", "General Awareness / Environmental Learning"];
  }
  if (schoolStage === "elementary") {
    return ["Mathematics", "English / Language Arts", "Basic Science", "Social Studies", "Foreign Language"];
  }

  const cur = (currentCurriculum || []).map((c) => c.toLowerCase());

  if (cur.some((c) => c.includes("ib"))) {
    return ["Mathematics", "Sciences", "Language and Literature", "Language Acquisition", "Individuals and Societies"];
  }
  if (cur.some((c) => c.includes("cambridge") || c.includes("igcse") || c.includes("a-levels"))) {
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

// Nothing in Parent's subject lists is mandatory — before this redesign,
// subjects were a plain "select all that apply" grid, so a subject simply
// stayed unchecked if it didn't apply. Keeping requiredSubjects empty
// preserves that exact behavior: every flashcard offers "My child doesn't
// take this" rather than forcing an answer (see instruction to preserve
// optional-subject behavior for Foreign Language/Elective/Other — here it
// applies uniformly since nothing was ever required).
const NO_REQUIRED_SUBJECTS = new Set<string>();

const ParentStep2 = ({ formData, onFieldChange, onArrayToggle, onRecordFieldChange, fieldErrors }: ParentStepProps) => {
  const gradeNumber = parseInt(formData.snapshotGrade, 10);
  const isHigherSecondary = HIGHER_SECONDARY_GRADES.includes(gradeNumber);
  const subjects = getSubjectsByGradeBand(formData.schoolStage, formData.currentCurriculum, gradeNumber);
  const activeSubjectList = isHigherSecondary ? HIGHER_SECONDARY_SUBJECTS : subjects;

  return (
    <SectionCard icon={academicPathIcon} title="Academic Path">
      <div className="-mt-4 text-sm text-muted-foreground">Tell us what the student studies today.</div>

      <AcademicPathFlashcards
        activeSubjectList={activeSubjectList}
        requiredSubjects={NO_REQUIRED_SUBJECTS}
        academicPath={formData.academicPath}
        subjectConfidences={formData.subjectConfidences}
        setAcademicPath={(value) => onFieldChange("academicPath", value)}
        setConfidence={(subject, value) => onRecordFieldChange("subjectConfidences", subject, value)}
        error={fieldErrors.academicPath}
        navTitle="Your Child's Academic Path"
        navSubtitle="See how your child is doing in each subject."
        confidenceQuestion="How confident does your child seem in this subject?"
        microcopy={{
          strong: "Seems confident",
          moderate: "Understands most of it",
          "needs-help": "Could use more support",
        }}
        skipLabel="My child doesn't take this"
        customCardTitle="Any other subjects?"
        customCardSubtitle="Add any subject not listed above, then note your child's confidence."
        customCardQuestion="How confident does your child seem in this subject?"
        summaryTitle="Your Child's Academic Path is ready."
      />

      <span id="academic-path-next-section" className="sr-only" aria-hidden="true" />

      {formData.schoolStage === "high" && (
        <SectionContainer title="AP Courses & University Prep">
          {/* One unified chip grid — University Entrance Test Prep sits
              alongside the AP subjects rather than as its own separate
              full-width block, so every option in this section reads the
              same way (a tappable chip) instead of mixing a block-style
              row with a grid of pills below it.
              Display label drops the redundant "(Advanced Placement)" prefix
              (already stated in the section title above) — the stored value
              in academicPath stays the full string, unchanged. This is what
              was making long subjects like "...Computer Science Principles"
              wrap to two lines and look uneven next to the single-line pills. */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <InputCard
              variant="chip"
              label="University Entrance Test Prep"
              selected={formData.academicPath.includes("University Entrance Test Prep")}
              onClick={() => onArrayToggle("academicPath", "University Entrance Test Prep")}
            />
            {AP_SUBJECTS.map((ap) => (
              <InputCard
                key={ap}
                variant="chip"
                label={ap.replace("(Advanced Placement) ", "")}
                selected={formData.academicPath.includes(ap)}
                onClick={() => onArrayToggle("academicPath", ap)}
              />
            ))}
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

      <ParentLanguageJourneyCard formData={formData} onFieldChange={onFieldChange} onRecordFieldChange={onRecordFieldChange} />

      <QuestionCard
        label="Overall Performance"
        tooltip="A general sense of how your child is performing academically overall."
        error={fieldErrors.overallPerformance}
      >
        <div role="radiogroup" aria-label="Overall Performance" className="flex flex-wrap gap-2">
          {OVERALL_PERFORMANCE_OPTIONS.map((opt) => (
            <InputCard
              key={opt.value}
              variant="chip"
              mode="radio"
              label={opt.label}
              selected={formData.overallPerformance === opt.value}
              onClick={() => onFieldChange("overallPerformance", opt.value)}
            />
          ))}
        </div>
      </QuestionCard>

      {formData.schoolStage !== "elementary" && (
        <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/[0.06] to-transparent p-5 shadow-soft">
          <div className="mb-4 flex items-center gap-3">
            <img src={goalsAspirationsIcon} className="h-9 w-9 shrink-0 object-contain" alt="" aria-hidden="true" draggable={false} />
            <div className="flex-1">
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
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
};

export default ParentStep2;
