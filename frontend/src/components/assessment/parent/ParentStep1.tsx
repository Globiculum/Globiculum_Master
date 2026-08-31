import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import locationIcon from "@/assets/icons-3d/location.png";
import parentKidsIllustration from "@/assets/bg-PARENT-PERSON.png";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  { value: "india-igcse", label: "India (IGCSE)" },
  { value: "india-ib", label: "India (IB)" },
  { value: "uae", label: "UAE" },
  { value: "singapore", label: "Singapore" },
  { value: "uk", label: "United Kingdom" },
  { value: "australia", label: "Australia" },
  { value: "canada", label: "Canada" },
  { value: "malaysia", label: "Malaysia" },
  { value: "other", label: "Other" },
];

const ParentStep1 = ({ formData, onFieldChange, fieldErrors }: ParentStepProps) => {
  // Leads with one plain yes/no question instead of an unlabeled "expand for
  // more" toggle — answering "Yes" reveals the location/prior-schools
  // fields below it. Local-only state (not part of formData): it just gates
  // what's visible, and defaults to "Yes" when there's already an answer
  // (e.g. editing a saved report) so existing data stays visible on load.
  const [hasPreviousSchool, setHasPreviousSchool] = useState<boolean | null>(
    formData.previousLocation ? true : null
  );

  // Previously a separate "Have you studied in India?" question, which
  // overlapped confusingly with this same location field (a parent picking
  // "India (CBSE)" here was then asked, redundantly, whether they'd studied
  // in India). Derived straight from previousLocation instead — no separate
  // question needed. Still written to formData.previouslyStudiedInIndia (see
  // the location Select below) so the stored field stays accurate for
  // anything that reads it later.
  const isIndiaLocation = formData.previousLocation.startsWith("india-");

  return (
    <SectionCard
      icon={locationIcon}
      title="Your child's school & transition plans."
      illustration={parentKidsIllustration}
      animated={false}
    >
      <ParentSchoolProfileWizard formData={formData} onFieldChange={onFieldChange} fieldErrors={fieldErrors} />

      <div className="mt-10 border-t border-border/60 pt-8">
        <SectionContainer title="Previous Learning">
          <p className="-mt-2 text-sm text-muted-foreground">
            Where your child studied before, and any prior schools or curricula attended — optional, this helps us understand your child&apos;s journey.
          </p>

          <QuestionCard label="Did your child attend an Indian school before?">
            <div role="radiogroup" aria-label="Did your child attend an Indian school before?" className="flex flex-wrap gap-2">
              <InputCard variant="chip" mode="radio" label="Yes" selected={hasPreviousSchool === true} onClick={() => setHasPreviousSchool(true)} />
              <InputCard variant="chip" mode="radio" label="No" selected={hasPreviousSchool === false} onClick={() => setHasPreviousSchool(false)} />
            </div>
          </QuestionCard>

          <AnimatePresence initial={false}>
            {hasPreviousSchool && (
              <motion.div
                key="previous-school-details"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                style={{ overflow: "hidden" }}
              >
                <div className="space-y-4 pt-1">
                  <QuestionCard label="Previous School Location" tooltip="Where your child was studying before their current school, if different.">
                    <Select
                      value={formData.previousLocation}
                      onValueChange={(value) => {
                        onFieldChange("previousLocation", value);
                        onFieldChange("previouslyStudiedInIndia", value.startsWith("india-") ? "yes" : "no");
                      }}
                    >
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

                  <AnimatePresence initial={false}>
                    {isIndiaLocation && (
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
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </SectionContainer>
      </div>
    </SectionCard>
  );
};

export default ParentStep1;
