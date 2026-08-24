import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Minus, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { GlobiculumChecklistIcon, GlobiculumEducationIcon, GlobiculumGlobeIcon, GlobiculumIconTile } from "@/components/icons";
import InputCard from "../../shared/InputCard";
import FlashcardShell from "../../shared/FlashcardShell";
import type { AssessmentFormData } from "../../shared/types";
import editIcon from "@/assets/icons-3d/edit.png";
import backIcon from "@/assets/icons-3d/back.png";

// Revision: Language Exposure as a one-flashcard-per-language sequence,
// mirroring AcademicPathFlashcards.tsx's per-subject pattern exactly (own
// nav panel, mobile progress dots, single active card, custom-item card,
// summary/edit phase). Indian-language exposure (selectedLanguages[] +
// languageProficiencies{}) and foreign-language study
// (foreignLanguageName/foreignLanguageNameOther/foreignLanguageLevel) stay
// two separate fields internally, unchanged — Indian is array-backed
// (multiple languages can be rated), Foreign is single-value (only one
// foreign language is ever stored), so its card picks-and-rates in one
// step instead of getting its own per-language card the way Hindi/Sanskrit
// do. Only Hindi and Sanskrit get dedicated cards; every other Indian
// language is reachable through the trailing "Other" custom card, and
// French/Spanish are the only two direct foreign-language chips, with
// every other language reachable the same way — a deliberate narrowing of
// the visible preset list, not a change to what can be stored.

const INDIAN_LANGUAGE_CARDS = ["Hindi", "Sanskrit"];

const INDIAN_LEVELS = [
  { value: "none", label: "No Exposure" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "fluent", label: "Fluent" },
  { value: "native", label: "Native" },
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

type CardId = "hindi" | "sanskrit" | "otherIndian" | "foreign";
const ORDER: CardId[] = ["hindi", "sanskrit", "otherIndian", "foreign"];

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
      "flex items-center gap-1.5 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-colors duration-200",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      selected ? "border-secondary bg-secondary text-secondary-foreground shadow-glow-sm" : "border-border bg-card text-foreground hover:border-secondary/40"
    )}
  >
    {selected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
    {label}
  </motion.button>
);

interface LanguageJourneyCardProps {
  formData: AssessmentFormData;
  setField: <K extends keyof AssessmentFormData>(field: K, value: AssessmentFormData[K]) => void;
  setRecordField: (field: "languageProficiencies", key: string, value: string) => void;
}

const ADVANCE_DELAY_MS = 420;

const LanguageJourneyCard = ({ formData, setField, setRecordField }: LanguageJourneyCardProps) => {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const customIndianLanguages = formData.selectedLanguages.filter((l) => !INDIAN_LANGUAGE_CARDS.includes(l));
  const hasForeign = !!formData.foreignLanguageName;

  const hasExistingAnswers = formData.selectedLanguages.length > 0 || hasForeign;

  const [phase, setPhase] = useState<"cards" | "summary">(hasExistingAnswers ? "summary" : "cards");
  const [cardIndex, setCardIndex] = useState(0);
  const [draftName, setDraftName] = useState("");
  const [showForeignOtherInput, setShowForeignOtherInput] = useState(formData.foreignLanguageName === "other");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [editingSingleCard, setEditingSingleCard] = useState(false);

  const currentId = ORDER[cardIndex] ?? ORDER[0];
  const total = ORDER.length;
  const position = cardIndex + 1;

  const advance = () => {
    setIsTransitioning(true);
    const isLast = cardIndex >= total - 1 || editingSingleCard;
    window.setTimeout(
      () => {
        setIsTransitioning(false);
        if (isLast) {
          setEditingSingleCard(false);
          setPhase("summary");
        } else {
          setCardIndex((i) => i + 1);
        }
      },
      shouldReduceMotion ? 0 : ADVANCE_DELAY_MS
    );
  };

  const rateIndianLanguage = (lang: string, level: string) => {
    if (isTransitioning) return;
    if (!formData.selectedLanguages.includes(lang)) {
      setField("selectedLanguages", [...formData.selectedLanguages, lang]);
    }
    setRecordField("languageProficiencies", lang, level);
    advance();
  };

  const skipIndianLanguage = (lang: string) => {
    if (isTransitioning) return;
    if (formData.selectedLanguages.includes(lang)) {
      setField(
        "selectedLanguages",
        formData.selectedLanguages.filter((l) => l !== lang)
      );
    }
    advance();
  };

  const addCustomIndianLanguage = (level: string) => {
    const trimmed = draftName.trim();
    if (!trimmed) return;
    if (!formData.selectedLanguages.includes(trimmed)) {
      setField("selectedLanguages", [...formData.selectedLanguages, trimmed]);
    }
    setRecordField("languageProficiencies", trimmed, level);
    setDraftName("");
  };

  const removeCustomIndianLanguage = (lang: string) => {
    setField(
      "selectedLanguages",
      formData.selectedLanguages.filter((l) => l !== lang)
    );
  };

  const finishCustomIndian = () => {
    if (isTransitioning) return;
    advance();
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
    if (isTransitioning) return;
    setField("foreignLanguageLevel", level);
    advance();
  };

  const skipForeign = () => {
    if (isTransitioning) return;
    setField("foreignLanguageName", "");
    setField("foreignLanguageLevel", "");
    setShowForeignOtherInput(false);
    advance();
  };

  const goBackOneCard = () => {
    if (isTransitioning || cardIndex === 0) return;
    setEditingSingleCard(false);
    setCardIndex((i) => Math.max(0, i - 1));
  };

  const goToSummary = () => setPhase("summary");

  const editCard = (id: CardId) => {
    setEditingSingleCard(true);
    setPhase("cards");
    setCardIndex(ORDER.indexOf(id));
  };

  const CARD_LABEL: Record<CardId, string> = {
    hindi: "Hindi",
    sanskrit: "Sanskrit",
    otherIndian: "Other Indian languages",
    foreign: "Foreign language",
  };

  const navItems = ORDER.map((id, idx) => {
    const answered =
      id === "hindi" || id === "sanskrit"
        ? formData.selectedLanguages.includes(CARD_LABEL[id]) && !!formData.languageProficiencies[CARD_LABEL[id]]
        : id === "otherIndian"
          ? customIndianLanguages.length > 0
          : hasForeign;
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
            <h3 className="text-lg font-bold text-foreground">Language Exposure is ready.</h3>
          </div>

          {totalSelected === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No additional language exposure.</p>
          ) : (
            <div className="mt-5 space-y-1.5">
              {formData.selectedLanguages.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => editCard(INDIAN_LANGUAGE_CARDS.includes(lang) ? (lang.toLowerCase() as CardId) : "otherIndian")}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-left transition-colors hover:bg-muted"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Check className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
                    {lang}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {INDIAN_LEVELS.find((lv) => lv.value === formData.languageProficiencies[lang])?.label ?? "—"}
                    </span>
                    <img src={editIcon} className="h-3.5 w-3.5 shrink-0 object-contain" alt="" aria-hidden="true" draggable={false} />
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
                  <span className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {FOREIGN_LEVELS.find((lv) => lv.value === formData.foreignLanguageLevel)?.label ?? "—"}
                    </span>
                    <img src={editIcon} className="h-3.5 w-3.5 shrink-0 object-contain" alt="" aria-hidden="true" draggable={false} />
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
                    <span className={cn("block truncate text-sm", item.status === "current" ? "font-bold text-primary" : "text-muted-foreground")}>{item.label}</span>
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
              {(currentId === "hindi" || currentId === "sanskrit") && (
                <>
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-4">
                      <GlobiculumIconTile tone={currentId === "hindi" ? "teal" : "violet"} size={64}>
                        <GlobiculumEducationIcon size={34} />
                      </GlobiculumIconTile>
                    </div>
                    <h4 className="text-xl font-bold text-foreground">How familiar are you with {CARD_LABEL[currentId]}?</h4>
                  </div>
                  <div role="radiogroup" aria-label={`${CARD_LABEL[currentId]} familiarity`} className="mt-6 flex flex-wrap justify-center gap-2">
                    {INDIAN_LEVELS.map((level) => (
                      <LevelButton
                        key={level.value}
                        label={level.label}
                        selected={formData.languageProficiencies[CARD_LABEL[currentId]] === level.value && formData.selectedLanguages.includes(CARD_LABEL[currentId])}
                        onSelect={() => rateIndianLanguage(CARD_LABEL[currentId], level.value)}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => skipIndianLanguage(CARD_LABEL[currentId])}
                    className="mt-4 block w-full text-center text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  >
                    I haven&rsquo;t learned this
                  </button>
                </>
              )}

              {currentId === "otherIndian" && (
                <>
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-4">
                      <GlobiculumIconTile tone="teal" size={64}>
                        <Plus size={30} aria-hidden="true" />
                      </GlobiculumIconTile>
                    </div>
                    <h4 className="text-xl font-bold text-foreground">Any other Indian languages?</h4>
                  </div>

                  {customIndianLanguages.length > 0 && (
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {customIndianLanguages.map((lang) => (
                        <span key={lang} className="inline-flex items-center gap-1.5 rounded-full border-2 border-secondary bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary">
                          {lang} · {INDIAN_LEVELS.find((lv) => lv.value === formData.languageProficiencies[lang])?.label}
                          <button type="button" onClick={() => removeCustomIndianLanguage(lang)} aria-label={`Remove ${lang}`} className="rounded-full p-0.5 hover:bg-secondary/20">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="e.g. Tamil, Punjabi, Odia" className="mt-4" aria-label="Other Indian language name" />

                  <p className="mb-2 mt-4 text-center text-xs font-medium text-muted-foreground">How familiar?</p>
                  <div role="radiogroup" aria-label="New language familiarity" className="flex flex-wrap justify-center gap-2">
                    {INDIAN_LEVELS.map((level) => (
                      <button
                        key={level.value}
                        type="button"
                        disabled={!draftName.trim()}
                        onClick={() => addCustomIndianLanguage(level.value)}
                        className="rounded-xl border-2 border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors duration-200 hover:border-secondary/40 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>

                  <button type="button" onClick={finishCustomIndian} className="mt-4 block w-full text-center text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
                    I&rsquo;m done adding languages →
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
