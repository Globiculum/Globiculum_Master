import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, BookOpen, GraduationCap, MapPin, Target, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import InputCard from "../shared/InputCard";
import SectionCard from "../shared/SectionCard";
import SectionContainer from "../shared/SectionContainer";
import QuestionCard from "../shared/QuestionCard";
import TimelineSelector from "../shared/TimelineSelector";
import EducationHistoryList from "../shared/EducationHistoryList";
import VoiceInputButton from "../shared/VoiceInputButton";
import FieldError from "../shared/FieldError";
import type { ParentStepProps } from "./types";

// Step 1: School Profile.

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

// Mirrors the Student flow's per-stage curriculum options (StudentProfileStep.tsx)
// so both journeys offer the same choices.
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

// Value stays the two-letter abbreviation (existing usState payload shape);
// only the displayed label is expanded to "Full Name (Abbreviation)".
const usStates: { value: string; label: string }[] = [
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
usStates.push({ value: "other", label: "Other" });

const ParentStep1 = ({ formData, onFieldChange, fieldErrors }: ParentStepProps) => {
  const [focusedNameField, setFocusedNameField] = useState<"first" | "last">("first");

  const getCurrentCurriculumOptions = () => {
    if (!formData.schoolStage) return [];
    return CURRICULUM_BY_STAGE[formData.schoolStage] || [];
  };

  const handleSchoolStageChange = (stage: string) => {
    onFieldChange("schoolStage", stage);
    onFieldChange("snapshotGrade", "");
    onFieldChange("currentCurriculum", "");
    // Reset stage-specific fields, matching the original handleSelectChange behavior.
    onFieldChange("elementaryConfidences", {});
    onFieldChange("mathCourse", "");
    onFieldChange("mathProgramLevel", "");
    onFieldChange("academicSignals", []);
  };

  return (
    <SectionCard icon={MapPin} title="School Profile" description="Tell us about your child's school and transition plans.">
      <SectionContainer icon={User} title="About Your Child" description="Let's start with the basics.">
        <QuestionCard
          label="Child's Name"
          required
          tooltip="We'll use this to personalize the report and any communication about your child's transition."
          invalid={!!(fieldErrors.childName || fieldErrors.childLastName)}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Input
                id="child-first-name"
                placeholder="First name"
                value={formData.childName}
                onFocus={() => setFocusedNameField("first")}
                onChange={(e) => onFieldChange("childName", e.target.value)}
              />
              <FieldError message={fieldErrors.childName} />
            </div>
            <div>
              <Input
                id="child-last-name"
                placeholder="Last name"
                value={formData.childLastName}
                onFocus={() => setFocusedNameField("last")}
                onChange={(e) => onFieldChange("childLastName", e.target.value)}
              />
              <FieldError message={fieldErrors.childLastName} />
            </div>
          </div>
          <div className="mt-2 flex justify-end">
            <VoiceInputButton
              label="Say your child's name"
              onResult={(text) => onFieldChange(focusedNameField === "last" ? "childLastName" : "childName", text)}
            />
          </div>
        </QuestionCard>
      </SectionContainer>

      <SectionContainer
        icon={MapPin}
        title="Select School Stage"
        description="Which stage best describes your child?"
        required
        error={fieldErrors.schoolStage}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputCard
            variant="large"
            mode="radio"
            icon={BookOpen}
            label="Elementary"
            description="Grades 1–5"
            selected={formData.schoolStage === "elementary"}
            onClick={() => handleSchoolStageChange("elementary")}
          />

          <InputCard
            variant="large"
            mode="radio"
            icon={Target}
            label="Middle School"
            description="Grades 6–8"
            selected={formData.schoolStage === "middle"}
            onClick={() => handleSchoolStageChange("middle")}
          />

          <InputCard
            variant="large"
            mode="radio"
            icon={BarChart3}
            label="High School"
            description="Grades 9–12"
            selected={formData.schoolStage === "high"}
            onClick={() => handleSchoolStageChange("high")}
          />
        </div>
      </SectionContainer>

      <SectionContainer icon={User} title="Student Snapshot" description="Tell us about your child's current education">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuestionCard
            label="Current Grade"
            htmlFor="snapshot-grade"
            required
            tooltip="The grade your child is currently enrolled in at their current school."
            error={fieldErrors.snapshotGrade}
          >
            <Select
              value={formData.snapshotGrade}
              onValueChange={(value) => onFieldChange("snapshotGrade", value)}
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
            label="Age"
            htmlFor="snapshot-age"
            optional
            tooltip="Helps refine age-appropriate curriculum comparisons if the grade level alone is ambiguous."
            error={fieldErrors.snapshotAge}
          >
            <Input
              id="snapshot-age"
              type="number"
              min="5"
              max="18"
              placeholder="Student's age"
              value={formData.snapshotAge}
              onChange={(e) => onFieldChange("snapshotAge", e.target.value)}
            />
          </QuestionCard>
        </div>

        <QuestionCard
          label="Current School Country"
          required
          tooltip="The country where your child currently attends school."
          error={fieldErrors.snapshotLocation}
        >
          <div role="radiogroup" aria-label="Current School Country" className="flex flex-wrap gap-2">
            {COUNTRIES.map((country) => (
              <InputCard
                key={country.value}
                variant="chip"
                mode="radio"
                label={country.label}
                selected={formData.snapshotLocation === country.value}
                onClick={() => onFieldChange("snapshotLocation", country.value)}
                disabled={!country.enabled}
                disabledHint="Coming Soon"
              />
            ))}
          </div>
        </QuestionCard>

        {formData.snapshotLocation === "us" && (
          <QuestionCard
            label="Which US State?"
            htmlFor="us-state"
            required
            tooltip="Your child's current state helps us compare against the right local curriculum standards."
            error={fieldErrors.usState}
          >
            <Select value={formData.usState} onValueChange={(value) => onFieldChange("usState", value)}>
              <SelectTrigger id="us-state">
                <SelectValue placeholder="Select your state" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {usStates.map((state) => (
                  <SelectItem key={state.value} value={state.value}>
                    {state.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </QuestionCard>
        )}

        {formData.usState === "other" && (
          <QuestionCard label="Please enter your state" htmlFor="us-state-other" error={fieldErrors.usStateOther}>
            <Input
              id="us-state-other"
              type="text"
              placeholder="Enter state name"
              value={formData.usStateOther}
              onChange={(e) => onFieldChange("usStateOther", e.target.value)}
            />
          </QuestionCard>
        )}

        {formData.snapshotLocation === "other" && (
          <QuestionCard label="Please specify your country" htmlFor="snapshot-location-other" error={fieldErrors.snapshotLocationOther}>
            <Input
              id="snapshot-location-other"
              type="text"
              placeholder="Enter country name"
              value={formData.snapshotLocationOther}
              onChange={(e) => onFieldChange("snapshotLocationOther", e.target.value)}
            />
          </QuestionCard>
        )}
      </SectionContainer>

      <SectionContainer icon={BookOpen} title="Current Curriculum" description="Curriculum options change based on school stage.">
        <QuestionCard
          label="Select your current curriculum system"
          htmlFor="current-curriculum"
          required
          tooltip="The academic curriculum or standards your child currently follows at school."
          error={fieldErrors.currentCurriculum}
        >
          <Select
            value={formData.currentCurriculum}
            onValueChange={(value) => onFieldChange("currentCurriculum", value)}
            disabled={!formData.schoolStage}
          >
            <SelectTrigger id="current-curriculum">
              <SelectValue placeholder={formData.schoolStage ? "Select current curriculum" : "Select school stage first"} />
            </SelectTrigger>
            <SelectContent className="max-h-[400px]">
              {getCurrentCurriculumOptions().map((curriculum) => (
                <SelectItem key={curriculum.value} value={curriculum.value}>
                  {curriculum.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </QuestionCard>

        {formData.currentCurriculum === "other" && (
          <QuestionCard
            label="Please specify the curriculum system"
            htmlFor="current-curriculum-other"
            error={fieldErrors.currentCurriculumOther}
          >
            <Input
              id="current-curriculum-other"
              type="text"
              placeholder="Enter curriculum name"
              value={formData.currentCurriculumOther}
              onChange={(e) => onFieldChange("currentCurriculumOther", e.target.value)}
            />
          </QuestionCard>
        )}
      </SectionContainer>

      <SectionContainer icon={GraduationCap} title="Target & Timeline" description="Where your child is headed, and by when.">
        <QuestionCard
          label="Target Indian Board"
          required
          tooltip="The Indian education board you're considering enrolling your child into."
          error={fieldErrors.targetGoal}
        >
          <div role="radiogroup" aria-label="Target Indian Board" className="flex flex-wrap gap-2">
            {TARGET_BOARDS.map((board) => (
              <InputCard
                key={board.value}
                variant="chip"
                mode="radio"
                label={board.label}
                selected={formData.targetGoal === board.value}
                onClick={() => onFieldChange("targetGoal", board.value)}
              />
            ))}
          </div>
        </QuestionCard>

        <QuestionCard
          label="Target Grade"
          required
          tooltip="Should your child enroll in the same grade, or move up one grade, when transitioning?"
          error={fieldErrors.targetGrade}
        >
          <div role="radiogroup" aria-label="Target Grade" className="flex flex-wrap gap-2">
            {TARGET_GRADE_OPTIONS.map((option) => (
              <InputCard
                key={option.value}
                variant="chip"
                mode="radio"
                label={option.label}
                selected={formData.targetGrade === option.value}
                onClick={() => onFieldChange("targetGrade", option.value)}
              />
            ))}
          </div>
        </QuestionCard>

        <QuestionCard
          label="Transition Timeline"
          required
          tooltip="When you expect your child to start at their new school in India."
          error={fieldErrors.timeline}
        >
          <TimelineSelector options={TIMELINES} value={formData.timeline} onChange={(value) => onFieldChange("timeline", value)} />
        </QuestionCard>
      </SectionContainer>

      <SectionContainer icon={BookOpen} title="Education History" description="Where your child studied before, and any prior schools or curricula attended.">
        <QuestionCard label="Previous School Location" tooltip="Where your child was studying before their current school, if different.">
          <Select value={formData.previousLocation} onValueChange={(value) => onFieldChange("previousLocation", value)}>
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
              onChange={(e) => onFieldChange("previousLocationOther", e.target.value)}
            />
          </QuestionCard>
        )}

        <QuestionCard
          label="Have you (or your child) previously studied in India before moving to the United States?"
          tooltip="This helps us understand your child's prior exposure to the Indian curriculum, if any."
        >
          <div role="radiogroup" aria-label="Previously studied in India" className="flex flex-wrap gap-2">
            <InputCard
              variant="chip"
              mode="radio"
              label="Yes"
              selected={formData.previouslyStudiedInIndia === "yes"}
              onClick={() => onFieldChange("previouslyStudiedInIndia", "yes")}
            />
            <InputCard
              variant="chip"
              mode="radio"
              label="No"
              selected={formData.previouslyStudiedInIndia === "no"}
              onClick={() => onFieldChange("previouslyStudiedInIndia", "no")}
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
                  onChange={(entries) => onFieldChange("educationHistory", entries)}
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

export default ParentStep1;
