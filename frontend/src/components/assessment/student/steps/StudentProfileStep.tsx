import { AnimatePresence, motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GlobiculumEducationIcon } from "@/components/icons";
import profileIcon from "@/assets/icons-3d/profile.png";
import type { StudentStepProps } from "./types";
import SectionCard from "../../shared/SectionCard";
import QuestionCard from "../../shared/QuestionCard";
import InputCard from "../../shared/InputCard";
import SectionContainer from "../../shared/SectionContainer";
import EducationHistoryList from "../../shared/EducationHistoryList";
import StudentProfileWizard from "./StudentProfileWizard";

// Step 1: Student Profile.
// The "core snapshot" fields (name, school stage, grade, country, state,
// curriculum, target board, target grade, timeline) are collected by
// StudentProfileWizard as a one-question-at-a-time flow. Education History
// stays a static section here, unchanged — mirrors how AcademicPathFlashcards
// leaves Language Exposure static below itself in AcademicProfileStep.tsx.
// Reuses the existing backend field vocabulary (schoolStage, snapshotGrade,
// snapshotLocation, usState, currentCurriculum, targetGoal, timeline) so
// this step's output is already compatible with validate-student-data /
// analyze-curriculum without any transformation layer.

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
  return (
    <SectionCard icon={profileIcon} title="Let's get to know you." description="Tell us a little about yourself before we begin.">
      <StudentProfileWizard formData={formData} setField={setField} errors={errors} />

      <span id="student-profile-next-section" className="sr-only" aria-hidden="true" />

      {/* Visually separated from the core wizard above — an optional
          continuation of the student's story, not another required step. */}
      <div className="mt-10 border-t border-border/60 pt-8">
        <SectionContainer title="Previous Learning" description="Where you studied before, and any prior schools or curricula attended.">
          <div className="-mt-2 flex items-center gap-2">
            <GlobiculumEducationIcon size={20} />
            <p className="text-sm text-muted-foreground">Optional — this helps us understand your journey.</p>
          </div>

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
      </div>
    </SectionCard>
  );
};

export default StudentProfileStep;
