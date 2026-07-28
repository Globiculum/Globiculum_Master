import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, User } from "lucide-react";
import { StepFieldError, type StudentStepProps } from "./types";
import SectionCard from "../../shared/SectionCard";
import QuestionCard from "../../shared/QuestionCard";
import InputCard from "../../shared/InputCard";
import VoiceInputButton from "../../shared/VoiceInputButton";
import TimelineSelector from "../../shared/TimelineSelector";
import SectionContainer from "../../shared/SectionContainer";
import EducationHistoryList from "../../shared/EducationHistoryList";

// Step 1: Student Profile.
// Reuses the existing backend field vocabulary (schoolStage, snapshotGrade,
// snapshotLocation, usState, currentCurriculum, targetGoal, timeline) so
// this step's output is already compatible with validate-student-data /
// analyze-curriculum without any transformation layer.

const SCHOOL_STAGES = [
  { value: "elementary", label: "Elementary", description: "Grades 1-5" },
  { value: "middle", label: "Middle School", description: "Grades 6-8" },
  { value: "high", label: "High School", description: "Grades 9-12" },
];

const getGradeOptions = (schoolStage: string) => {
  switch (schoolStage) {
    case "elementary":
      return Array.from({ length: 5 }, (_, i) => i + 1);
    case "middle":
      return Array.from({ length: 3 }, (_, i) => i + 6);
    case "high":
      return Array.from({ length: 4 }, (_, i) => i + 9);
    default:
      return Array.from({ length: 12 }, (_, i) => i + 1);
  }
};

// Only "United States" is enrollable today — the rest stay visible (per
// product decision to preview upcoming coverage) but are disabled.
const COUNTRIES = [
  { value: "us", label: "United States", enabled: true },
  { value: "canada", label: "Canada", enabled: false },
  { value: "uk", label: "United Kingdom", enabled: false },
  { value: "australia", label: "Australia", enabled: false },
  { value: "uae", label: "UAE / Gulf", enabled: false },
  { value: "singapore", label: "Singapore", enabled: false },
  { value: "malaysia", label: "Malaysia", enabled: false },
  { value: "other", label: "Other", enabled: false },
];

// Value stays the two-letter abbreviation (existing usState payload shape);
// only the displayed label is expanded to the full state name.
const US_STATES: { value: string; label: string }[] = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"],
  ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"], ["FL", "Florida"], ["GA", "Georgia"],
  ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"],
  ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"],
  ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"], ["MO", "Missouri"],
  ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"],
  ["NM", "New Mexico"], ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"],
  ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"],
  ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"],
  ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
  ["DC", "District of Columbia"],
].map(([value, name]) => ({ value, label: `${name} (${value})` }));

const CURRICULUM_BY_STAGE: Record<string, { value: string; label: string }[]> = {
  elementary: [
    { value: "us-common-core", label: "US Common Core" },
    { value: "state-specific", label: "State-Specific Standards" },
    { value: "ib-pyp", label: "IB Middle Year Programme" },
    { value: "cambridge-primary", label: "Cambridge Primary" },
    { value: "montessori", label: "Montessori Curriculum" },
    { value: "other", label: "Other" },
  ],
  middle: [
    { value: "us-common-core", label: "US Common Core" },
    { value: "state-specific", label: "State-Specific Standards" },
    { value: "ib-myp", label: "IB Middle Year Programme" },
    { value: "cambridge-lower", label: "Cambridge Lower Secondary" },
    { value: "honors-advanced", label: "Honors / Advanced Programs" },
    { value: "other", label: "Other" },
  ],
  high: [
    { value: "us-common-core", label: "US Common Core" },
    { value: "state-specific", label: "State-Specific Standards" },
    { value: "ap", label: "AP Track (Advanced Placement)" },
    { value: "ib-dp", label: "IB DP" },
    { value: "cambridge-igcse", label: "Cambridge IGCSE" },
    { value: "a-levels", label: "A-Levels" },
    { value: "other", label: "Other" },
  ],
};

const TARGET_BOARDS = [
  { value: "cbse", label: "CBSE" },
  { value: "icse", label: "ICSE" },
  { value: "ib", label: "IB" },
  { value: "cambridge-igcse", label: "Cambridge" },
];

const TARGET_GRADE_OPTIONS = [
  { value: "same", label: "Same Grade" },
  { value: "next", label: "Next Grade" },
];

const TIMELINES = [
  { value: "within-3-months", label: "Within 3 months" },
  { value: "3-6-months", label: "3–6 months" },
  { value: "6-12-months", label: "6–12 months" },
  { value: "1-2-years", label: "1–2 years" },
  { value: "exploring", label: "Just exploring" },
];

// Mirrors the Parent flow's PREVIOUS_LOCATIONS (ParentStep1.tsx) so both
// journeys offer the same choices.
const PREVIOUS_LOCATIONS = [
  { value: "same", label: "Same as current" },
  { value: "us", label: "United States" },
  { value: "india-cbse", label: "India (CBSE)" },
  { value: "india-icse", label: "India (ICSE)" },
  { value: "india-state", label: "India (State Board)" },
  { value: "uae", label: "UAE" },
  { value: "singapore", label: "Singapore" },
  { value: "uk", label: "United Kingdom" },
  { value: "australia", label: "Australia" },
  { value: "canada", label: "Canada" },
  { value: "malaysia", label: "Malaysia" },
  { value: "other", label: "Other" },
];

const StudentProfileStep = ({ formData, setField, errors }: StudentStepProps) => {
  const [focusedNameField, setFocusedNameField] = useState<"first" | "last">("first");

  return (
    <SectionCard icon={User} title="Student Profile" description="Tell us a little about yourself before we begin.">
      <QuestionCard label="Your Name" required tooltip="We'll use this to personalize your report.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Input
              id="student-first-name"
              placeholder="First name"
              value={formData.studentName}
              onFocus={() => setFocusedNameField("first")}
              onChange={(e) => setField("studentName", e.target.value)}
            />
            <StepFieldError errors={errors} field="studentName" />
          </div>
          <div>
            <Input
              id="student-last-name"
              placeholder="Last name"
              value={formData.studentLastName}
              onFocus={() => setFocusedNameField("last")}
              onChange={(e) => setField("studentLastName", e.target.value)}
            />
            <StepFieldError errors={errors} field="studentLastName" />
          </div>
        </div>
        <div className="mt-2 flex justify-end">
          <VoiceInputButton
            label="Say your name"
            onResult={(text) => setField(focusedNameField === "last" ? "studentLastName" : "studentName", text)}
          />
        </div>
      </QuestionCard>

      <QuestionCard
        label="School Stage"
        required
        tooltip="Pick the stage that best describes where you are in school right now."
        error={errors.schoolStage}
      >
        <div role="radiogroup" aria-label="School Stage" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {SCHOOL_STAGES.map((stage) => (
            <InputCard
              key={stage.value}
              variant="large"
              mode="radio"
              label={stage.label}
              description={stage.description}
              selected={formData.schoolStage === stage.value}
              onClick={() => {
                setField("schoolStage", stage.value);
                setField("snapshotGrade", "");
                setField("currentCurriculum", "");
              }}
            />
          ))}
        </div>
      </QuestionCard>

      <QuestionCard
        label="Current Grade"
        htmlFor="snapshot-grade"
        required
        tooltip="The grade you're currently in at school."
        error={errors.snapshotGrade}
      >
        <Select
          value={formData.snapshotGrade}
          onValueChange={(value) => setField("snapshotGrade", value)}
          disabled={!formData.schoolStage}
        >
          <SelectTrigger id="snapshot-grade">
            <SelectValue placeholder={formData.schoolStage ? "Select grade" : "Select school stage first"} />
          </SelectTrigger>
          <SelectContent>
            {getGradeOptions(formData.schoolStage).map((grade) => (
              <SelectItem key={grade} value={String(grade)}>
                Grade {grade}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </QuestionCard>

      <QuestionCard
        label="Current School Country"
        required
        tooltip="The country where you currently go to school."
        error={errors.snapshotLocation}
      >
        <div role="radiogroup" aria-label="Current School Country" className="flex flex-wrap gap-2">
          {COUNTRIES.map((loc) => (
            <InputCard
              key={loc.value}
              mode="radio"
              label={loc.label}
              selected={formData.snapshotLocation === loc.value}
              onClick={() => setField("snapshotLocation", loc.value)}
              disabled={!loc.enabled}
              disabledHint="Coming Soon"
            />
          ))}
        </div>
      </QuestionCard>

      {formData.snapshotLocation === "us" && (
        <QuestionCard
          label="US State"
          htmlFor="us-state"
          required
          tooltip="Your current state helps us compare against the right local curriculum standards."
          error={errors.usState}
        >
          <Select value={formData.usState} onValueChange={(value) => setField("usState", value)}>
            <SelectTrigger id="us-state">
              <SelectValue placeholder="Select your state" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {US_STATES.map((state) => (
                <SelectItem key={state.value} value={state.value}>
                  {state.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </QuestionCard>
      )}

      {formData.snapshotLocation === "other" && (
        <QuestionCard label="Please specify your country" htmlFor="snapshot-location-other">
          <Input
            id="snapshot-location-other"
            value={formData.snapshotLocationOther}
            onChange={(e) => setField("snapshotLocationOther", e.target.value)}
          />
        </QuestionCard>
      )}

      <QuestionCard
        label="Current Curriculum"
        htmlFor="current-curriculum"
        required
        tooltip="The curriculum or academic standards you currently follow at school."
        error={errors.currentCurriculum}
      >
        <Select
          value={formData.currentCurriculum}
          onValueChange={(value) => setField("currentCurriculum", value)}
          disabled={!formData.schoolStage}
        >
          <SelectTrigger id="current-curriculum">
            <SelectValue placeholder={formData.schoolStage ? "Select current curriculum" : "Select school stage first"} />
          </SelectTrigger>
          <SelectContent>
            {(CURRICULUM_BY_STAGE[formData.schoolStage] || []).map((c) => (
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

      <QuestionCard
        label="Target Indian Board"
        required
        tooltip="The Indian education board you're considering for your next school."
        error={errors.targetGoal}
      >
        <div role="radiogroup" aria-label="Target Indian Board" className="flex flex-wrap gap-2">
          {TARGET_BOARDS.map((board) => (
            <InputCard
              key={board.value}
              mode="radio"
              label={board.label}
              selected={formData.targetGoal === board.value}
              onClick={() => setField("targetGoal", board.value)}
            />
          ))}
        </div>
      </QuestionCard>

      <QuestionCard
        label="Target Grade"
        required
        error={errors.targetGrade}
        tooltip="Should you enroll in the same grade, or move up one grade, when transitioning?"
      >
        <div role="radiogroup" aria-label="Target Grade" className="flex flex-wrap gap-2">
          {TARGET_GRADE_OPTIONS.map((option) => (
            <InputCard
              key={option.value}
              mode="radio"
              label={option.label}
              selected={formData.targetGrade === option.value}
              onClick={() => setField("targetGrade", option.value)}
            />
          ))}
        </div>
      </QuestionCard>

      <QuestionCard
        label="Transition Timeline"
        required
        tooltip="When you expect to start at your new school in India."
        error={errors.timeline}
      >
        <TimelineSelector options={TIMELINES} value={formData.timeline} onChange={(value) => setField("timeline", value)} />
      </QuestionCard>

      <SectionContainer icon={BookOpen} title="Education History" description="Where you studied before, and any prior schools or curricula attended.">
        <QuestionCard label="Previous School Location" tooltip="Where you were studying before your current school, if different.">
          <Select value={formData.previousLocation} onValueChange={(value) => setField("previousLocation", value)}>
            <SelectTrigger id="previous-location">
              <SelectValue placeholder="Select previous location" />
            </SelectTrigger>
            <SelectContent>
              {PREVIOUS_LOCATIONS.map((loc) => (
                <SelectItem key={loc.value} value={loc.value}>
                  {loc.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </QuestionCard>

        {formData.previousLocation === "other" && (
          <QuestionCard label="Please specify" htmlFor="previous-location-other">
            <Input
              id="previous-location-other"
              type="text"
              placeholder="Enter country name"
              value={formData.previousLocationOther}
              onChange={(e) => setField("previousLocationOther", e.target.value)}
            />
          </QuestionCard>
        )}

        <QuestionCard
          label="Have you previously studied in India before moving to the United States?"
          tooltip="This helps us understand your prior exposure to the Indian curriculum, if any."
        >
          <div role="radiogroup" aria-label="Previously studied in India" className="flex flex-wrap gap-2">
            <InputCard
              mode="radio"
              label="Yes"
              selected={formData.previouslyStudiedInIndia === "yes"}
              onClick={() => setField("previouslyStudiedInIndia", "yes")}
            />
            <InputCard
              mode="radio"
              label="No"
              selected={formData.previouslyStudiedInIndia === "no"}
              onClick={() => setField("previouslyStudiedInIndia", "no")}
            />
          </div>
        </QuestionCard>

        <AnimatePresence initial={false}>
          {formData.previouslyStudiedInIndia === "yes" && (
            <motion.div
              key="education-history-list"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: "hidden" }}
            >
              <QuestionCard
                label="Prior Schools"
                optional
                tooltip="List any previous schools so we can account for curriculum overlap or gaps."
              >
                <EducationHistoryList
                  entries={formData.educationHistory}
                  onChange={(entries) => setField("educationHistory", entries)}
                  currentGrade={formData.snapshotGrade}
                />
              </QuestionCard>
            </motion.div>
          )}
        </AnimatePresence>
      </SectionContainer>
    </SectionCard>
  );
};

export default StudentProfileStep;
