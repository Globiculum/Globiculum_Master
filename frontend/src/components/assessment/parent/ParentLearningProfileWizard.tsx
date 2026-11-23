import { useLayoutEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MessageSquareText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { GlobiculumIconTile, GlobiculumStudentIcon } from "@/components/icons";
import FieldError from "../shared/FieldError";
import FlashcardShell from "../shared/FlashcardShell";
import CardNav from "../shared/CardNav";
import OptionalLabel from "../shared/OptionalLabel";
import VoiceInputButton from "../shared/VoiceInputButton";
import { LearningStyleObservations } from "../LearningStyleObservations";
import type { ParentFormData } from "./parentMapper";
import { NOTES_MAX_CHARS } from "../shared/submitAssessment";

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
// Additional Notes used to be in its own "Support" step (ParentStep4.tsx,
// now removed) and was moved in here as the last card. The cards come one
// at a time, like AcademicPathFlashcards.tsx and LanguageJourneyCard.tsx.
//
// Removed 23 Nov 2026: "Biggest Concerns" and "Preferred Support". Every
// family has all of those concerns and needs every kind of support, so a
// few ticks told us nothing. The AI never received either answer. The
// fields stay in the data model (with an empty default) so older saved
// reports still open.

type CardId = "learningStyle" | "notes";
const ORDER: CardId[] = ["learningStyle", "notes"];
const CARD_LABEL: Record<CardId, string> = {
  learningStyle: "Learning Style",
  notes: "Additional Notes",
};
// The required field each card answers (Additional Notes is optional).
const CARD_FIELD: Partial<Record<CardId, keyof ParentFormData>> = {
  learningStyle: "learningStyles",
};

interface ParentLearningProfileWizardProps {
  formData: ParentFormData;
  onFieldChange: <K extends keyof ParentFormData>(field: K, value: ParentFormData[K]) => void;
  onArrayToggle: (field: keyof ParentFormData, value: string) => void;
  fieldErrors: Record<string, string>;
  validationAttempt?: number;
  /** The page's Continue, for Next on the last card. */
  onContinue?: () => void;
}

const isAnswered = (id: CardId, formData: ParentFormData) => {
  const field = CARD_FIELD[id];
  return !field || (formData[field] as string[]).length > 0;
};

const ParentLearningProfileWizard = ({ formData, onFieldChange, onArrayToggle, fieldErrors, validationAttempt = 0, onContinue }: ParentLearningProfileWizardProps) => {
  const shouldReduceMotion = useReducedMotion() ?? false;
  // Continues where the parent left off: the first question still unanswered.
  const [cardIndex, setCardIndex] = useState(() => Math.max(0, ORDER.findIndex((id) => !isAnswered(id, formData))));

  const currentId = ORDER[cardIndex] ?? ORDER[0];
  const total = ORDER.length;
  const position = cardIndex + 1;
  const isLast = cardIndex >= total - 1;

  // After a failed Continue, open the first card with a missing answer; a
  // layout effect so the card is on screen before useScrollToFirstInvalidField
  // looks for it. Keyed on the attempt, not the errors: answering one card
  // clears its error and must not jump the parent to the next card.
  useLayoutEffect(() => {
    if (validationAttempt === 0) return;
    const first = ORDER.findIndex((id) => {
      const field = CARD_FIELD[id];
      return !!field && !!fieldErrors[field];
    });
    if (first !== -1) setCardIndex(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validationAttempt]);

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
          <FlashcardShell accent="teal" invalid={!!(CARD_FIELD[currentId] && fieldErrors[CARD_FIELD[currentId] as string])}>
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

            {currentId === "notes" && (
              <>
                <div className="relative flex flex-col items-center text-center">
                  <div className="mb-4">
                    <GlobiculumIconTile tone="violet" size={72}>
                      <MessageSquareText size={38} />
                    </GlobiculumIconTile>
                  </div>
                  <h4 className="text-xl font-bold text-foreground">
                    Additional Notes
                    <OptionalLabel />
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Anything else you&rsquo;d like us to know? We&rsquo;ll take it into account in the report.
                  </p>
                </div>
                <div className="relative mt-6">
                  <Textarea
                    id="additional-notes"
                    rows={4}
                    maxLength={NOTES_MAX_CHARS}
                    placeholder="Anything else you'd like us to know about your child's transition..."
                    value={formData.additionalNotes}
                    onChange={(e) => onFieldChange("additionalNotes", e.target.value)}
                    className="pr-12"
                  />
                  <VoiceInputButton
                    label="Say your notes"
                    onResult={(text) =>
                      onFieldChange(
                        "additionalNotes",
                        (formData.additionalNotes ? `${formData.additionalNotes} ${text}` : text).slice(0, NOTES_MAX_CHARS)
                      )
                    }
                    className="absolute right-2 top-2"
                  />
                </div>
              </>
            )}

            {/* Same Back / Next row as the School step. Next on the last
                card (the optional notes) moves on to Review. */}
            <CardNav
              onBack={cardIndex > 0 ? goBack : undefined}
              onNext={isLast ? onContinue : advance}
              nextDisabled={!isAnswered(currentId, formData)}
              nextLabel={isLast && !formData.additionalNotes.trim() ? "Skip, no notes" : "Next"}
            />
          </FlashcardShell>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ParentLearningProfileWizard;
