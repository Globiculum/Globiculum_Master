import { useEffect } from "react";
import { Check, Trophy } from "lucide-react";
import parentLogo from "@/assets/parentlogo.png";
import { cn } from "@/lib/utils";
import { GlobiculumIconTile, GlobiculumTargetIcon, GlobiculumSuccessIcon } from "@/components/icons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import InputCard from "../shared/InputCard";
import MultiSelect from "../shared/MultiSelect";
import SectionCard from "../shared/SectionCard";
import FieldError from "../shared/FieldError";
import CardNav from "../shared/CardNav";
import OptionalBadge from "../shared/OptionalBadge";
import SectionChips from "../shared/SectionChips";
import SingleCardSection from "../shared/SingleCardSection";
import { useSectionFlow } from "../shared/useSectionFlow";
import { languageLevelError, newSchoolLanguageError } from "../shared/stepRules";
import { HighSchoolMathDeepDive } from "../HighSchoolMathDeepDive";
import AcademicPathFlashcards, { MAIN_CONFIDENCE_LEVELS } from "../student/steps/AcademicPathFlashcards";
import ParentLanguageJourneyCard from "./ParentLanguageJourneyCard";
import { ALL_COURSES, AP_COURSES, HIGH_SCHOOL_COURSES, courseLabel } from "../shared/highSchoolCourses";
import { splitCoreElectives } from "../shared/subjectGroups";
import type { ParentStepProps } from "./types";
import {
  useCurriculumSubjects,
  useCanonicalSubjects,
  usStateSourceSystem,
  targetBoardToCurriculumSystem,
  normalizeTargetStream,
  targetStreamLabel,
  entryGrade,
  NOT_OFFERED_SUBJECTS,
} from "@/hooks/useCurriculumSubjects";

// Step 2: Academic Path — current subjects, per-subject confidence, AP
// courses + math track (High School only), language exposure for Indian
// schooling, foreign language details, extracurriculars (Middle & High).
//
// Shown one section at a time (Core subjects, Electives, Courses, Languages,
// Performance, Activities), like the School step's one-question-at-a-time
// cards: every section card has Back on the left and Next on the right, and
// the chips above show where the parent is. A later section opens only once
// the earlier required answers are in. They used to be stacked in one long
// page, so Language Exposure could be answered before the core subjects.
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

type SectionId = "core" | "electives" | "courses" | "languages" | "performance" | "activities";
const SECTION_LABEL: Record<SectionId, string> = {
  core: "Core subjects",
  electives: "Electives",
  courses: "Courses",
  languages: "Languages",
  performance: "Performance",
  activities: "Activities",
};

const ParentStep2 = ({
  formData,
  onFieldChange,
  onArrayToggle,
  onRecordFieldChange,
  fieldErrors,
  validationAttempt = 0,
  onSubjectsCompleteChange,
  onSubjectsProgressChange,
  onContinue,
}: ParentStepProps) => {
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
  // Optional subjects picked in School Profile are compared too.
  const comparedSubjects = [...dbSubjects.map((s) => s.subject), ...(formData.targetElectives ?? [])];
  const comparisonNote =
    usSourceSystem && boardIsHigherSecondary && dbSubjects.length > 0
      ? `These are the subjects your child studies now. The report compares them with the ${boardLabel} Class ${boardGrade} ${streamLabel}: ${comparedSubjects.join(", ")}.`
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

  // The stream's optional subjects (Computer Science in PCM, Maths in PCB...),
  // for a student already on the board: the electives of their current list. A
  // US student picks the ones they will take in India in School Profile.
  const stream = normalizeTargetStream(formData.targetStream);
  const { subjects: optionalDb } = useCurriculumSubjects({
    curriculumSystem,
    grade: boardGrade,
    stream: stream ? `${stream}:optional` : null,
    enabled: showTargetList && !!curriculumSystem && !!stream,
  });
  const streamOptional = optionalDb.map((s) => s.subject);

  // Core subjects and electives are asked in separate sections.
  const [coreSubjects, electiveSubjects] = showTargetList
    ? [activeSubjectList, streamOptional]
    : splitCoreElectives(activeSubjectList);
  // Every subject card shown needs an answer: a level, or "doesn't take this".
  const listLoading = (!!usSourceSystem && usLoading) || (showTargetList && subjectsLoading);
  const subjectsComplete =
    !listLoading && [...coreSubjects, ...electiveSubjects].every((s) => !!formData.subjectConfidences[s]);
  useEffect(() => {
    onSubjectsCompleteChange?.(subjectsComplete);
  }, [subjectsComplete, onSubjectsCompleteChange]);

  // Subject cards answered, for the "Your Process" card.
  const subjectCardCount = coreSubjects.length + electiveSubjects.length;
  const subjectCardsAnswered = [...coreSubjects, ...electiveSubjects].filter((s) => !!formData.subjectConfidences[s]).length;
  useEffect(() => {
    if (!listLoading) onSubjectsProgressChange?.({ answered: subjectCardsAnswered, total: subjectCardCount });
  }, [listLoading, subjectCardsAnswered, subjectCardCount, onSubjectsProgressChange]);

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

  // ---- Sections, one at a time ----
  const sections: SectionId[] = [
    "core",
    ...(electiveSubjects.length > 0 ? (["electives"] as const) : []),
    ...(formData.schoolStage === "high" ? (["courses"] as const) : []),
    "languages",
    "performance",
    ...(formData.schoolStage !== "elementary" ? (["activities"] as const) : []),
  ];

  const answered = (subject: string) => !!formData.subjectConfidences[subject];
  const coreIncomplete = coreSubjects.some((s) => !answered(s));
  const electivesIncomplete = electiveSubjects.some((s) => !answered(s));
  // Whether a section's required answers are in (Courses and Activities are optional).
  const sectionComplete = (id: SectionId): boolean => {
    switch (id) {
      case "core":
        return !coreIncomplete;
      case "electives":
        return !electivesIncomplete;
      case "languages":
        return !newSchoolLanguageError(formData) && !languageLevelError(formData);
      case "performance":
        return !!formData.overallPerformance;
      default:
        return true;
    }
  };

  const flow = useSectionFlow({
    sections,
    isComplete: sectionComplete,
    loading: listLoading,
    validationAttempt,
    // The subject section with the missing answer, else languages, else performance.
    sectionWithError: () => {
      const subjectSection: SectionId | null = !fieldErrors.academicPath
        ? null
        : coreIncomplete
          ? "core"
          : electiveSubjects.length > 0 && electivesIncomplete
            ? "electives"
            : "core";
      return (
        sections.find(
          (id) =>
            id === subjectSection ||
            (id === "languages" && !!(fieldErrors.targetLanguage || fieldErrors.languageProficiencies)) ||
            (id === "performance" && !!fieldErrors.overallPerformance)
        ) ?? null
      );
    },
    onContinue,
  });
  const activeSection = flow.active;
  const goNextSection = flow.goNext;
  const goPrevSection = flow.goPrev;

  const microcopy = {
    strong: "Seems confident",
    moderate: "Understands most of it",
    "needs-help": "Could use more support",
  };

  const renderSection = (id: SectionId) => {
    switch (id) {
      case "core":
        return (
          <AcademicPathFlashcards
            activeSubjectList={coreSubjects}
            requiredSubjects={NO_REQUIRED_SUBJECTS}
            academicPath={formData.academicPath}
            subjectConfidences={formData.subjectConfidences}
            setAcademicPath={(value) => onFieldChange("academicPath", value)}
            setConfidence={(subject, value) => onRecordFieldChange("subjectConfidences", subject, value)}
            error={fieldErrors.academicPath}
            navTitle="Core Subjects"
            navSubtitle="See how your child is doing in each subject."
            microcopy={microcopy}
            excludeFromCustom={[...AP_SUBJECTS, ...electiveSubjects, ...NOT_OFFERED_SUBJECTS]}
            customCardTitle="Any other subjects?"
            customCardSubtitle="Add any subject not listed above, then note your child's confidence."
            customCardQuestion="How confident does your child seem in this subject?"
            summaryTitle="Core subjects are ready."
            onBack={goPrevSection}
            onNext={goNextSection}
          />
        );
      case "electives":
        return (
          <AcademicPathFlashcards
            activeSubjectList={electiveSubjects}
            requiredSubjects={NO_REQUIRED_SUBJECTS}
            academicPath={formData.academicPath}
            subjectConfidences={formData.subjectConfidences}
            setAcademicPath={(value) => onFieldChange("academicPath", value)}
            setConfidence={(subject, value) => onRecordFieldChange("subjectConfidences", subject, value)}
            error={coreIncomplete ? undefined : fieldErrors.academicPath}
            navTitle={usSourceSystem ? "Current Electives (US School)" : "Electives"}
            navSubtitle="Optional subjects - mark the ones your child doesn't take."
            microcopy={microcopy}
            summaryTitle="Electives are ready."
            showCustomCard={false}
            onBack={goPrevSection}
            onNext={goNextSection}
          />
        );
      case "courses":
        return (
          <>
            <SingleCardSection
              railTitle="Courses"
              itemLabel="High School & AP Courses"
              itemDetail={apSectionComplete ? `${apAddedCount} added` : "Optional"}
              complete={apSectionComplete}
              ariaLabel="Courses"
            >
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
                  <h4 className="text-xl font-bold text-foreground">
                    High School & AP Courses
                    <OptionalBadge />
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Courses your child has taken or is taking. State standards are a minimum; these tell us what was actually covered.
                  </p>
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
                    {/* Phones: pills sized to their text (two fixed columns squeezed
                        them into three lines); wider screens: three columns. */}
                    <div className="flex flex-wrap gap-2 sm:grid sm:grid-cols-3">
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

                <CardNav onBack={goPrevSection} onNext={goNextSection} nextLabel={apAddedCount > 0 ? "Next" : "Skip, none taken"} />
            </SingleCardSection>

            {(formData.academicPath.includes("Algebra") || formData.academicPath.includes("Geometry") || formData.academicPath.includes("Pre-Calculus / Calculus")) &&
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
          </>
        );
      case "languages":
        return (
          <ParentLanguageJourneyCard
            formData={formData}
            onFieldChange={onFieldChange}
            onRecordFieldChange={onRecordFieldChange}
            error={fieldErrors.targetLanguage}
            levelError={fieldErrors.languageProficiencies}
            validationAttempt={validationAttempt}
            onBack={goPrevSection}
            onNext={goNextSection}
          />
        );
      case "performance":
        return (
          <SingleCardSection
            railTitle="Overall Performance"
            itemLabel="Overall Performance"
            complete={!!formData.overallPerformance}
            accent="teal"
            invalid={!!fieldErrors.overallPerformance}
            ariaLabel="Overall performance"
          >
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
              <CardNav onBack={goPrevSection} onNext={goNextSection} nextDisabled={!formData.overallPerformance} />
          </SingleCardSection>
        );
      case "activities":
        // Asked last, as its own card; it used to sit under every section.
        return (
          <SingleCardSection
            railTitle="Activities"
            itemLabel="Extracurricular Activities"
            itemDetail={formData.extracurriculars.length > 0 ? `${formData.extracurriculars.length} added` : "Optional"}
            complete={formData.extracurriculars.length > 0}
            accent="globe"
            ariaLabel="Activities"
          >
              <div className="flex flex-col items-center text-center">
                <div className="mb-4">
                  <GlobiculumIconTile tone="amber" size={64}>
                    <Trophy size={32} aria-hidden="true" />
                  </GlobiculumIconTile>
                </div>
                <h4 className="text-xl font-bold text-foreground">
                  Current Extracurricular Activities
                  <OptionalBadge />
                </h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Activities outside academics that may highlight strengths or interests relevant to the transition.
                </p>
              </div>
              <div className="mt-6 flex justify-center">
                <MultiSelect
                  idPrefix="Extracurricular activities"
                  options={EXTRACURRICULARS}
                  selected={formData.extracurriculars}
                  onToggle={(activity) => onArrayToggle("extracurriculars", activity)}
                />
              </div>
              <CardNav onBack={goPrevSection} onNext={goNextSection} nextLabel={formData.extracurriculars.length > 0 ? "Next" : "Skip, none"} />
          </SingleCardSection>
        );
      default:
        return null;
    }
  };

  return (
    <SectionCard logo={parentLogo} title="Academic Path">
      <div className="-mt-4 text-sm text-muted-foreground">Tell us what the student studies today.</div>

      {comparisonNote && (activeSection === "core" || activeSection === "electives") && (
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

      {/* Held back until the subject lists arrive, so the cards don't open on
          a fallback list and then change under the parent. */}
      {activeSection && (
        <>
          <SectionChips
            sections={sections}
            labels={SECTION_LABEL}
            activeIndex={flow.activeIndex}
            isComplete={sectionComplete}
            onSelect={flow.goTo}
            chipsRef={flow.chipsRef}
          />

          <div key={activeSection} className="animate-in fade-in-0 slide-in-from-right-2 duration-300">
            {renderSection(activeSection)}
          </div>
        </>
      )}
    </SectionCard>
  );
};

export default ParentStep2;
