import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StepFieldError, type StudentStepProps } from "./types";

// Step 1: Student Profile.
// Reuses the existing backend field vocabulary (schoolStage, snapshotGrade,
// snapshotLocation, usState, snapshotAge, previousLocation) so this step's
// output is already compatible with validate-student-data / analyze-curriculum
// without any transformation layer.

const SCHOOL_STAGES = [
  { value: "elementary", label: "Elementary (Grades 1-5)" },
  { value: "middle", label: "Middle School (Grades 6-8)" },
  { value: "high", label: "High School (Grades 9-12)" },
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
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Student Profile</h2>

      <div>
        <Label htmlFor="school-stage">School Stage</Label>
        <Select
          value={formData.schoolStage}
          onValueChange={(value) => {
            setField("schoolStage", value);
            setField("snapshotGrade", "");
          }}
        >
          <SelectTrigger id="school-stage">
            <SelectValue placeholder="Select school stage" />
          </SelectTrigger>
          <SelectContent>
            {SCHOOL_STAGES.map((stage) => (
              <SelectItem key={stage.value} value={stage.value}>
                {stage.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <StepFieldError errors={errors} field="schoolStage" />
      </div>

      <div>
        <Label htmlFor="snapshot-grade">Current Grade</Label>
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
        <StepFieldError errors={errors} field="snapshotGrade" />
      </div>

      <div>
        <Label htmlFor="snapshot-age">Age (optional)</Label>
        <Input
          id="snapshot-age"
          type="number"
          min="5"
          max="18"
          value={formData.snapshotAge}
          onChange={(e) => setField("snapshotAge", e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="snapshot-location">Current Location</Label>
        <Select value={formData.snapshotLocation} onValueChange={(value) => setField("snapshotLocation", value)}>
          <SelectTrigger id="snapshot-location">
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent>
            {LOCATIONS.map((loc) => (
              <SelectItem key={loc.value} value={loc.value}>
                {loc.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <StepFieldError errors={errors} field="snapshotLocation" />
      </div>

      {formData.snapshotLocation === "us" && (
        <div>
          <Label htmlFor="us-state">US State</Label>
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
        </div>
      )}

      {formData.snapshotLocation === "other" && (
        <div>
          <Label htmlFor="snapshot-location-other">Please specify your country</Label>
          <Input
            id="snapshot-location-other"
            value={formData.snapshotLocationOther}
            onChange={(e) => setField("snapshotLocationOther", e.target.value)}
          />
        </div>
      )}

      <div>
        <Label htmlFor="previous-location">Previous Education Country</Label>
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
      </div>

      {formData.previousLocation === "other" && (
        <div>
          <Label htmlFor="previous-location-other">Please specify</Label>
          <Input
            id="previous-location-other"
            value={formData.previousLocationOther}
            onChange={(e) => setField("previousLocationOther", e.target.value)}
          />
        </div>
      )}
    </div>
  );
};

export default StudentProfileStep;
