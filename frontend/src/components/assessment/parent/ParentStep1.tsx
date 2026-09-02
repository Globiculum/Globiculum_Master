import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import parentLogo from "@/assets/parentlogo.png";
import educationHistoryIcon from "@/assets/icons-3d/education-history.png";
import InputCard from "../shared/InputCard";
import SectionCard from "../shared/SectionCard";
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

const ParentStep1 = ({ formData, onFieldChange, fieldErrors }: ParentStepProps) => {
  // Leads with one plain yes/no question instead of an unlabeled "expand for
  // more" toggle — answering "Yes" reveals Prior Schools below it. Local-only
  // state (not part of formData): it just gates what's visible, and defaults
  // to "Yes" when there's already an answer (e.g. editing a saved report) so
  // existing data stays visible on load.
  //
  // The separate "Previous School Location" board picker that used to sit
  // between this question and Prior Schools was removed as redundant — Prior
  // Schools already captures country + curriculum per entry, so asking for a
  // single board here first just asked the same thing twice. Yes/No now
  // drives previousLocation/previouslyStudiedInIndia directly instead.
  const [hasPreviousSchool, setHasPreviousSchool] = useState<boolean | null>(
    formData.previousLocation ? true : null
  );

  const answerHasPreviousSchool = (value: boolean) => {
    setHasPreviousSchool(value);
    onFieldChange("previousLocation", value ? "india" : "");
    onFieldChange("previouslyStudiedInIndia", value ? "yes" : "no");
  };

  return (
    <SectionCard logo={parentLogo} title="Your child's school & transition plans.">
      <ParentSchoolProfileWizard formData={formData} onFieldChange={onFieldChange} fieldErrors={fieldErrors} />

      <div className="mt-10 rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/[0.06] to-transparent p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-3">
          <img src={educationHistoryIcon} className="h-9 w-9 shrink-0 object-contain" alt="" aria-hidden="true" draggable={false} />
          <div className="flex-1">
            <h3 className="text-base font-bold text-foreground">Previous Learning</h3>
          </div>
        </div>

        <div className="space-y-4">
          <QuestionCard label="Did your child attend an Indian school before?">
            <div role="radiogroup" aria-label="Did your child attend an Indian school before?" className="flex flex-wrap gap-2">
              <InputCard variant="chip" mode="radio" label="Yes" selected={hasPreviousSchool === true} onClick={() => answerHasPreviousSchool(true)} />
              <InputCard variant="chip" mode="radio" label="No" selected={hasPreviousSchool === false} onClick={() => answerHasPreviousSchool(false)} />
            </div>
          </QuestionCard>

          <AnimatePresence initial={false}>
            {hasPreviousSchool && (
              <motion.div
                key="education-history-list"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                style={{ overflow: "hidden" }}
              >
                <div className="pt-1">
                  <QuestionCard label="Prior Schools">
                    <p className="-mt-1 mb-3 text-sm text-muted-foreground">
                      Tell us where your child studied before and any prior schools or curricula they attended, so we can understand their journey.
                    </p>
                    <EducationHistoryList
                      entries={formData.educationHistory}
                      onChange={(entries) => onFieldChange("educationHistory", entries)}
                      currentGrade={formData.snapshotGrade}
                    />
                  </QuestionCard>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </SectionCard>
  );
};

export default ParentStep1;
