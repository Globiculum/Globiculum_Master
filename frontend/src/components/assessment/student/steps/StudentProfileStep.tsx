import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User } from "lucide-react";
import type { StudentStepProps } from "./types";
import SectionCard from "../ui/SectionCard";
import QuestionCard from "../ui/QuestionCard";
import InputCard from "../ui/InputCard";

// Step 1: Student Profile.
// Reuses the existing backend field vocabulary (schoolStage, snapshotGrade,
// snapshotLocation, usState, snapshotAge, previousLocation) so this step's
// output is already compatible with validate-student-data / analyze-curriculum
// without any transformation layer.

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

const LOCATIONS = [
  { value: "us", label: "United States" },
  { value: "other", label: "Other Country" },
];

const PREVIOUS_LOCATIONS = [
  { value: "us", label: "USA" },
  { value: "india", label: "India" },
  { value: "uae", label: "UAE / Dubai / Abu Dhabi" },
  { value: "singapore", label: "Singapore" },
  { value: "uk", label: "United Kingdom" },
  { value: "other", label: "Other" },
];

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
  "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT",
  "VA", "WA", "WV", "WI", "WY", "DC",
];

const StudentProfileStep = ({ formData, setField, errors }: StudentStepProps) => {
  return (
    <SectionCard icon={User} title="Student Profile" description="Tell us a little about yourself before we begin.">
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

      <QuestionCard label="Age" htmlFor="snapshot-age" hint="Optional">
        <Input
          id="snapshot-age"
          type="number"
          min="5"
          max="18"
          value={formData.snapshotAge}
          onChange={(e) => setField("snapshotAge", e.target.value)}
        />
      </QuestionCard>

      <QuestionCard label="Current Location" required error={errors.snapshotLocation}>
        <div role="radiogroup" aria-label="Current Location" className="flex flex-wrap gap-2">
          {LOCATIONS.map((loc) => (
            <InputCard
              key={loc.value}
              mode="radio"
              label={loc.label}
              selected={formData.snapshotLocation === loc.value}
              onClick={() => setField("snapshotLocation", loc.value)}
            />
          ))}
        </div>
      </QuestionCard>

      {formData.snapshotLocation === "us" && (
        <QuestionCard label="US State" htmlFor="us-state">
          <Select value={formData.usState} onValueChange={(value) => setField("usState", value)}>
            <SelectTrigger id="us-state">
              <SelectValue placeholder="Select your state" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {US_STATES.map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
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

      <QuestionCard label="Previous Education Country" htmlFor="previous-location">
        <Select value={formData.previousLocation} onValueChange={(value) => setField("previousLocation", value)}>
          <SelectTrigger id="previous-location">
            <SelectValue placeholder="Where did you study before?" />
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
            value={formData.previousLocationOther}
            onChange={(e) => setField("previousLocationOther", e.target.value)}
          />
        </QuestionCard>
      )}
    </SectionCard>
  );
};

export default StudentProfileStep;
