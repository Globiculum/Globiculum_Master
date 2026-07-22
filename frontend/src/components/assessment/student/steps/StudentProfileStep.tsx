import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User } from "lucide-react";
import { StepFieldError, type StudentStepProps } from "./types";
import SectionCard from "../ui/SectionCard";
import QuestionCard from "../ui/QuestionCard";
import InputCard from "../ui/InputCard";
import VoiceInputButton from "../../shared/VoiceInputButton";

// Step 1: Student Profile.
// Reuses the existing backend field vocabulary (schoolStage, snapshotGrade,
// snapshotLocation, usState, currentCurriculum, targetGoal, timeline) so
// this step's output is already compatible with validate-student-data /
// analyze-curriculum without any transformation layer. Student journey
// intentionally skips Previous School / Education History (Parent-only).

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
    { value: "ib-pyp", label: "IB PYP" },
    { value: "cambridge-primary", label: "Cambridge Primary" },
    { value: "montessori", label: "Montessori Curriculum" },
    { value: "other", label: "Other" },
  ],
  middle: [
    { value: "us-common-core", label: "US Common Core" },
    { value: "state-specific", label: "State-Specific Standards" },
    { value: "ib-myp", label: "IB MYP" },
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

const TIMELINES = [
  { value: "within-3-months", label: "Within 3 months" },
  { value: "3-6-months", label: "3–6 months" },
  { value: "6-12-months", label: "6–12 months" },
  { value: "1-2-years", label: "1–2 years" },
  { value: "exploring", label: "Just exploring" },
];

const StudentProfileStep = ({ formData, setField, errors }: StudentStepProps) => {
  const [focusedNameField, setFocusedNameField] = useState<"first" | "last">("first");

  return (
    <SectionCard icon={User} title="Student Profile" description="Tell us a little about yourself before we begin.">
      <QuestionCard label="Your Name" required>
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

      <QuestionCard label="School Stage" required error={errors.schoolStage}>
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

      <QuestionCard label="Current Grade" htmlFor="snapshot-grade" required error={errors.snapshotGrade}>
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

      <QuestionCard label="Current School Country" required error={errors.snapshotLocation}>
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
        <QuestionCard label="US State" htmlFor="us-state" required error={errors.usState}>
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

      <QuestionCard label="Current Curriculum" htmlFor="current-curriculum" required error={errors.currentCurriculum}>
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

      <QuestionCard label="Target Indian Board" required error={errors.targetGoal}>
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

      <QuestionCard label="Transition Timeline" required error={errors.timeline}>
        <div role="radiogroup" aria-label="Transition Timeline" className="flex flex-wrap gap-2">
          {TIMELINES.map((t) => (
            <InputCard
              key={t.value}
              mode="radio"
              label={t.label}
              selected={formData.timeline === t.value}
              onClick={() => setField("timeline", t.value)}
            />
          ))}
        </div>
      </QuestionCard>
    </SectionCard>
  );
};

export default StudentProfileStep;
