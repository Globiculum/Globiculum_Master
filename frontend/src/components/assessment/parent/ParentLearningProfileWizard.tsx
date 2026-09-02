import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, CircleAlert, HeartHandshake, MessageSquareText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { GlobiculumIconTile, GlobiculumStudentIcon } from "@/components/icons";
import FieldError from "../shared/FieldError";
import FlashcardShell from "../shared/FlashcardShell";
import ConcernCards from "../shared/ConcernCards";
import SupportCards from "../shared/SupportCards";
import VoiceInputButton from "../shared/VoiceInputButton";
import { LearningStyleObservations } from "../LearningStyleObservations";
import type { ParentFormData } from "./parentMapper";
import backIcon from "@/assets/icons-3d/back.png";
import nervousIcon from "@/assets/icons-3d/nervous.png";
import areasToImproveIcon from "@/assets/icons-3d/areas-to-improve.png";
import communicationIcon from "@/assets/icons-3d/communication.png";
import curriculumIcon from "@/assets/icons-3d/curriculum.png";
import emotionalWellbeingIcon from "@/assets/icons-3d/emotional-wellbeing.png";
import learningStyleIcon from "@/assets/icons-3d/learning-style.png";
import targetGradeIcon from "@/assets/icons-3d/target-grade.png";
import childProfileIcon from "@/assets/icons-3d/child-profile.png";

// Phase D: Parent Learning Profile. Originally a 4-card flashcard sequence
// (Learning Style, Typical Grade Range, Overall Performance, Strengthen for
// Indian Schooling). Three of those were redundant with data collected
// elsewhere and have been removed:
//  - "Typical Grade Range" and "Overall Performance" asked essentially the
//    same thing in different wording; the required one (Overall Performance)
//    moved to the Academic Path step as a natural lead-in to the per-subject
//    picker there — see ParentStep2.tsx / parentValidation.ts. The other
//    (never required) was dropped entirely.
//  - "Strengthen for Indian Schooling" re-asked, in different wording,
//    subjects already captured by Academic Path's per-subject confidence
//    ratings (the same "needs-help" subjects surface on Review as
//    "Challenging Subjects"). formData.strengthenGoals stays in the data
//    model for backward compatibility with older saved reports, just no
//    longer collected here.
//
// Biggest Concerns, Preferred Support, and Additional Notes used to be their
// own standalone "Support" step (ParentStep4.tsx, now removed) — folded in
// here as three more cards in this same sequence, so the Parent flow is one
// step shorter overall. Back to the sequential one-card-at-a-time pattern
// (mirroring AcademicPathFlashcards.tsx/LanguageJourneyCard.tsx) rather than
// stacking all four questions in one long scroll — each is a distinct
// multi-select question, so an explicit "Continue" per card (not
// auto-advance-on-first-pick) matches how every other multi-select card in
// this app behaves.

// Icons: each option maps to the closest fit among the existing 3D icon
// family (frontend/src/assets/icons-3d/) rather than a literal 1:1 asset
// per option — semantic accuracy took priority over per-option uniqueness,
// per explicit instruction. Every option within each grid still gets its
// own distinct icon (no repeats within a single grid).

// Consolidated from 8 options each down to 5 — several were close enough
// in meaning that offering both read as redundant rather than as genuinely
// distinct choices: Exam style shift folded into Academic rigor gap,
// Classroom culture into Peer adjustment; Finding a tutor dropped entirely
// (it overlapped with the Support section's own 1-on-1 Tutoring option,
// not really a "concern" in its own right).
const TRANSITION_CONCERNS = [
  { value: "Academic rigor gap", icon: areasToImproveIcon },
  { value: "Language barriers", icon: communicationIcon },
  { value: "Peer adjustment", icon: nervousIcon },
  { value: "Homework pressure", icon: curriculumIcon },
  { value: "Child confidence", icon: emotionalWellbeingIcon },
];

// Worksheets + Mock Tests merged into Practice & Assessment; Video Lessons
// folded into 1-on-1 Tutoring; Emergency Support folded into Parent
// Counselling.
const SUPPORT_NEEDS = [
  { value: "1-on-1 Tutoring", icon: learningStyleIcon },
  { value: "Practice & Assessment", icon: targetGradeIcon },
  { value: "Peer Study", icon: childProfileIcon },
  { value: "Progress Tracking", icon: areasToImproveIcon },
  { value: "Parent Counselling", icon: communicationIcon },
];

type CardId = "learningStyle" | "concerns" | "support" | "notes";
const ORDER: CardId[] = ["learningStyle", "concerns", "support", "notes"];
const CARD_LABEL: Record<CardId, string> = {
  learningStyle: "Learning Style",
  concerns: "Biggest Concerns",
  support: "Preferred Support",
  notes: "Additional Notes",
};

interface ParentLearningProfileWizardProps {
  formData: ParentFormData;
  onFieldChange: <K extends keyof ParentFormData>(field: K, value: ParentFormData[K]) => void;
  onArrayToggle: (field: keyof ParentFormData, value: string) => void;
  fieldErrors: Record<string, string>;
}

const ParentLearningProfileWizard = ({ formData, onFieldChange, onArrayToggle, fieldErrors }: ParentLearningProfileWizardProps) => {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const [cardIndex, setCardIndex] = useState(0);

  const currentId = ORDER[cardIndex] ?? ORDER[0];
  const total = ORDER.length;
  const position = cardIndex + 1;
  const isLast = cardIndex >= total - 1;

  const advance = () => setCardIndex((i) => Math.min(i + 1, total - 1));
  const goBack = () => setCardIndex((i) => Math.max(i - 1, 0));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5" role="img" aria-label={`Progress: ${position} of ${total}`}>
        {ORDER.map((id, idx) => (
          <span
            key={id}
            className={cn("h-1.5 flex-1 rounded-full transition-colors duration-200", idx <= cardIndex ? "bg-secondary" : "bg-muted")}
            aria-hidden="true"
          />
        ))}
      </div>
      <p className="text-xs font-medium text-muted-foreground">
        {CARD_LABEL[currentId]} · {position} of {total}
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentId}
          initial={shouldReduceMotion ? undefined : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={shouldReduceMotion ? undefined : { opacity: 0, x: -24 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          <FlashcardShell accent="teal">
            {currentId === "learningStyle" && (
              <>
                <div className="relative flex flex-col items-center text-center">
                  <div className="mb-4">
                    <GlobiculumIconTile tone="violet" size={72}>
                      <GlobiculumStudentIcon size={40} />
                    </GlobiculumIconTile>
                  </div>
                  <h4 className="text-xl font-bold text-foreground">How does your child learn best?</h4>
                </div>
                <div className="relative mt-6">
                  <LearningStyleObservations selectedStyles={formData.learningStyles} onToggle={(styleId) => onArrayToggle("learningStyles", styleId)} />
                </div>
                <FieldError message={fieldErrors.learningStyles} />
              </>
            )}

            {currentId === "concerns" && (
              <>
                <div className="relative flex flex-col items-center text-center">
                  <div className="mb-4">
                    <GlobiculumIconTile tone="amber" size={72}>
                      <CircleAlert size={38} />
                    </GlobiculumIconTile>
                  </div>
                  <h4 className="text-xl font-bold text-foreground">Biggest Concerns</h4>
                  <p className="mt-1 text-sm text-muted-foreground">What worries you most about the move?</p>
                </div>
                <div className="relative mt-6">
                  <ConcernCards options={TRANSITION_CONCERNS} selected={formData.transitionConcerns} onToggle={(value) => onArrayToggle("transitionConcerns", value)} />
                </div>
                <FieldError message={fieldErrors.transitionConcerns} />
              </>
            )}

            {currentId === "support" && (
              <>
                <div className="relative flex flex-col items-center text-center">
                  <div className="mb-4">
                    <GlobiculumIconTile tone="teal" size={72}>
                      <HeartHandshake size={38} />
                    </GlobiculumIconTile>
                  </div>
                  <h4 className="text-xl font-bold text-foreground">Preferred Support</h4>
                  <p className="mt-1 text-sm text-muted-foreground">What kind of support would help your family most?</p>
                </div>
                <div className="relative mt-6">
                  <SupportCards options={SUPPORT_NEEDS} selected={formData.supportNeeds} onToggle={(value) => onArrayToggle("supportNeeds", value)} />
                </div>
              </>
            )}

            {currentId === "notes" && (
              <>
                <div className="relative flex flex-col items-center text-center">
                  <div className="mb-4">
                    <GlobiculumIconTile tone="violet" size={72}>
                      <MessageSquareText size={38} />
                    </GlobiculumIconTile>
                  </div>
                  <h4 className="text-xl font-bold text-foreground">Additional Notes</h4>
                  <p className="mt-1 text-sm text-muted-foreground">Anything else you&rsquo;d like us to know? This one&rsquo;s optional.</p>
                </div>
                <div className="relative mt-6">
                  <Textarea
                    id="additional-notes"
                    rows={4}
                    placeholder="Anything else you'd like us to know about your child's transition..."
                    value={formData.additionalNotes}
                    onChange={(e) => onFieldChange("additionalNotes", e.target.value)}
                    className="pr-12"
                  />
                  <VoiceInputButton
                    label="Say your notes"
                    onResult={(text) => onFieldChange("additionalNotes", formData.additionalNotes ? `${formData.additionalNotes} ${text}` : text)}
                    className="absolute right-2 top-2"
                  />
                </div>
              </>
            )}

            {isLast ? (
              <p className="mt-6 flex items-center justify-center gap-1.5 text-xs font-semibold text-secondary">
                <Check className="h-3.5 w-3.5" aria-hidden="true" /> Done — use Continue below to move on
              </p>
            ) : (
              <button
                type="button"
                onClick={advance}
                className="mt-6 block w-full text-center text-xs font-medium text-secondary underline-offset-2 hover:underline"
              >
                Continue →
              </button>
            )}
          </FlashcardShell>
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={goBack}
          disabled={cardIndex === 0}
          className={cn("flex items-center gap-1 text-xs font-medium", cardIndex === 0 ? "invisible" : "text-muted-foreground hover:text-foreground")}
        >
          <img src={backIcon} className="h-3.5 w-3.5 object-contain" alt="" aria-hidden="true" draggable={false} /> Back
        </button>
        <span className="text-xs font-medium text-muted-foreground">
          {position} of {total}
        </span>
        <span className="w-10" aria-hidden="true" />
      </div>
    </div>
  );
};

export default ParentLearningProfileWizard;
