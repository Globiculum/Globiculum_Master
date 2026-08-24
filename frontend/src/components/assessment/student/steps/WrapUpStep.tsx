import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { StudentStepProps } from "./types";
import SectionCard from "../../shared/SectionCard";
import QuestionCard from "../../shared/QuestionCard";
import VoiceInputButton from "../../shared/VoiceInputButton";
import wrapupIcon from "@/assets/icons-3d/wrapup.png";
import learningStyleIcon from "@/assets/icons-3d/learning-style.png";
import curriculumIcon from "@/assets/icons-3d/curriculum.png";
import targetGradeIcon from "@/assets/icons-3d/target-grade.png";
import communicationIcon from "@/assets/icons-3d/communication.png";
import profileIcon from "@/assets/icons-3d/profile.png";
import emotionalWellbeingIcon from "@/assets/icons-3d/emotional-wellbeing.png";

// Step 3: Almost Done — the friendlier, shorter close to the Student journey.
// No study-time/grades/strongest-subjects drilling (that stays Parent-only);
// just learning style, what feels nervy about the move, and optional notes.
// Stays a single page (not a flashcard sequence, per explicit instruction to
// keep Wrap-up's structure as-is) — this pass only restyles the two option
// grids with icon badges to match the rest of the redesigned assessment.
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
];

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

const WrapUpStep = ({ formData, setField, toggleArrayField, errors }: StudentStepProps) => {
  const firstName = formData.studentName.trim();
  const title = firstName ? `Almost Done, ${firstName}!` : "Almost Done";

  return (
    <SectionCard icon={wrapupIcon} title={title} description="Just a couple more friendly questions.">
      <div className="-mt-4 text-sm text-muted-foreground">We&rsquo;ve got everything we need to build your personalized roadmap.</div>
      <QuestionCard label="Which learning style suits you best?" required tooltip="This tells us how you learn best so we can tailor recommendations for you." error={errors.learningStyles}>
        <div role="group" aria-label="Which learning style suits you best?" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
      </QuestionCard>

      <QuestionCard label="What makes you nervous?" tooltip="Let us know what feels most stressful about the move — pick as many as apply.">
        <div role="group" aria-label="What makes you nervous?" className="flex flex-wrap gap-2">
          {NERVOUSNESS_OPTIONS.map((option) => (
            <NervousnessChip
              key={option.label}
              label={option.label}
              icon={option.icon}
              tone={option.tone}
              selected={formData.nervousness.includes(option.label)}
              onClick={() => toggleArrayField("nervousness", option.label)}
            />
          ))}
        </div>
      </QuestionCard>

      <QuestionCard label="Anything else you'd like to share?" htmlFor="additional-notes" optional tooltip="Share anything else that would help us understand your situation better.">
        <div className="relative">
          <Textarea
            id="additional-notes"
            rows={4}
            placeholder="Share anything that would help us understand you better..."
            value={formData.additionalNotes}
            onChange={(e) => setField("additionalNotes", e.target.value)}
            className="pr-12"
          />
          <VoiceInputButton
            label="Say your answer"
            onResult={(text) => setField("additionalNotes", formData.additionalNotes ? `${formData.additionalNotes} ${text}` : text)}
            className="absolute right-2 top-2"
          />
        </div>
      </QuestionCard>
    </SectionCard>
  );
};

export default WrapUpStep;
