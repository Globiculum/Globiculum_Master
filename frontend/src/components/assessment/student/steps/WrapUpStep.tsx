import { useLayoutEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CircleAlert, MessageSquareText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { GlobiculumIconTile, GlobiculumStudentIcon } from "@/components/icons";
import type { StudentStepProps } from "./types";
import type { AssessmentFormData } from "../../shared/types";
import SectionCard from "../../shared/SectionCard";
import FlashcardShell from "../../shared/FlashcardShell";
import FieldError from "../../shared/FieldError";
import CardNav from "../../shared/CardNav";
import OptionalBadge from "../../shared/OptionalBadge";
import VoiceInputButton from "../../shared/VoiceInputButton";
import { NOTES_MAX_CHARS } from "../../shared/submitAssessment";
import childLogo from "@/assets/childlogo.png";
import learningStyleIcon from "@/assets/icons-3d/learning-style.png";
import curriculumIcon from "@/assets/icons-3d/curriculum.png";
import targetGradeIcon from "@/assets/icons-3d/target-grade.png";
import communicationIcon from "@/assets/icons-3d/communication.png";
import profileIcon from "@/assets/icons-3d/profile.png";
import emotionalWellbeingIcon from "@/assets/icons-3d/emotional-wellbeing.png";
import strengthsIcon from "@/assets/icons-3d/strengths.png";

// Step 3: Almost Done — the friendlier, shorter close to the Student journey.
// No study-time/grades/strongest-subjects drilling (that stays Parent-only);
// just learning style, what feels nervy about the move, and optional notes.
// One question per card, with Back and Next in each, the same as the Parent
// Learning Profile step. It used to be a single page; changed 11 Nov 2026 at
// the user's request to give the student form the parent form's treatment.
// Every value/field/toggleArrayField call below is unchanged.

type Tone = "teal" | "violet" | "mint" | "amber";

const TONE_TEXT: Record<Tone, string> = {
  teal: "text-secondary",
  violet: "text-violet",
  mint: "text-mint-foreground",
  amber: "text-accent-contrast",
};

const TONE_BADGE: Record<Tone, string> = {
  teal: cn("bg-secondary/15", TONE_TEXT.teal),
  violet: cn("bg-violet/15", TONE_TEXT.violet),
  mint: cn("bg-mint/25", TONE_TEXT.mint),
  amber: cn("bg-accent/15", TONE_TEXT.amber),
};

const LEARNING_STYLES: { value: string; title: string; description: string; icon: string; tone: Tone }[] = [
  { value: "structured-repetition", title: "Clear Steps & Practice", description: "I like clear steps and practice", icon: learningStyleIcon, tone: "teal" },
  { value: "exploration-discussion", title: "Explore & Discuss", description: "I like exploring ideas and talking them through", icon: learningStyleIcon, tone: "violet" },
  { value: "visual-demonstrations", title: "Visual Learning", description: "I like pictures, diagrams and videos", icon: learningStyleIcon, tone: "mint" },
  { value: "problem-solving-application", title: "Hands-on Problem Solving", description: "I like solving problems hands-on", icon: learningStyleIcon, tone: "amber" },
];

const NERVOUSNESS_OPTIONS: { label: string; icon: string; tone: Tone }[] = [
  { label: "New subjects", icon: curriculumIcon, tone: "teal" },
  { label: "Different tests", icon: targetGradeIcon, tone: "violet" },
  { label: "New language", icon: communicationIcon, tone: "mint" },
  { label: "Making friends", icon: profileIcon, tone: "violet" },
  { label: "Everything feels new", icon: emotionalWellbeingIcon, tone: "amber" },
  { label: "Not really nervous", icon: strengthsIcon, tone: "teal" },
];

// The question is required, so a student with no worries needs an answer too;
// it can't be combined with the others.
const NOT_NERVOUS = "Not really nervous";

const LearningStyleCard = ({
  title,
  description,
  icon,
  tone,
  selected,
  onClick,
}: {
  title: string;
  description: string;
  icon: string;
  tone: Tone;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={selected}
    onClick={onClick}
    className={cn(
      "flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-colors duration-200",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      selected ? "border-secondary bg-secondary/5 shadow-glow-sm" : "border-border bg-card hover:border-secondary/40"
    )}
  >
    <span className={cn("flex h-11 w-11 items-center justify-center rounded-full", TONE_BADGE[tone])}>
      <img src={icon} className="h-5 w-5 object-contain" alt="" aria-hidden="true" draggable={false} />
    </span>
    <span className="text-sm font-bold text-foreground">{title}</span>
    <span className="text-xs text-muted-foreground">{description}</span>
  </button>
);

const NervousnessChip = ({
  label,
  icon,
  tone,
  selected,
  onClick,
}: {
  label: string;
  icon: string;
  tone: Tone;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={selected}
    onClick={onClick}
    className={cn(
      "flex min-w-[104px] flex-1 flex-col items-center gap-2 rounded-xl border-2 px-3 py-4 text-center transition-colors duration-200",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      selected ? "border-secondary bg-secondary/5" : "border-border bg-card hover:border-secondary/40"
    )}
  >
    <img src={icon} className={cn("h-6 w-6 object-contain", TONE_TEXT[tone])} alt="" aria-hidden="true" draggable={false} />
    <span className="text-xs font-medium text-foreground">{label}</span>
  </button>
);

type CardId = "learningStyle" | "nervousness" | "notes";
const ORDER: CardId[] = ["learningStyle", "nervousness", "notes"];
const CARD_LABEL: Record<CardId, string> = {
  learningStyle: "Learning Style",
  nervousness: "What Makes You Nervous",
  notes: "Anything Else",
};
// The required field each card answers (the notes are optional).
const CARD_FIELD: Partial<Record<CardId, "learningStyles" | "nervousness">> = {
  learningStyle: "learningStyles",
  nervousness: "nervousness",
};
const isAnswered = (id: CardId, formData: AssessmentFormData) => {
  const field = CARD_FIELD[id];
  return !field || formData[field].length > 0;
};

const WrapUpStep = ({ formData, setField, toggleArrayField, errors, validationAttempt = 0, onContinue }: StudentStepProps) => {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const firstName = formData.studentName.trim();
  const title = firstName ? `Almost Done, ${firstName}!` : "Almost Done";

  // Continues where the student left off: the first question still unanswered.
  const [cardIndex, setCardIndex] = useState(() => Math.max(0, ORDER.findIndex((id) => !isAnswered(id, formData))));
  const currentId = ORDER[cardIndex] ?? ORDER[0];
  const isLast = cardIndex >= ORDER.length - 1;

  // A failed Continue opens the first card with a missing answer.
  useLayoutEffect(() => {
    if (validationAttempt === 0) return;
    const first = ORDER.findIndex((id) => {
      const field = CARD_FIELD[id];
      return !!field && !!errors[field];
    });
    if (first !== -1) setCardIndex(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the attempt, not on every answer
  }, [validationAttempt]);

  const cardField = CARD_FIELD[currentId];
  const cardError = cardField ? errors[cardField] : undefined;

  const toggleNervousness = (label: string) => {
    const current = formData.nervousness;
    if (current.includes(label)) {
      setField("nervousness", current.filter((l) => l !== label));
    } else {
      setField("nervousness", label === NOT_NERVOUS ? [label] : [...current.filter((l) => l !== NOT_NERVOUS), label]);
    }
  };

  const cardHeader = (icon: JSX.Element, tone: "violet" | "amber", heading: string, sub?: string, optional = false) => (
    <div className="flex flex-col items-center text-center">
      <div className="mb-4">
        <GlobiculumIconTile tone={tone} size={72}>
          {icon}
        </GlobiculumIconTile>
      </div>
      <h4 className="text-xl font-bold text-foreground">
        {heading}
        {optional && <OptionalBadge />}
      </h4>
      {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
    </div>
  );

  return (
    <SectionCard logo={childLogo} title={title} description="Just a couple more friendly questions.">
      <div className="-mt-4 text-sm text-muted-foreground">We&rsquo;ve got everything we need to build your personalized roadmap.</div>

      <div className="space-y-3">
        <div className="flex items-center gap-1.5" role="img" aria-label={`Progress: ${cardIndex + 1} of ${ORDER.length}`}>
          {ORDER.map((id, idx) => (
            <span
              key={id}
              className={cn("h-1.5 flex-1 rounded-full transition-colors duration-200", idx <= cardIndex ? "bg-secondary" : "bg-muted")}
              aria-hidden="true"
            />
          ))}
        </div>
        <p className="text-xs font-medium text-muted-foreground">
          {CARD_LABEL[currentId]} · {cardIndex + 1} of {ORDER.length}
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentId}
            initial={shouldReduceMotion ? undefined : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <FlashcardShell accent="teal" invalid={!!cardError}>
              {currentId === "learningStyle" && (
                <>
                  {cardHeader(<GlobiculumStudentIcon size={40} />, "violet", "Which learning style suits you best?", "Pick as many as sound like you.")}
                  <div role="group" aria-label="Which learning style suits you best?" className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {LEARNING_STYLES.map((style) => (
                      <LearningStyleCard
                        key={style.value}
                        title={style.title}
                        description={style.description}
                        icon={style.icon}
                        tone={style.tone}
                        selected={formData.learningStyles.includes(style.value)}
                        onClick={() => toggleArrayField("learningStyles", style.value)}
                      />
                    ))}
                  </div>
                </>
              )}

              {currentId === "nervousness" && (
                <>
                  {cardHeader(<CircleAlert size={38} />, "amber", "What makes you nervous?", "About the move. Pick as many as apply.")}
                  <div role="group" aria-label="What makes you nervous?" className="mt-6 flex flex-wrap gap-2">
                    {NERVOUSNESS_OPTIONS.map((option) => (
                      <NervousnessChip
                        key={option.label}
                        label={option.label}
                        icon={option.icon}
                        tone={option.tone}
                        selected={formData.nervousness.includes(option.label)}
                        onClick={() => toggleNervousness(option.label)}
                      />
                    ))}
                  </div>
                </>
              )}

              {currentId === "notes" && (
                <>
                  {cardHeader(
                    <MessageSquareText size={38} />,
                    "violet",
                    "Anything else you'd like to share?",
                    "Share anything that would help us understand your situation. We'll take it into account in your report.",
                    true
                  )}
                  <div className="relative mt-6">
                    <Textarea
                      id="additional-notes"
                      rows={4}
                      maxLength={NOTES_MAX_CHARS}
                      placeholder="Share anything that would help us understand you better..."
                      value={formData.additionalNotes}
                      onChange={(e) => setField("additionalNotes", e.target.value)}
                      className="pr-12"
                    />
                    <VoiceInputButton
                      label="Say your answer"
                      onResult={(text) =>
                        setField("additionalNotes", (formData.additionalNotes ? `${formData.additionalNotes} ${text}` : text).slice(0, NOTES_MAX_CHARS))
                      }
                      className="absolute right-2 top-2"
                    />
                  </div>
                </>
              )}

              <FieldError message={cardError} />
              {/* Same Back / Next row as the other steps. Next on the last
                  card (the optional notes) moves on to Review. */}
              <CardNav
                onBack={cardIndex > 0 ? () => setCardIndex((i) => Math.max(i - 1, 0)) : undefined}
                onNext={isLast ? onContinue : () => setCardIndex((i) => Math.min(i + 1, ORDER.length - 1))}
                nextDisabled={!isAnswered(currentId, formData)}
                nextLabel={isLast && !formData.additionalNotes.trim() ? "Skip, no notes" : "Next"}
              />
            </FlashcardShell>
          </motion.div>
        </AnimatePresence>
      </div>
    </SectionCard>
  );
};

export default WrapUpStep;
