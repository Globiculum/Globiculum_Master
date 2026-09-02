import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GlobiculumChecklistIcon, GlobiculumEducationIcon, GlobiculumGlobeIcon, GlobiculumIconTile } from "@/components/icons";
import InputCard from "../../shared/InputCard";
import FlashcardShell from "../../shared/FlashcardShell";
import type { AssessmentFormData } from "../../shared/types";
import backIcon from "@/assets/icons-3d/back.png";

// Two cards now, not four: Indian Languages is a select-then-rate
// multi-select (pick every language that applies from one chip grid, then a
// compact proficiency row appears only for what's selected) — same pattern
// as Foreign Language's own select-then-rate card, just multi- instead of
// single-select. Replaces the old one-flashcard-per-language sequence
// (separate Hindi/Sanskrit/Other Indian languages cards), which took more
// space and more taps than picking from a grid. Indian-language exposure
// (selectedLanguages[] + languageProficiencies{}) and foreign-language study
// (foreignLanguageName/foreignLanguageNameOther/foreignLanguageLevel) stay
// two separate fields internally, unchanged.

const INDIAN_LANGUAGES = ["Hindi", "Sanskrit", "Bengali", "Tamil", "Telugu", "Kannada"];

const INDIAN_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "fluent", label: "Fluent" },
];

const FOREIGN_LANGUAGE_CHIPS = [
  { value: "spanish", label: "Spanish" },
  { value: "french", label: "French" },
];

const FOREIGN_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const foreignLabel = (formData: AssessmentFormData): string =>
  formData.foreignLanguageName === "other"
    ? formData.foreignLanguageNameOther || "Other language"
    : FOREIGN_LANGUAGE_CHIPS.find((f) => f.value === formData.foreignLanguageName)?.label ?? formData.foreignLanguageName;

type CardId = "indian" | "foreign";
const ORDER: CardId[] = ["indian", "foreign"];
const CARD_LABEL: Record<CardId, string> = { indian: "Indian Languages", foreign: "Foreign Language" };

const LevelButton = ({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) => (
  <motion.button
    type="button"
    role="radio"
    aria-checked={selected}
    onClick={onSelect}
    whileHover={{ y: -2 }}
    whileTap={{ scale: 0.96 }}
    transition={{ type: "spring", stiffness: 420, damping: 18 }}
    className={cn(
      "rounded-full border-2 px-3 py-1.5 text-xs font-semibold transition-colors duration-200",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      selected ? "border-secondary bg-secondary text-secondary-foreground shadow-glow-sm" : "border-border bg-card text-foreground hover:border-secondary/40"
    )}
  >
    {selected && <Check className="mr-1 inline h-3 w-3" aria-hidden="true" />}
    {label}
  </motion.button>
);

interface LanguageJourneyCardProps {
  formData: AssessmentFormData;
  setField: <K extends keyof AssessmentFormData>(field: K, value: AssessmentFormData[K]) => void;
  setRecordField: (field: "languageProficiencies", key: string, value: string) => void;
}

const LanguageJourneyCard = ({ formData, setField, setRecordField }: LanguageJourneyCardProps) => {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const customIndianLanguages = formData.selectedLanguages.filter((l) => !INDIAN_LANGUAGES.includes(l));
  const hasForeign = !!formData.foreignLanguageName;

  const hasExistingAnswers = formData.selectedLanguages.length > 0 || hasForeign;

  const [phase, setPhase] = useState<"cards" | "summary">(hasExistingAnswers ? "summary" : "cards");
  const [cardIndex, setCardIndex] = useState(0);
  const [showOtherIndianInput, setShowOtherIndianInput] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [showForeignOtherInput, setShowForeignOtherInput] = useState(formData.foreignLanguageName === "other");
  const [editingSingleCard, setEditingSingleCard] = useState(false);

  const currentId = ORDER[cardIndex] ?? ORDER[0];
  const total = ORDER.length;
  const position = cardIndex + 1;

  const advance = () => {
    const isLast = cardIndex >= total - 1 || editingSingleCard;
    if (isLast) {
      setEditingSingleCard(false);
      setPhase("summary");
    } else {
      setCardIndex((i) => i + 1);
    }
  };

  const toggleIndianLanguage = (lang: string) => {
    if (formData.selectedLanguages.includes(lang)) {
      setField("selectedLanguages", formData.selectedLanguages.filter((l) => l !== lang));
    } else {
      setField("selectedLanguages", [...formData.selectedLanguages, lang]);
    }
  };

  const rateIndianLanguage = (lang: string, level: string) => {
    setRecordField("languageProficiencies", lang, level);
  };

  const addCustomIndianLanguage = () => {
    const trimmed = draftName.trim();
    if (!trimmed) return;
    if (!formData.selectedLanguages.includes(trimmed)) {
      setField("selectedLanguages", [...formData.selectedLanguages, trimmed]);
    }
    setDraftName("");
  };

  const removeCustomIndianLanguage = (lang: string) => {
    setField("selectedLanguages", formData.selectedLanguages.filter((l) => l !== lang));
  };

  // Single-select: picking a new foreign language replaces the old pick;
  // picking the same one again clears it — foreignLanguageName can only
  // ever hold one value.
  const selectForeignLanguage = (value: string) => {
    if (formData.foreignLanguageName === value) {
      setField("foreignLanguageName", "");
      setField("foreignLanguageLevel", "");
      setShowForeignOtherInput(false);
      return;
    }
    setField("foreignLanguageName", value);
    setField("foreignLanguageLevel", "");
    setShowForeignOtherInput(value === "other");
  };

  const selectForeignLevel = (level: string) => {
    setField("foreignLanguageLevel", level);
  };

  const skipForeign = () => {
    setField("foreignLanguageName", "");
    setField("foreignLanguageLevel", "");
    setShowForeignOtherInput(false);
    advance();
  };

  const goBackOneCard = () => {
    if (cardIndex === 0) return;
    setEditingSingleCard(false);
    setCardIndex((i) => Math.max(0, i - 1));
  };

  const goToSummary = () => setPhase("summary");

  const editCard = (id: CardId) => {
    setEditingSingleCard(true);
    setPhase("cards");
    setCardIndex(ORDER.indexOf(id));
  };

  const navItems = ORDER.map((id, idx) => {
    const answered = id === "indian" ? formData.selectedLanguages.length > 0 : hasForeign;
    const status = answered ? "completed" : phase === "summary" ? "skipped" : idx === cardIndex ? "current" : idx < cardIndex ? "skipped" : "upcoming";
    return { id, label: CARD_LABEL[id], status, onClick: status === "completed" || status === "skipped" ? () => editCard(id) : undefined };
  });

  if (phase === "summary") {
    const totalSelected = formData.selectedLanguages.length + (hasForeign ? 1 : 0);

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Language Exposure</span>
          <button type="button" onClick={goToSummary} className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
            ← Back
          </button>
        </div>

        <FlashcardShell>
          <div className="flex flex-col items-center text-center">
            <div className="mb-3">
              <GlobiculumIconTile tone="teal" size={52}>
                <GlobiculumChecklistIcon size={28} />
              </GlobiculumIconTile>
            </div>
            <h3 className="text-lg font-bold text-foreground">Language Exposure is ready</h3>
          </div>

          {totalSelected === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No additional language exposure.</p>
          ) : (
            <div className="mt-5 space-y-1.5">
              {formData.selectedLanguages.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => editCard("indian")}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-left transition-colors hover:bg-muted"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Check className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
                    {lang}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {INDIAN_LEVELS.find((lv) => lv.value === formData.languageProficiencies[lang])?.label ?? "—"}
                  </span>
                </button>
              ))}
              {hasForeign && (
                <button
                  type="button"
                  onClick={() => editCard("foreign")}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-left transition-colors hover:bg-muted"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Check className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
                    {foreignLabel(formData)}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {FOREIGN_LEVELS.find((lv) => lv.value === formData.foreignLanguageLevel)?.label ?? "—"}
                  </span>
                </button>
              )}
            </div>
          )}
        </FlashcardShell>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <nav aria-label="Language exposure progress" className="hidden lg:block lg:w-[232px] lg:shrink-0">
        <div className="lg:sticky lg:top-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Language Exposure</h3>
          <ol className="mt-3">
            {navItems.map((item, i) => (
              <li key={item.id} className="relative pb-3 last:pb-0">
                {i !== navItems.length - 1 && (
                  <span
                    className={cn("absolute left-[9px] top-6 h-full w-0.5", item.status === "completed" || item.status === "skipped" ? "bg-secondary" : "bg-border")}
                    aria-hidden="true"
                  />
                )}
                {item.onClick ? (
                  <button type="button" onClick={item.onClick} className="relative z-10 flex w-full items-center gap-2.5 rounded-lg p-0.5 text-left transition-colors hover:bg-muted/40">
                    <span
                      className={cn(
                        "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2",
                        item.status === "completed" ? "border-secondary bg-secondary text-secondary-foreground" : "border-border bg-card"
                      )}
                    >
                      {item.status === "completed" && <Check className="h-3 w-3" aria-hidden="true" />}
                      {item.status === "skipped" && <Minus className="h-2.5 w-2.5" aria-hidden="true" />}
                    </span>
                    <span className={cn("block truncate text-sm", item.status === "completed" ? "font-medium text-secondary" : "text-muted-foreground")}>{item.label}</span>
                  </button>
                ) : (
                  <div className="relative z-10 flex items-center gap-2.5 rounded-lg p-0.5">
                    <span
                      className={cn(
                        "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2",
                        item.status === "current" ? "border-violet bg-violet" : "border-border bg-card"
                      )}
                    >
                      {item.status === "current" && <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />}
                    </span>
                    <span className={cn("block truncate text-sm", item.status === "current" ? "font-semibold text-foreground" : "text-muted-foreground")}>{item.label}</span>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      </nav>

      <div className="min-w-0 flex-1 space-y-3">
        <div className="mb-1 flex items-center gap-1.5 lg:hidden" role="img" aria-label={`Progress: ${position} of ${total}`}>
          {navItems.map((item) => (
            <span
              key={item.id}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-200",
                (item.status === "completed" || item.status === "skipped") && "bg-secondary",
                item.status === "current" && "bg-violet",
                item.status === "upcoming" && "bg-muted"
              )}
              aria-hidden="true"
            />
          ))}
        </div>
        <p className="text-xs font-medium text-muted-foreground lg:hidden">
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
            <FlashcardShell accent="violet">
              {currentId === "indian" && (
                <>
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-4">
                      <GlobiculumIconTile tone="teal" size={64}>
                        <GlobiculumEducationIcon size={34} />
                      </GlobiculumIconTile>
                    </div>
                    <h4 className="text-xl font-bold text-foreground">Which Indian languages do you know?</h4>
                  </div>

                  <div role="group" aria-label="Indian languages" className="mt-6 flex flex-wrap justify-center gap-2">
                    {INDIAN_LANGUAGES.map((lang) => (
                      <InputCard
                        key={lang}
                        variant="chip"
                        label={lang}
                        selected={formData.selectedLanguages.includes(lang)}
                        onClick={() => toggleIndianLanguage(lang)}
                      />
                    ))}
                    <InputCard
                      variant="chip"
                      label="Other"
                      selected={showOtherIndianInput}
                      onClick={() => setShowOtherIndianInput((v) => !v)}
                    />
                  </div>

                  {showOtherIndianInput && (
                    <div className="mx-auto mt-3 flex max-w-xs gap-2">
                      <Input
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCustomIndianLanguage();
                          }
                        }}
                        placeholder="e.g. Bhojpuri, Tulu, Rajasthani"
                        aria-label="Other Indian language name"
                      />
                      <button
                        type="button"
                        onClick={addCustomIndianLanguage}
                        disabled={!draftName.trim()}
                        className="shrink-0 rounded-xl border-2 border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors duration-200 hover:border-secondary/40 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Add
                      </button>
                    </div>
                  )}

                  {customIndianLanguages.length > 0 && (
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      {customIndianLanguages.map((lang) => (
                        <span key={lang} className="inline-flex items-center gap-1.5 rounded-full border-2 border-secondary bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary">
                          {lang}
                          <button type="button" onClick={() => removeCustomIndianLanguage(lang)} aria-label={`Remove ${lang}`} className="rounded-full p-0.5 hover:bg-secondary/20">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {formData.selectedLanguages.length > 0 && (
                    <div className="mt-5 space-y-1.5">
                      <p className="text-center text-sm font-medium text-muted-foreground">How familiar are you with each?</p>
                      {formData.selectedLanguages.map((lang) => (
                        <div key={lang} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/50 px-3 py-2.5">
                          <span className="text-base font-bold text-foreground">{lang}</span>
                          <Select value={formData.languageProficiencies[lang]} onValueChange={(value) => rateIndianLanguage(lang, value)}>
                            <SelectTrigger
                              className="h-8 w-auto min-w-[132px] gap-1.5 rounded-full border-none bg-muted/60 px-3 text-sm font-semibold text-secondary shadow-none hover:bg-muted"
                              aria-label={`${lang} familiarity`}
                            >
                              <SelectValue placeholder="Rate familiarity" />
                            </SelectTrigger>
                            <SelectContent>
                              {INDIAN_LEVELS.map((level) => (
                                <SelectItem key={level.value} value={level.value}>
                                  {level.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={advance}
                    className="mt-5 block w-full text-center text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  >
                    {formData.selectedLanguages.length > 0 ? "Continue →" : "I don't know any Indian languages →"}
                  </button>
                </>
              )}

              {currentId === "foreign" && (
                <>
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-4">
                      <GlobiculumIconTile tone="teal" size={64}>
                        <GlobiculumGlobeIcon size={34} />
                      </GlobiculumIconTile>
                    </div>
                    <h4 className="text-xl font-bold text-foreground">Studying a foreign language?</h4>
                  </div>

                  <div role="radiogroup" aria-label="Foreign language" className="mt-6 flex flex-wrap justify-center gap-2">
                    {FOREIGN_LANGUAGE_CHIPS.map((opt) => (
                      <InputCard
                        key={opt.value}
                        variant="chip"
                        mode="radio"
                        label={opt.label}
                        selected={formData.foreignLanguageName === opt.value}
                        onClick={() => selectForeignLanguage(opt.value)}
                      />
                    ))}
                    <InputCard variant="chip" mode="radio" label="Other" selected={formData.foreignLanguageName === "other"} onClick={() => selectForeignLanguage("other")} />
                  </div>

                  {showForeignOtherInput && (
                    <Input
                      className="mx-auto mt-3 max-w-xs"
                      placeholder="Enter language name"
                      value={formData.foreignLanguageNameOther}
                      onChange={(e) => setField("foreignLanguageNameOther", e.target.value)}
                    />
                  )}

                  {formData.foreignLanguageName && (
                    <>
                      <p className="mb-2 mt-5 text-center text-xs font-medium text-muted-foreground">What&rsquo;s your level?</p>
                      <div role="radiogroup" aria-label="Foreign language level" className="flex flex-wrap justify-center gap-2">
                        {FOREIGN_LEVELS.map((level) => (
                          <LevelButton key={level.value} label={level.label} selected={formData.foreignLanguageLevel === level.value} onSelect={() => selectForeignLevel(level.value)} />
                        ))}
                      </div>
                    </>
                  )}

                  <button type="button" onClick={skipForeign} className="mt-4 block w-full text-center text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
                    I&rsquo;m not studying a foreign language
                  </button>

                  {formData.foreignLanguageName && formData.foreignLanguageLevel && (
                    <button type="button" onClick={advance} className="mt-2 block w-full text-center text-xs font-medium text-secondary underline-offset-2 hover:underline">
                      Continue →
                    </button>
                  )}
                </>
              )}
            </FlashcardShell>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={goBackOneCard}
            disabled={cardIndex === 0}
            className={cn("flex items-center gap-1 text-xs font-medium", cardIndex === 0 ? "invisible" : "text-muted-foreground hover:text-foreground")}
          >
            <img src={backIcon} className="h-3.5 w-3.5 object-contain" alt="" aria-hidden="true" draggable={false} /> Back
          </button>
          <span className="text-xs font-medium text-muted-foreground lg:hidden">
            {position} of {total}
          </span>
          <span className="w-10" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
};

export default LanguageJourneyCard;
