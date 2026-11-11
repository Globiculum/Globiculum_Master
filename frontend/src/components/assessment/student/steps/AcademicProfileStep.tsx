import { useEffect } from "react";
import { Check } from "lucide-react";
import type { StudentStepProps } from "./types";
import { GlobiculumIconTile, GlobiculumSuccessIcon, GlobiculumTargetIcon } from "@/components/icons";
import SectionCard from "../../shared/SectionCard";
import SingleCardSection from "../../shared/SingleCardSection";
import FieldError from "../../shared/FieldError";
import InputCard from "../../shared/InputCard";
import CardNav from "../../shared/CardNav";
import OptionalBadge from "../../shared/OptionalBadge";
import SectionChips from "../../shared/SectionChips";
import { useSectionFlow } from "../../shared/useSectionFlow";
import { languageLevelError, newSchoolLanguageError } from "../../shared/stepRules";
import AcademicPathFlashcards from "./AcademicPathFlashcards";
import LanguageJourneyCard from "./LanguageJourneyCard";
import { ALL_COURSES, AP_COURSES, HIGH_SCHOOL_COURSES, courseLabel } from "../../shared/highSchoolCourses";
import { splitCoreElectives } from "../../shared/subjectGroups";
import childLogo from "@/assets/childlogo.png";
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
//
// Shown one section at a time (Core subjects, Electives, Courses, Languages,
// Performance), the same as the Parent step: Back and Next in every card,
// chips above showing where the student is, and a later section only once the
// earlier required answers are in (shared/useSectionFlow.ts).

type SectionId = "core" | "electives" | "courses" | "languages" | "performance";
const SECTION_LABEL: Record<SectionId, string> = {
  core: "Core subjects",
  electives: "Electives",
  courses: "Courses",
  languages: "Languages",
  performance: "Performance",
};

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

const AcademicProfileStep = ({
  formData,
  setField,
  setRecordField,
  errors,
  validationAttempt = 0,
  onSubjectsCompleteChange,
  onSubjectsProgressChange,
  onContinue,
}: StudentStepProps) => {
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
  const { subjects: dbSubjects, loading: dbLoading } = useCurriculumSubjects({
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
  // Optional subjects picked in School Profile are compared too.
  const comparedSubjects = [...dbSubjects.map((s) => s.subject), ...(formData.targetElectives ?? [])];
  const comparisonNote =
    usSourceSystem && boardIsHigherSecondary && dbSubjects.length > 0
      ? `These are the subjects you study now. Your report compares them with the ${boardLabel} Class ${boardGrade} ${streamLabel}: ${comparedSubjects.join(", ")}.`
      : null;

  const activeSubjectList = usSourceSystem
    ? (usSubjects.length > 0 ? usSubjects.map((s) => s.subject) : US_CORE_FALLBACK)
    : showTargetList
      ? dbSubjects.map((s) => s.subject)
      : SUBJECTS;
  const requiredSubjects = usSourceSystem
    ? US_REQUIRED_SUBJECTS
    : isHigherSecondary ? new Set<string>() : REQUIRED_SUBJECTS;

  // See ParentStep2: the stream's optional subjects, and core vs electives.
  const stream = normalizeTargetStream(formData.targetStream);
  const { subjects: optionalDb } = useCurriculumSubjects({
    curriculumSystem,
    grade: boardGrade,
    stream: stream ? `${stream}:optional` : null,
    enabled: showTargetList && !!curriculumSystem && !!stream,
  });
  const streamOptional = optionalDb.map((s) => s.subject);
  const [coreSubjects, electiveSubjects] = showTargetList
    ? [activeSubjectList, streamOptional]
    : splitCoreElectives(activeSubjectList);
  // Every subject card shown needs an answer: a level, or "I don't take this".
  const listLoading = (!!usSourceSystem && usLoading) || (showTargetList && dbLoading);
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

  const coursesAdded = ALL_COURSES.filter((course) => formData.academicPath.includes(course)).length;

  // ---- Sections, one at a time ----
  const sections: SectionId[] = [
    "core",
    ...(electiveSubjects.length > 0 ? (["electives"] as const) : []),
    ...(formData.schoolStage === "high" ? (["courses"] as const) : []),
    "languages",
    "performance",
  ];
  const answered = (subject: string) => !!formData.subjectConfidences[subject];
  const coreIncomplete = coreSubjects.some((s) => !answered(s));
  const electivesIncomplete = electiveSubjects.some((s) => !answered(s));
  // Whether a section's required answers are in (Courses is optional).
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
      const subjectSection: SectionId | null = !errors.academicPath
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
            (id === "languages" && !!(errors.targetLanguage || errors.languageProficiencies)) ||
            (id === "performance" && !!errors.overallPerformance)
        ) ?? null
      );
    },
    onContinue,
  });

  const renderSection = (id: SectionId) => {
    switch (id) {
      case "core":
        return (
          <AcademicPathFlashcards
            activeSubjectList={coreSubjects}
            requiredSubjects={requiredSubjects}
            academicPath={formData.academicPath}
            subjectConfidences={formData.subjectConfidences}
            setAcademicPath={(value) => setField("academicPath", value)}
            setConfidence={(subject, value) => setRecordField("subjectConfidences", subject, value)}
            error={errors.academicPath}
            excludeFromCustom={[...ALL_COURSES, ...electiveSubjects, ...NOT_OFFERED_SUBJECTS]}
            navTitle="Core Subjects"
            summaryTitle="Core subjects are ready."
            onBack={flow.goPrev}
            onNext={flow.goNext}
          />
        );
      case "electives":
        return (
          <AcademicPathFlashcards
            activeSubjectList={electiveSubjects}
            requiredSubjects={new Set<string>()}
            academicPath={formData.academicPath}
            subjectConfidences={formData.subjectConfidences}
            setAcademicPath={(value) => setField("academicPath", value)}
            setConfidence={(subject, value) => setRecordField("subjectConfidences", subject, value)}
            error={coreIncomplete ? undefined : errors.academicPath}
            navTitle={usSourceSystem ? "Current Electives (US School)" : "Electives"}
            navSubtitle="Optional subjects - mark the ones you don't take."
            summaryTitle="Electives are ready."
            showCustomCard={false}
            onBack={flow.goPrev}
            onNext={flow.goNext}
          />
        );
      case "courses":
        // Same course list as the parent flow (shared/highSchoolCourses.ts):
        // the report credits what these courses teach beyond state standards.
        return (
          <SingleCardSection
            railTitle="Courses"
            itemLabel="High School & AP Courses"
            itemDetail={coursesAdded > 0 ? `${coursesAdded} added` : "Optional"}
            complete={coursesAdded > 0}
            ariaLabel="Courses progress"
          >
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
                Courses you have taken or are taking. State standards are a minimum; these tell us what you actually covered.
              </p>
              {coursesAdded > 0 && (
                <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-secondary">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" /> {coursesAdded} added
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
            <CardNav onBack={flow.goPrev} onNext={flow.goNext} nextLabel={coursesAdded > 0 ? "Next" : "Skip, none taken"} />
          </SingleCardSection>
        );
      case "languages":
        return (
          <LanguageJourneyCard
            formData={formData}
            setField={setField}
            setRecordField={setRecordField}
            error={errors.targetLanguage}
            levelError={errors.languageProficiencies}
            validationAttempt={validationAttempt}
            onBack={flow.goPrev}
            onNext={flow.goNext}
          />
        );
      case "performance":
        return (
          <SingleCardSection
            railTitle="Overall Performance"
            itemLabel="Overall Performance"
            complete={!!formData.overallPerformance}
            accent="teal"
            invalid={!!errors.overallPerformance}
            ariaLabel="Overall performance"
          >
            <div className="flex flex-col items-center text-center">
              <div className="mb-4">
                <GlobiculumIconTile tone="violet" size={64}>
                  <GlobiculumSuccessIcon size={34} />
                </GlobiculumIconTile>
              </div>
              <h4 className="text-xl font-bold text-foreground">Overall Performance</h4>
              <p className="mt-1 text-sm text-muted-foreground">A general sense of how you&apos;re performing academically overall.</p>
            </div>
            <div role="radiogroup" aria-label="Overall Performance" className="mt-6 flex flex-wrap justify-center gap-2">
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
            <FieldError message={errors.overallPerformance} />
            {/* The last section: Next moves on to the next step. */}
            <CardNav onBack={flow.goPrev} onNext={flow.goNext} nextDisabled={!formData.overallPerformance} />
          </SingleCardSection>
        );
      default:
        return null;
    }
  };

  return (
    <SectionCard logo={childLogo} title="Academic Path">
      <div className="-mt-4 text-sm text-muted-foreground">Tell us what you're studying right now.</div>

      {comparisonNote && (flow.active === "core" || flow.active === "electives") && (
        <div className="rounded-lg border border-secondary/30 bg-secondary/5 px-4 py-3 text-sm text-foreground">
          {comparisonNote}
        </div>
      )}

      {listLoading && <div className="text-sm text-muted-foreground">Loading your subjects…</div>}

      {/* Held back until the subject lists arrive, so the cards don't open on
          a fallback list and then change under the student. */}
      {flow.active && (
        <>
          <SectionChips
            sections={sections}
            labels={SECTION_LABEL}
            activeIndex={flow.activeIndex}
            isComplete={sectionComplete}
            onSelect={flow.goTo}
            chipsRef={flow.chipsRef}
          />
          <div key={flow.active} className="animate-in fade-in-0 slide-in-from-right-2 duration-300">
            {renderSection(flow.active)}
          </div>
        </>
      )}
    </SectionCard>
  );
};

export default AcademicProfileStep;
