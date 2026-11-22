import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { LANGUAGE_SKILLS, type LanguageSkill } from "./languageSkills";
import { NEW_TO_LANGUAGE } from "./newSchoolLanguage";

// One known Indian language and what the child can do in it: four tick-boxes
// (Understands, Speaks, Reads, Writes), any combination. The new-school card
// adds "New to it" for a language never studied, which clears the ticks.
// See languageSkills.ts.

interface Props {
  lang: string;
  skills: LanguageSkill[];
  /** languageProficiencies[lang]: shows "New to it" as picked. */
  level?: string;
  onToggle: (skill: LanguageSkill) => void;
  /** Shown only on the new-school card. */
  onNewToIt?: () => void;
}

const Tick = ({ label, checked, onClick, ariaLabel }: { label: string; checked: boolean; onClick: () => void; ariaLabel: string }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={checked}
    aria-label={ariaLabel}
    onClick={onClick}
    className={cn(
      "inline-flex items-center gap-1 rounded-full border-2 px-3 py-1.5 text-xs font-semibold transition-colors duration-200",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      checked ? "border-secondary bg-secondary text-secondary-foreground" : "border-border bg-card text-foreground hover:border-secondary/40"
    )}
  >
    {checked && <Check className="h-3 w-3" aria-hidden="true" />}
    {label}
  </button>
);

const LanguageSkillRow = ({ lang, skills, level, onToggle, onNewToIt }: Props) => {
  const isNew = level === NEW_TO_LANGUAGE;
  const missing = skills.length === 0 && !isNew;
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border bg-card/50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between",
        missing ? "border-amber-400" : "border-border"
      )}
    >
      <span className="text-base font-bold text-foreground">{lang}</span>
      <div role="group" aria-label={`What can they do in ${lang}?`} className="flex flex-wrap gap-1.5">
        {LANGUAGE_SKILLS.map((s) => (
          <Tick key={s.value} label={s.label} checked={skills.includes(s.value)} onClick={() => onToggle(s.value)} ariaLabel={`${lang}: ${s.label}`} />
        ))}
        {onNewToIt && <Tick label="New to it" checked={isNew} onClick={onNewToIt} ariaLabel={`${lang}: New to it`} />}
      </div>
    </div>
  );
};

export default LanguageSkillRow;
