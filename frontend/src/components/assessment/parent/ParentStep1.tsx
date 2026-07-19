import { BarChart3, BookOpen, Globe, MapPin, Target, Upload, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import OptionCard from "../shared/OptionCard";
import SectionContainer from "../shared/SectionContainer";
import QuestionCard from "../shared/QuestionCard";
import TimelineSelector from "../shared/TimelineSelector";
import { type ParentStepProps } from "./types";

// Step 1: School Profile.
// Ported verbatim from AssessmentForm.tsx's renderEducationalStart() +
// renderGoalsAndTimeline() (the original Step 0 and Step 1), merged here
// because the sprint's Step 1 field list ("Target Indian Board",
// "Transition Timeline", "Previous School Location") spans both of the
// original render functions.

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

const TIMELINES = [
  { value: "3months", label: "3 months" },
  { value: "6months", label: "6 months" },
  { value: "1year", label: "1 year" },
  { value: "2years", label: "2+ years" },
];

const curriculumByStage = {
  elementary: [
    { value: "us-common-core", label: "US Common Core", info: "Standard academic benchmarks used in most US states." },
    { value: "state-specific", label: "State-Specific Standards", info: "Curriculum aligned to your specific state's requirements." },
    { value: "ib-pyp", label: "IB PYP (International Baccalaureate – Primary Years Programme)", info: "Inquiry-based international curriculum for Grades 1–5." },
    { value: "cambridge-primary", label: "Cambridge Primary", info: "International curriculum for ages 5-11." },
    { value: "montessori", label: "Montessori Curriculum", info: "Child-centered educational approach based on self-directed learning." },
    { value: "waldorf", label: "Waldorf Early Education", info: "Holistic approach emphasizing creative and practical activities." },
    { value: "magnet-tag", label: "Magnet / TAG Programs", info: "Gifted and talented programs with advanced curriculum." },
    { value: "charter", label: "Charter School Curriculum", info: "Independent public school with flexible curriculum." },
    { value: "other", label: "Other", info: "Specify your curriculum system." },
  ],
  middle: [
    { value: "us-common-core", label: "US Common Core", info: "Standard academic benchmarks used in most US states." },
    { value: "state-specific", label: "State-Specific Standards", info: "Curriculum aligned to your specific state's requirements." },
    { value: "ib-myp", label: "IB MYP (International Baccalaureate – Middle Years Programme)", info: "Global curriculum emphasizing interdisciplinary learning." },
    { value: "cambridge-lower", label: "Cambridge Lower Secondary", info: "International curriculum for ages 11-14." },
    { value: "honors-advanced", label: "Honors / Advanced Programs", info: "Accelerated coursework with higher academic standards." },
    { value: "magnet-tag", label: "Magnet / TAG Programs", info: "Gifted and talented programs with advanced curriculum." },
    { value: "stem-magnet", label: "STEM Magnet / STEAM-specific Curriculums", info: "Science, Technology, Engineering, Arts, and Math focused programs." },
    { value: "charter", label: "Charter School Curriculum", info: "Independent public school with flexible curriculum." },
    { value: "other", label: "Other", info: "Specify your curriculum system." },
  ],
  high: [
    { value: "us-common-core", label: "US Common Core", info: "Standard academic benchmarks used in most US states." },
    { value: "state-specific", label: "State-Specific Standards", info: "Curriculum aligned to your specific state's requirements." },
    { value: "american-diploma", label: "American Diploma Program", info: "Standard US high school diploma program." },
    { value: "ap", label: "AP Track (Advanced Placement)", info: "College-level courses for high school students." },
    { value: "ib-dp", label: "IB DP (International Baccalaureate – Diploma Programme)", info: "Globally recognized pre-university program for Grades 11–12." },
    { value: "cambridge-igcse", label: "Cambridge IGCSE (International General Certificate of Secondary Education)", info: "Cambridge international curriculum for Grades 9–10." },
    { value: "a-levels", label: "A-Levels (Advanced Level Qualification)", info: "Two-year UK program recognized worldwide." },
    { value: "honors", label: "Honors Program", info: "Advanced coursework with higher academic standards." },
    { value: "dual-credit", label: "Dual Credit Program", info: "Earn high school and college credits simultaneously." },
    { value: "magnet-tag", label: "Magnet / TAG Programs", info: "Gifted and talented programs with specialized focus." },
    { value: "charter", label: "Charter School Curriculum", info: "Independent public school with flexible curriculum." },
    { value: "other", label: "Other", info: "Specify your curriculum system." },
  ],
};

const usStates = [
  { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" }, { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" }, { value: "CA", label: "California" }, { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" }, { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" }, { value: "HI", label: "Hawaii" }, { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" }, { value: "IN", label: "Indiana" }, { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" }, { value: "KY", label: "Kentucky" }, { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" }, { value: "MD", label: "Maryland" }, { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" }, { value: "MN", label: "Minnesota" }, { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" }, { value: "MT", label: "Montana" }, { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" }, { value: "NH", label: "New Hampshire" }, { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" }, { value: "NY", label: "New York" }, { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" }, { value: "OH", label: "Ohio" }, { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" }, { value: "PA", label: "Pennsylvania" }, { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" }, { value: "SD", label: "South Dakota" }, { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" }, { value: "UT", label: "Utah" }, { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" }, { value: "WA", label: "Washington" }, { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" }, { value: "WY", label: "Wyoming" }, { value: "DC", label: "District of Columbia" },
  { value: "other", label: "Other" },
];

const ParentStep1 = ({ formData, onFieldChange, fieldErrors }: ParentStepProps) => {
  const getCurrentCurriculumOptions = () => {
    if (!formData.schoolStage) return [];
    return curriculumByStage[formData.schoolStage as keyof typeof curriculumByStage] || [];
  };

  const handleSchoolStageChange = (stage: string) => {
    onFieldChange("schoolStage", stage);
    onFieldChange("snapshotGrade", "");
    // Reset stage-specific fields, matching the original handleSelectChange behavior.
    onFieldChange("elementaryConfidences", {});
    onFieldChange("mathCourse", "");
    onFieldChange("mathProgramLevel", "");
    onFieldChange("academicSignals", []);
  };

  return (
    <div className="space-y-10">
      <SectionContainer icon={MapPin} title="1. Select School Stage" description="Which stage best describes your child?">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <OptionCard variant="large" mode="radio" selected={formData.schoolStage === "elementary"} onClick={() => handleSchoolStageChange("elementary")}>
            <div className="flex flex-col items-center gap-3">
              <BookOpen className="h-12 w-12 text-secondary" />
              <div className="text-center">
                <div className="font-semibold text-lg">Elementary</div>
                <div className="text-sm text-muted-foreground">(Grades 1–5)</div>
              </div>
            </div>
          </OptionCard>

          <OptionCard variant="large" mode="radio" selected={formData.schoolStage === "middle"} onClick={() => handleSchoolStageChange("middle")}>
            <div className="flex flex-col items-center gap-3">
              <Target className="h-12 w-12 text-secondary" />
              <div className="text-center">
                <div className="font-semibold text-lg">Middle School</div>
                <div className="text-sm text-muted-foreground">(Grades 6–8)</div>
              </div>
            </div>
          </OptionCard>

          <OptionCard variant="large" mode="radio" selected={formData.schoolStage === "high"} onClick={() => handleSchoolStageChange("high")}>
            <div className="flex flex-col items-center gap-3">
              <BarChart3 className="h-12 w-12 text-secondary" />
              <div className="text-center">
                <div className="font-semibold text-lg">High School</div>
                <div className="text-sm text-muted-foreground">(Grades 9–12)</div>
              </div>
            </div>
          </OptionCard>
        </div>
      </SectionContainer>

      <SectionContainer icon={User} title="2. Student Snapshot" description="Tell us about your child's current education">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuestionCard label="Current Grade" htmlFor="snapshot-grade" required error={fieldErrors.snapshotGrade}>
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

          <QuestionCard label="Location" htmlFor="snapshot-location" required>
            <Select value={formData.snapshotLocation} onValueChange={(value) => onFieldChange("snapshotLocation", value)}>
              <SelectTrigger id="snapshot-location">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="us">United States</SelectItem>
                <SelectItem value="india" disabled>India (Coming Soon)</SelectItem>
                <SelectItem value="uae" disabled>UAE / Dubai / Abu Dhabi (Coming Soon)</SelectItem>
                <SelectItem value="qatar" disabled>Qatar (Coming Soon)</SelectItem>
                <SelectItem value="saudi" disabled>Saudi Arabia (Coming Soon)</SelectItem>
                <SelectItem value="kuwait" disabled>Kuwait (Coming Soon)</SelectItem>
                <SelectItem value="singapore" disabled>Singapore (Coming Soon)</SelectItem>
                <SelectItem value="malaysia" disabled>Malaysia (Coming Soon)</SelectItem>
                <SelectItem value="uk" disabled>United Kingdom (Coming Soon)</SelectItem>
                <SelectItem value="australia" disabled>Australia (Coming Soon)</SelectItem>
                <SelectItem value="canada" disabled>Canada (Coming Soon)</SelectItem>
                <SelectItem value="germany" disabled>Germany (Coming Soon)</SelectItem>
                <SelectItem value="nz" disabled>New Zealand (Coming Soon)</SelectItem>
                <SelectItem value="sa" disabled>South Africa (Coming Soon)</SelectItem>
                <SelectItem value="other">Other Country</SelectItem>
              </SelectContent>
            </Select>
          </QuestionCard>
        </div>

        {formData.snapshotLocation === "us" && (
          <QuestionCard label="Which US State?" htmlFor="us-state" error={fieldErrors.usState}>
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
          <QuestionCard label="Please enter your state" htmlFor="us-state-other">
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
          <QuestionCard label="Please specify your country" htmlFor="snapshot-location-other">
            <Input
              id="snapshot-location-other"
              type="text"
              placeholder="Enter country name"
              value={formData.snapshotLocationOther}
              onChange={(e) => onFieldChange("snapshotLocationOther", e.target.value)}
            />
          </QuestionCard>
        )}

        <QuestionCard label="Age" htmlFor="snapshot-age" hint="Optional" error={fieldErrors.snapshotAge}>
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
      </SectionContainer>

      <SectionContainer icon={BookOpen} title="3. Current Curriculum">
        <QuestionCard
          label="Select your current curriculum system"
          htmlFor="current-curriculum"
          hint="Choose the curriculum your child is currently studying."
          required
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
                <SelectItem key={curriculum.value} value={curriculum.value} className="py-3">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{curriculum.label}</span>
                    <span className="text-xs text-muted-foreground">{curriculum.info}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </QuestionCard>

        {formData.currentCurriculum === "other" && (
          <QuestionCard label="Please specify the curriculum system" htmlFor="current-curriculum-other">
            <Input
              id="current-curriculum-other"
              type="text"
              placeholder="Enter curriculum name"
              value={formData.currentCurriculumOther}
              onChange={(e) => onFieldChange("currentCurriculumOther", e.target.value)}
            />
          </QuestionCard>
        )}

        <QuestionCard
          label="What type of curriculum does the student follow?"
          htmlFor="curriculum-type"
          hint="This helps us calibrate expectations against the right academic baseline."
        >
          <Select value={formData.curriculumType} onValueChange={(value) => onFieldChange("curriculumType", value)}>
            <SelectTrigger id="curriculum-type">
              <SelectValue placeholder="Select curriculum type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard-public">Standard Public School</SelectItem>
              <SelectItem value="honors-advanced">Honors / Advanced</SelectItem>
              <SelectItem value="ib">IB</SelectItem>
              <SelectItem value="private-charter">Private / Charter</SelectItem>
              <SelectItem value="not-sure">Not sure</SelectItem>
            </SelectContent>
          </Select>
        </QuestionCard>
      </SectionContainer>

      <SectionContainer title="Optional Insights" description="Upload a recent report card (PDF or image) - Optional">
        <div className="flex justify-center">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-border bg-card px-6 py-3 transition-all duration-200 ease-smooth hover:border-secondary hover:shadow-soft">
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">Choose File</span>
            <span className="text-xs text-muted-foreground">{formData.reportCard ? formData.reportCard.name : "No file chosen"}</span>
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => onFieldChange("reportCard", e.target.files?.[0] || null)}
              className="hidden"
            />
          </label>
        </div>
      </SectionContainer>

      <SectionContainer icon={Globe} title="4. Education & Goals" description="Where your child is coming from, and where they're headed">
        <QuestionCard
          label="Previous Education Country"
          htmlFor="previous-location"
          hint="This helps us align curriculum expectations accurately."
        >
          <Select value={formData.previousLocation} onValueChange={(value) => onFieldChange("previousLocation", value)}>
            <SelectTrigger id="previous-location">
              <SelectValue placeholder="Where did your child study before?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="us">USA</SelectItem>
              <SelectItem value="india">India</SelectItem>
              <SelectItem value="uae">UAE / Dubai / Abu Dhabi</SelectItem>
              <SelectItem value="singapore">Singapore</SelectItem>
              <SelectItem value="uk">United Kingdom</SelectItem>
              <SelectItem value="australia">Australia</SelectItem>
              <SelectItem value="canada">Canada</SelectItem>
              <SelectItem value="qatar">Qatar</SelectItem>
              <SelectItem value="saudi">Saudi Arabia</SelectItem>
              <SelectItem value="kuwait">Kuwait</SelectItem>
              <SelectItem value="malaysia">Malaysia</SelectItem>
              <SelectItem value="germany">Germany</SelectItem>
              <SelectItem value="nz">New Zealand</SelectItem>
              <SelectItem value="sa">South Africa</SelectItem>
              <SelectItem value="other">Other</SelectItem>
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
          label="Transition Pathway"
          htmlFor="target-goal"
          hint="Select the Indian school system your child will be transitioning into."
        >
          <Select value={formData.targetGoal} onValueChange={(value) => onFieldChange("targetGoal", value)}>
            <SelectTrigger id="target-goal">
              <SelectValue placeholder="Which Indian school system are you preparing for?" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="india-cbse">Prepare for Indian CBSE Schools</SelectItem>
              <SelectItem value="india-igcse">Prepare for Indian IGCSE Schools</SelectItem>
              <SelectItem value="india-ib">Prepare for Indian IB Schools</SelectItem>
            </SelectContent>
          </Select>
        </QuestionCard>

        <div className="flex items-start gap-3 rounded-xl border border-secondary/20 bg-secondary/5 p-4">
          <Globe className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
          <div>
            <Label className="text-base font-semibold">Cultural Readiness for India</Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Your report will include guidance on classroom expectations, academic rigor differences, social
              adaptation, and cultural adjustment to help your child thrive in their new school environment.
            </p>
          </div>
        </div>

        <QuestionCard label="Preparation Timeline" required error={fieldErrors.timeline}>
          <TimelineSelector options={TIMELINES} value={formData.timeline} onChange={(value) => onFieldChange("timeline", value)} />
        </QuestionCard>
      </SectionContainer>
    </div>
  );
};

export default ParentStep1;
