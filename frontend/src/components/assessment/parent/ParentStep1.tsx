import { AnimatePresence, motion } from "framer-motion";
import locationIcon from "@/assets/icons-3d/location.png";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GlobiculumEducationIcon } from "@/components/icons";
import InputCard from "../shared/InputCard";
import SectionCard from "../shared/SectionCard";
import SectionContainer from "../shared/SectionContainer";
import QuestionCard from "../shared/QuestionCard";
import EducationHistoryList from "../shared/EducationHistoryList";
import ParentSchoolProfileWizard from "./ParentSchoolProfileWizard";
import type { ParentStepProps } from "./types";

// Step 1: School Profile.
//
// Phase C: the "core snapshot" fields (child's name, school stage, grade,
// age, country, state, curriculum, target board, target grade, timeline)
// are collected by ParentSchoolProfileWizard as a one-question-at-a-time
// flow, mirroring StudentProfileStep.tsx's own split — Education History
// stays a static section here, unchanged, exactly like Student's own
// "Previous Learning" section.

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

const ParentStep1 = ({ formData, onFieldChange, fieldErrors }: ParentStepProps) => {
  return (
    <SectionCard icon={locationIcon} title="Let's get to know your child." description="Tell us about your child's school and transition plans.">
      <ParentSchoolProfileWizard formData={formData} onFieldChange={onFieldChange} fieldErrors={fieldErrors} />

      <div className="mt-10 border-t border-border/60 pt-8">
        <SectionContainer title="Previous Learning" description="Where your child studied before, and any prior schools or curricula attended.">
          <div className="-mt-2 flex items-center gap-2">
            <GlobiculumEducationIcon size={20} />
            <p className="text-sm text-muted-foreground">Optional — this helps us understand your child's journey.</p>
          </div>

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
      </div>
    </SectionCard>
  );
};

export default ParentStep1;
