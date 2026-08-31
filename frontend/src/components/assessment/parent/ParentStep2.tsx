import { Check } from "lucide-react";
import academicPathIcon from "@/assets/icons-3d/academic-path.png";
import goalsAspirationsIcon from "@/assets/icons-3d/goals-aspirations.png";
import { cn } from "@/lib/utils";
import { GlobiculumIconTile, GlobiculumTargetIcon, GlobiculumSuccessIcon } from "@/components/icons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import InputCard from "../shared/InputCard";
import MultiSelect from "../shared/MultiSelect";
import SectionCard from "../shared/SectionCard";
import QuestionCard from "../shared/QuestionCard";
import FlashcardShell from "../shared/FlashcardShell";
import FieldError from "../shared/FieldError";
import { HighSchoolMathDeepDive } from "../HighSchoolMathDeepDive";
import AcademicPathFlashcards, { MAIN_CONFIDENCE_LEVELS } from "../student/steps/AcademicPathFlashcards";
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

  // Same two-step pattern as the Foreign Language / Indian Languages cards
  // in ParentLanguageJourneyCard.tsx: pick which apply from the chip grid
  // first, then a compact confidence row appears only for what's selected —
  // instead of always showing a full rating row for every AP subject
  // whether it applies or not, which was the space problem with the
  // previous design. Same 4 levels as the main subject flashcards
  // (Strong/Moderate/Needs Help/Not Applicable).
  const selectedApSubjects = AP_SUBJECTS.filter((ap) => formData.academicPath.includes(ap));
  const apAddedCount = selectedApSubjects.length + (formData.academicPath.includes("University Entrance Test Prep") ? 1 : 0);
  const apSectionComplete = apAddedCount > 0;

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
        microcopy={{
          strong: "Seems confident",
          moderate: "Understands most of it",
          "needs-help": "Could use more support",
        }}
        excludeFromCustom={[...AP_SUBJECTS, "University Entrance Test Prep"]}
        customCardTitle="Any other subjects?"
        customCardSubtitle="Add any subject not listed above, then note your child's confidence."
        customCardQuestion="How confident does your child seem in this subject?"
        summaryTitle="Your Child's Academic Path is ready."
      />

      <span id="academic-path-next-section" className="sr-only" aria-hidden="true" />

      {formData.schoolStage === "high" && (
        // Same outer two-column shell as ParentLanguageJourneyCard's
        // Language Exposure section: a persistent left nav rail (labeled
        // section name + tab entry) alongside the content card on the
        // right, for visual consistency between the two sections — even
        // though AP Courses is a single card, not a multi-card sequence.
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <nav aria-label="AP courses progress" className="hidden lg:block lg:w-[232px] lg:shrink-0">
            <div className="lg:sticky lg:top-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">AP Courses</h3>
              <ol className="mt-3">
                <li className="pb-3 last:pb-0">
                  <div className="relative z-10 flex items-center gap-2.5 rounded-lg p-0.5">
                    <span
                      className={cn(
                        "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2",
                        apSectionComplete ? "border-secondary bg-secondary text-secondary-foreground" : "border-violet bg-violet"
                      )}
                    >
                      {apSectionComplete ? (
                        <Check className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className={cn("block text-sm", apSectionComplete ? "font-medium text-secondary" : "font-bold text-primary")}>
                        AP Courses & University Prep
                      </span>
                      <span className={cn("block text-xs", apSectionComplete ? "font-medium text-secondary" : "text-muted-foreground/70")}>
                        {apSectionComplete ? `${apAddedCount} added` : "None added"}
                      </span>
                    </span>
                  </div>
                </li>
              </ol>
            </div>
          </nav>

          <div className="min-w-0 flex-1">
            <FlashcardShell accent="violet">
              {/* Same card structure as the Indian Languages / Foreign
                  Language cards: icon + centered title, then select-then-rate
                  — pick which apply from one compact chip grid, then a
                  confidence row appears only for what's selected. Display
                  label drops the redundant "(Advanced Placement)" prefix
                  (already stated in the title above); the stored value in
                  academicPath stays the full string. */}
              <div className="flex flex-col items-center text-center">
                <div className="mb-4">
                  <GlobiculumIconTile tone="teal" size={64}>
                    <GlobiculumTargetIcon size={34} />
                  </GlobiculumIconTile>
                </div>
                <h4 className="text-xl font-bold text-foreground">AP Courses & University Prep</h4>
                {apAddedCount > 0 && (
                  <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-secondary">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" /> {apAddedCount} added
                  </p>
                )}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
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

              {selectedApSubjects.length > 0 && (
                <div className="mt-5 space-y-1.5">
                  <p className="text-center text-xs font-medium text-muted-foreground">How confident does your child seem in each?</p>
                  {selectedApSubjects.map((ap) => {
                    const label = ap.replace("(Advanced Placement) ", "");
                    const current = formData.subjectConfidences[ap];
                    return (
                      <div key={ap} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/50 px-3 py-2">
                        <span className="text-sm font-semibold text-foreground">{label}</span>
                        <Select value={current} onValueChange={(value) => onRecordFieldChange("subjectConfidences", ap, value)}>
                          <SelectTrigger className="h-8 w-[150px] text-xs" aria-label={`${label} confidence`}>
                            <SelectValue placeholder="Rate confidence" />
                          </SelectTrigger>
                          <SelectContent>
                            {MAIN_CONFIDENCE_LEVELS.map((level) => (
                              <SelectItem key={level.value} value={level.value}>
                                {level.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              )}
            </FlashcardShell>
          </div>
        </div>
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

      {/* Same nav + FlashcardShell structure as AP Courses & University
          Prep / Language Exposure, for consistent typography and layout
          across every section in this step. */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <nav aria-label="Overall performance" className="hidden lg:block lg:w-[232px] lg:shrink-0">
          <div className="lg:sticky lg:top-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Overall Performance</h3>
            <ol className="mt-3">
              <li className="pb-3 last:pb-0">
                <div className="relative z-10 flex items-center gap-2.5 rounded-lg p-0.5">
                  <span
                    className={cn(
                      "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2",
                      formData.overallPerformance ? "border-secondary bg-secondary text-secondary-foreground" : "border-violet bg-violet"
                    )}
                  >
                    {formData.overallPerformance ? (
                      <Check className="h-3 w-3" aria-hidden="true" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
                    )}
                  </span>
                  <span className={cn("block text-sm", formData.overallPerformance ? "font-medium text-secondary" : "font-bold text-primary")}>
                    Overall Performance
                  </span>
                </div>
              </li>
            </ol>
          </div>
        </nav>

        <div className="min-w-0 flex-1">
          <FlashcardShell accent="teal" invalid={!!fieldErrors.overallPerformance}>
            <div className="flex flex-col items-center text-center">
              <div className="mb-4">
                <GlobiculumIconTile tone="violet" size={64}>
                  <GlobiculumSuccessIcon size={34} />
                </GlobiculumIconTile>
              </div>
              <h4 className="text-xl font-bold text-foreground">Overall Performance</h4>
              <p className="mt-1 text-sm text-muted-foreground">A general sense of how your child is performing academically overall.</p>
            </div>

            <div role="radiogroup" aria-label="Overall Performance" className="mt-6 flex flex-wrap justify-center gap-2">
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
            <FieldError message={fieldErrors.overallPerformance} />
          </FlashcardShell>
        </div>
      </div>

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
