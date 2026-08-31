import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import profileIcon from "@/assets/icons-3d/profile.png";
import educationHistoryIcon from "@/assets/icons-3d/education-history.png";
import parentKidsIllustration from "@/assets/bg-PARENT-PERSON.png";
import type { StudentStepProps } from "./types";
import SectionCard from "../../shared/SectionCard";
import QuestionCard from "../../shared/QuestionCard";
import InputCard from "../../shared/InputCard";
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

const StudentProfileStep = ({ formData, setField, errors }: StudentStepProps) => {
  // Leads with one plain yes/no question instead of jumping straight to a
  // location field — answering "Yes" reveals Prior Schools below it.
  // Local-only state (not part of formData): it just gates what's visible,
  // and defaults to "Yes" when there's already an answer (e.g. editing a
  // saved report) so existing data stays visible on load.
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
    setField("previousLocation", value ? "india" : "");
    setField("previouslyStudiedInIndia", value ? "yes" : "no");
  };

  return (
    <SectionCard
      icon={profileIcon}
      title="Let's get to know you."
      description="Tell us a little about yourself before we begin."
      illustration={parentKidsIllustration}
      animated={false}
    >
      <StudentProfileWizard formData={formData} setField={setField} errors={errors} />

      <span id="student-profile-next-section" className="sr-only" aria-hidden="true" />

      {/* Visually separated from the core wizard above — an optional
          continuation of the student's story, not another required step. */}
      <div className="mt-10 rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/[0.06] to-transparent p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-3">
          <img src={educationHistoryIcon} className="h-9 w-9 shrink-0 object-contain" alt="" aria-hidden="true" draggable={false} />
          <div className="flex-1">
            <h3 className="text-base font-bold text-foreground">
              Previous Learning <span className="ml-1.5 text-xs font-normal text-muted-foreground">(Optional)</span>
            </h3>
          </div>
        </div>

        <div className="space-y-4">
          <QuestionCard label="Did you attend an Indian school before?">
            <div role="radiogroup" aria-label="Did you attend an Indian school before?" className="flex flex-wrap gap-2">
              <InputCard mode="radio" label="Yes" selected={hasPreviousSchool === true} onClick={() => answerHasPreviousSchool(true)} />
              <InputCard mode="radio" label="No" selected={hasPreviousSchool === false} onClick={() => answerHasPreviousSchool(false)} />
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
                      Tell us where you studied before and any prior schools or curricula you attended, so we can understand your journey.
                    </p>
                    <EducationHistoryList
                      entries={formData.educationHistory}
                      onChange={(entries) => setField("educationHistory", entries)}
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

export default StudentProfileStep;
