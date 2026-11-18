import { Check } from "lucide-react";
import { GlobiculumIconTile, GlobiculumTargetIcon } from "@/components/icons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import InputCard from "./InputCard";
import CardNav from "./CardNav";
import OptionalLabel from "./OptionalLabel";
import CustomEntryList from "./CustomEntryList";
import { ALL_COURSES, AP_COURSES, HIGH_SCHOOL_COURSES, courseLabel, coursesTakenList } from "./highSchoolCourses";
import { MAIN_CONFIDENCE_LEVELS } from "../student/steps/AcademicPathFlashcards";

// The High School & AP Courses card, shared by both Academic steps. It asks
// "taken any?" first: plenty of US students take no AP or listed course, and a
// grid of AP chips with only a "Skip" button read as if one had to be picked.
// Yes shows the chips and a box for a course we don't list (AP Spanish, an
// Honors class). Those are kept in academicPath like every subject, plus in
// customCourses so this card (and the report's "Courses Taken") can tell them
// apart from typed-in subjects. Only the listed courses have units in
// 'us-courses', so only they are credited in the comparison.

const RATING_OPTIONS = MAIN_CONFIDENCE_LEVELS.filter((level) => level.value !== "not-applicable");

interface CoursesCardProps {
  persona: "parent" | "student";
  academicPath: string[];
  customCourses: string[];
  /** "yes" | "no" | "" (not answered; the question is optional). */
  coursesTaken: string;
  setAcademicPath: (value: string[]) => void;
  setCustomCourses: (value: string[]) => void;
  setCoursesTaken: (value: string) => void;
  /** Parent only: a confidence rating per course taken. */
  subjectConfidences?: Record<string, string>;
  setConfidence?: (course: string, value: string) => void;
  onBack?: () => void;
  onNext: () => void;
}

const CoursesCard = ({
  persona,
  academicPath,
  customCourses,
  coursesTaken,
  setAcademicPath,
  setCustomCourses,
  setCoursesTaken,
  subjectConfidences,
  setConfidence,
  onBack,
  onNext,
}: CoursesCardProps) => {
  const taken = coursesTakenList(academicPath, customCourses);
  const typedIn = taken.filter((c) => !ALL_COURSES.includes(c));
  // Reports saved before this question existed have courses but no answer.
  const answer = coursesTaken || (taken.length > 0 ? "yes" : "");
  const child = persona === "parent";

  // A removed course must not keep counting as a strong/weak subject
  // (deriveSubjectStrengths reads every rating).
  const clearRating = (course: string) => {
    if (setConfidence && subjectConfidences?.[course] && subjectConfidences[course] !== "not-applicable") {
      setConfidence(course, "not-applicable");
    }
  };

  const answerNo = () => {
    taken.forEach(clearRating);
    setAcademicPath(academicPath.filter((s) => !taken.includes(s)));
    setCustomCourses([]);
    setCoursesTaken("no");
    onNext();
  };

  const toggleCourse = (course: string) => {
    if (academicPath.includes(course)) {
      clearRating(course);
      setAcademicPath(academicPath.filter((s) => s !== course));
    } else {
      setAcademicPath([...academicPath, course]);
    }
  };

  const addTypedCourse = (name: string) => {
    // "AP Calculus" typed in is the listed course.
    const listed = ALL_COURSES.find((c) => courseLabel(c).toLowerCase() === name.toLowerCase() || c.toLowerCase() === name.toLowerCase());
    if (listed) {
      if (!academicPath.includes(listed)) setAcademicPath([...academicPath, listed]);
      return;
    }
    if (!academicPath.includes(name)) setAcademicPath([...academicPath, name]);
    if (!customCourses.includes(name)) setCustomCourses([...customCourses, name]);
  };

  const removeTypedCourse = (name: string) => {
    clearRating(name);
    setAcademicPath(academicPath.filter((s) => s !== name));
    setCustomCourses(customCourses.filter((c) => c !== name));
  };

  const title = child ? "Has your child taken any high-school or AP courses?" : "Have you taken any high-school or AP courses?";
  const nextLabel = answer === "" ? "Skip, none taken" : "Next";
  const nextDisabled = answer === "yes" && taken.length === 0;

  return (
    <>
      <div className="flex flex-col items-center text-center">
        <div className="mb-4">
          <GlobiculumIconTile tone="teal" size={64}>
            <GlobiculumTargetIcon size={34} />
          </GlobiculumIconTile>
        </div>
        <h4 className="text-xl font-bold text-foreground">
          {title}
          <OptionalLabel />
        </h4>
        <p className="mt-1 text-sm text-muted-foreground">
          For example AP Calculus or High School Chemistry. State standards are a minimum; courses tell us what{" "}
          {child ? "was" : "you"} actually covered.
        </p>
        {taken.length > 0 && (
          <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-secondary">
            <Check className="h-3.5 w-3.5" aria-hidden="true" /> {taken.length} added
          </p>
        )}
      </div>

      <div role="radiogroup" aria-label={title} className="mt-5 flex justify-center gap-3">
        <InputCard variant="chip" mode="radio" label="Yes" selected={answer === "yes"} onClick={() => setCoursesTaken("yes")} />
        <InputCard variant="chip" mode="radio" label="No" selected={answer === "no"} onClick={answerNo} />
      </div>

      {answer === "yes" && (
        <>
          {[
            { title: "Courses", courses: HIGH_SCHOOL_COURSES },
            { title: "AP courses", courses: AP_COURSES },
          ].map(({ title: groupTitle, courses }) => (
            <div key={groupTitle} className="mt-5">
              <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{groupTitle}</h5>
              {/* Phones: pills sized to their text; wider screens: three columns. */}
              <div className="flex flex-wrap gap-2 sm:grid sm:grid-cols-3">
                {courses.map((course) => (
                  <InputCard
                    key={course}
                    variant="chip"
                    label={courseLabel(course)}
                    selected={academicPath.includes(course)}
                    onClick={() => toggleCourse(course)}
                  />
                ))}
              </div>
            </div>
          ))}

          <div className="mt-5">
            <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">A course not listed?</h5>
            <CustomEntryList
              entries={typedIn}
              onAdd={addTypedCourse}
              onRemove={removeTypedCourse}
              placeholder="e.g. AP Spanish, Honors English"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              These appear in the report, but we can&apos;t compare them in detail yet.
            </p>
          </div>

          {setConfidence && taken.length > 0 && (
            <div className="mt-5 space-y-1.5">
              <p className="text-center text-sm font-medium text-muted-foreground">How confident does your child seem in each?</p>
              {taken.map((course) => {
                const label = courseLabel(course);
                return (
                  <div key={course} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/50 px-3 py-2.5">
                    <span className="text-base font-bold text-foreground">{label}</span>
                    <Select value={subjectConfidences?.[course]} onValueChange={(value) => setConfidence(course, value)}>
                      <SelectTrigger
                        className="h-8 w-auto min-w-[132px] gap-1.5 rounded-full border-none bg-muted/60 px-3 text-sm font-semibold text-secondary shadow-none hover:bg-muted"
                        aria-label={`${label} confidence`}
                      >
                        <SelectValue placeholder="Rate confidence" />
                      </SelectTrigger>
                      <SelectContent>
                        {RATING_OPTIONS.map((level) => (
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

          {nextDisabled && (
            <p className="mt-4 text-center text-xs text-muted-foreground">Pick at least one course, or choose No.</p>
          )}
        </>
      )}

      <CardNav onBack={onBack} onNext={onNext} nextLabel={nextLabel} nextDisabled={nextDisabled} />
    </>
  );
};

export default CoursesCard;
