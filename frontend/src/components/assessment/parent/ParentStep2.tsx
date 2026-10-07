import { Check } from "lucide-react";
import parentLogo from "@/assets/parentlogo.png";
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
import { ALL_COURSES, AP_COURSES, HIGH_SCHOOL_COURSES, courseLabel } from "../shared/highSchoolCourses";
import type { ParentStepProps } from "./types";
import {
  useCurriculumSubjects,
  useCanonicalSubjects,
  usStateSourceSystem,
  targetBoardToCurriculumSystem,
  normalizeTargetStream,
  targetStreamLabel,
  entryGrade,
} from "@/hooks/useCurriculumSubjects";

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
// High-school and AP courses (see shared/highSchoolCourses.ts): the gap engine
// credits what these courses teach on top of the state standards.
const AP_SUBJECTS = ALL_COURSES;

// Moved here from the Learning Profile step, where it sat alongside a
// near-duplicate "Typical Grade Range" question asking essentially the same
// thing — see parentValidation.ts and ParentLearningProfileWizard.tsx.
const OVERALL_PERFORMANCE_OPTIONS = [
  { value: "excelling", label: "Excelling" },
  { value: "above-average", label: "Above Average" },
  { value: "on-track", label: "On Track" },
  { value: "needs-support", label: "Needs Support" },
];

// Grades 11-12 read their subject list from the curriculum database, filtered by
// the stream chosen in Step 1 (see useCurriculumSubjects). It used to be a
// hardcoded array here, which drifted from the data in two ways: it offered
// Psychology and Sociology, which are not ingested — so the gap engine had
// nothing to compare them against and they rendered as permanent "0% aligned"
// cards in the report — and it had no notion of stream, so Commerce students
// were shown Physics/Chemistry/Biology.
const HIGHER_SECONDARY_GRADES = [11, 12];

// Canonical core subjects, matching subject_mappings. Only shown if the
// database lookup fails for a US student.
const US_CORE_FALLBACK = ["Mathematics", "English", "Science", "Social Studies", "Computer Science"];

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

  const usSourceSystem = usStateSourceSystem(formData.snapshotLocation, formData.usState, formData.currentCurriculum);
  // Non-US students in Classes XI-XII are shown the target board's subjects,
  // filtered by stream. ICSE resolves to ISC at 11-12 (same rule as the backend).
  // For a US student the board's subjects only feed the comparison note, so they
  // are read at the grade being entered (a Grade 10 student moving up -> Class 11).
  const boardGrade = usSourceSystem ? entryGrade(formData.snapshotGrade, formData.targetGrade) ?? gradeNumber : gradeNumber;
  const boardIsHigherSecondary = HIGHER_SECONDARY_GRADES.includes(boardGrade);
  const curriculumSystem = targetBoardToCurriculumSystem(formData.targetGoal, boardGrade);
  const showTargetList = isHigherSecondary && !usSourceSystem;
  const { subjects: dbSubjects, loading: subjectsLoading, error: subjectsError } =
    useCurriculumSubjects({
      curriculumSystem,
      grade: boardGrade,
      stream: normalizeTargetStream(formData.targetStream) || null,
      enabled: boardIsHigherSecondary && !!curriculumSystem,
    });

  // For a US student the list below is what they study now; the board's stream
  // subjects are what the report compares them with. Saying so keeps parents
  // from expecting Physics or Accountancy in this list.
  const boardLabel = formData.targetGoal === "icse" ? (boardIsHigherSecondary ? "ISC" : "ICSE") : formData.targetGoal?.toUpperCase();
  const streamName = targetStreamLabel(formData.targetStream);
  const streamLabel = streamName ? `${streamName} stream` : "subjects";
  const comparisonNote =
    usSourceSystem && boardIsHigherSecondary && dbSubjects.length > 0
      ? `These are the subjects your child studies now. The report compares them with the ${boardLabel} Class ${boardGrade} ${streamLabel}: ${dbSubjects.map((s) => s.subject).join(", ")}.`
      : null;

  // A student on the regular US curriculum gets their own state's subjects at
  // every grade, as canonical names resolved by subject_mappings. These are the
  // subjects they study today, which is what this step asks, and the gap engine
  // reads them back to decide which source domains the student has covered.
  // (The target subjects for Classes XI-XII now come from the stream chosen in
  // Step 1, so this list no longer has to stand in for them.)
  const { subjects: usSubjects, loading: usLoading, error: usError } = useCanonicalSubjects({
    curriculumSystem: usSourceSystem,
    grade: gradeNumber,
    enabled: !!usSourceSystem,
  });
  // Same vocabulary as the database, used only if the lookup fails, so a
  // network error never strands the form without a subject list.
  const usSubjectList = usSubjects.length > 0 ? usSubjects.map((s) => s.subject) : US_CORE_FALLBACK;

  const activeSubjectList = usSourceSystem
    ? usSubjectList
    : isHigherSecondary
      ? dbSubjects.map((s) => s.subject)
      : subjects;

  // Same two-step pattern as the Foreign Language / Indian Languages cards
  // in ParentLanguageJourneyCard.tsx: pick which apply from the chip grid
  // first, then a compact confidence row appears only for what's selected —
  // instead of always showing a full rating row for every AP subject
  // whether it applies or not, which was the space problem with the
  // previous design. Same 4 levels as the main subject flashcards
  // (Strong/Moderate/Needs Help/Not Applicable).
  const selectedApSubjects = AP_SUBJECTS.filter((ap) => formData.academicPath.includes(ap));
  const apAddedCount = selectedApSubjects.length;
  const apSectionComplete = apAddedCount > 0;
  // Chip selection already means "applies" — deselecting the chip is how a
  // course becomes not-applicable, so unlike the main subject flashcards,
  // this dropdown doesn't need its own separate Not Applicable option.
  const AP_CONFIDENCE_OPTIONS = MAIN_CONFIDENCE_LEVELS.filter((level) => level.value !== "not-applicable");

  return (
    <SectionCard logo={parentLogo} title="Academic Path">
      <div className="-mt-4 text-sm text-muted-foreground">Tell us what the student studies today.</div>

      {comparisonNote && (
        <div className="rounded-lg border border-secondary/30 bg-secondary/5 px-4 py-3 text-sm text-foreground">
          {comparisonNote}
        </div>
      )}

      {usSourceSystem && usLoading && (
        <div className="text-sm text-muted-foreground">Loading your state&apos;s subjects…</div>
      )}
      {usSourceSystem && !usLoading && usError && (
        <div className="text-sm text-muted-foreground">
          Showing core subjects. Your state&apos;s full subject list couldn&apos;t be loaded.
        </div>
      )}
      {showTargetList && subjectsLoading && (
        <div className="text-sm text-muted-foreground">Loading subjects for this board and stream…</div>
      )}
      {showTargetList && !subjectsLoading && !curriculumSystem && (
        <div className="text-sm text-muted-foreground">
          Pick a target board in the previous step to see its Class {gradeNumber} subjects.
        </div>
      )}
      {showTargetList && !subjectsLoading && curriculumSystem && !normalizeTargetStream(formData.targetStream) && (
        <div className="text-sm text-muted-foreground">
          Choose a stream in the previous step to narrow these subjects.
        </div>
      )}
      {showTargetList && !subjectsLoading && subjectsError && (
        <div className="text-sm text-destructive">
          Couldn&apos;t load the subject list ({subjectsError}). You can continue — subjects can be
          confirmed later.
        </div>
      )}

      {/* Held back until the state's list arrives, so the cards don't open on
          the five-subject fallback and then change under the parent. */}
      {!(usSourceSystem && usLoading) && (
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
          excludeFromCustom={AP_SUBJECTS}
          customCardTitle="Any other subjects?"
          customCardSubtitle="Add any subject not listed above, then note your child's confidence."
          customCardQuestion="How confident does your child seem in this subject?"
          summaryTitle="Your Child's Academic Path is ready."
        />
      )}

      <span id="academic-path-next-section" className="sr-only" aria-hidden="true" />

      {formData.schoolStage === "high" && (
        // Same outer two-column shell as ParentLanguageJourneyCard's
        // Language Exposure section: a persistent left nav rail (labeled
        // section name + tab entry) alongside the content card on the
        // right, for visual consistency between the two sections — even
        // though AP Courses is a single card, not a multi-card sequence.
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <nav aria-label="Courses progress" className="hidden lg:block lg:w-[232px] lg:shrink-0">
            <div className="lg:sticky lg:top-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Courses</h3>
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
                      <span className={cn("block text-sm", apSectionComplete ? "font-medium text-secondary" : "font-semibold text-foreground")}>
                        High School & AP Courses
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
                <h4 className="text-xl font-bold text-foreground">High School & AP Courses</h4>
                <p className="mt-1 text-sm text-muted-foreground">Courses your child has taken or is taking. State standards are a minimum; these tell us what was actually covered.</p>
                {apAddedCount > 0 && (
                  <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-secondary">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" /> {apAddedCount} added
                  </p>
                )}
              </div>

              {[
                { title: "Courses", courses: HIGH_SCHOOL_COURSES },
                { title: "AP courses", courses: AP_COURSES },
              ].map(({ title, courses }) => (
                <div key={title} className="mt-5">
                  <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h5>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {courses.map((ap) => (
                      <InputCard
                        key={ap}
                        variant="chip"
                        label={courseLabel(ap)}
                        selected={formData.academicPath.includes(ap)}
                        onClick={() => onArrayToggle("academicPath", ap)}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {selectedApSubjects.length > 0 && (
                <div className="mt-5 space-y-1.5">
                  <p className="text-center text-sm font-medium text-muted-foreground">How confident does your child seem in each?</p>
                  {selectedApSubjects.map((ap) => {
                    const label = courseLabel(ap);
                    const current = formData.subjectConfidences[ap];
                    return (
                      <div key={ap} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/50 px-3 py-2.5">
                        <span className="text-base font-bold text-foreground">{label}</span>
                        <Select value={current} onValueChange={(value) => onRecordFieldChange("subjectConfidences", ap, value)}>
                          <SelectTrigger
                            className="h-8 w-auto min-w-[132px] gap-1.5 rounded-full border-none bg-muted/60 px-3 text-sm font-semibold text-secondary shadow-none hover:bg-muted"
                            aria-label={`${label} confidence`}
                          >
                            <SelectValue placeholder="Rate confidence" />
                          </SelectTrigger>
                          <SelectContent>
                            {AP_CONFIDENCE_OPTIONS.map((level) => (
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

              {selectedApSubjects.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    document.getElementById("language-exposure-section")?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                  className="mt-6 flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-secondary hover:underline"
                >
                  <Check className="h-3.5 w-3.5" aria-hidden="true" /> Done — continue to Language Exposure →
                </button>
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

      <div id="language-exposure-section">
        <ParentLanguageJourneyCard formData={formData} onFieldChange={onFieldChange} onRecordFieldChange={onRecordFieldChange} />
      </div>

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
                  <span className={cn("block text-sm", formData.overallPerformance ? "font-medium text-secondary" : "font-semibold text-foreground")}>
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
