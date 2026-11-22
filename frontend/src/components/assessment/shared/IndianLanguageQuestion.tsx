import { GlobiculumIconTile, GlobiculumTargetIcon } from "@/components/icons";
import InputCard from "./InputCard";
import FieldError from "./FieldError";
import LanguageSkillRow from "./LanguageSkillRow";
import { cleanSkills, type LanguageSkill } from "./languageSkills";
import { NEW_SCHOOL_LANGUAGE_OPTIONS, newSchoolLanguageHint, schoolLanguages } from "./newSchoolLanguage";
import { LANGUAGE_LEVEL_MESSAGE } from "./stepRules";

/**
 * Body of the "new school" card in Language Exposure (ParentLanguageJourneyCard
 * and student LanguageJourneyCard): which Indian language the student will take
 * in Classes 6-10. It used to be a separate optional question at the top of
 * Academic Path; it now sits next to the languages the student already knows
 * and is required. See newSchoolLanguage.ts for when it is asked.
 *
 * Hindi or Sanskrit chosen here also needs an answer, like a language marked
 * as known: what the child can do in it (the same tick-boxes as Indian
 * Languages, kept in step with them), or "New to it" for a language never
 * studied. See languageSkills.ts.
 */

interface Props {
  audience: "parent" | "student";
  grade: number;
  targetGoal: string;
  value: string;
  onChange: (value: string) => void;
  /** languageProficiencies: the level of each language ("new" = New to it). */
  levels: Record<string, string>;
  /** languageSkills: the ticks of each language. */
  skills: Record<string, LanguageSkill[]>;
  onToggleSkill: (language: string, skill: LanguageSkill) => void;
  onNewToIt: (language: string) => void;
  /** True while the value is the one pre-selected from the known languages. */
  suggested?: boolean;
  error?: string;
}

const IndianLanguageQuestion = ({ audience, grade, targetGoal, value, onChange, levels, skills, onToggleSkill, onNewToIt, suggested, error }: Props) => {
  const chosen = schoolLanguages(value);
  const unrated = chosen.filter((lang) => !levels[lang]);

  return (
    <>
      <div className="flex flex-col items-center text-center">
        <div className="mb-4">
          <GlobiculumIconTile tone="teal" size={64}>
            <GlobiculumTargetIcon size={34} />
          </GlobiculumIconTile>
        </div>
        <h4 className="text-xl font-bold text-foreground">
          {audience === "parent"
            ? `In Class ${grade} at the new school, will your child study Hindi, Sanskrit or both?`
            : `In Class ${grade} at your new school, will you study Hindi, Sanskrit or both?`}
        </h4>
        <p className="mt-1 text-sm text-muted-foreground">{newSchoolLanguageHint(targetGoal)}</p>
      </div>

      <div role="radiogroup" aria-label="Indian language at the new school" className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {NEW_SCHOOL_LANGUAGE_OPTIONS.map((o) => (
          <InputCard
            key={o.value}
            variant="chip"
            mode="radio"
            label={o.label}
            selected={value === o.value}
            onClick={() => onChange(o.value)}
          />
        ))}
      </div>
      {suggested && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Pre-selected from the languages {audience === "parent" ? "your child knows" : "you know"}. Change it if needed.
        </p>
      )}

      {chosen.length > 0 && (
        <div className="mt-5 space-y-1.5">
          <p className="text-center text-sm font-medium text-muted-foreground">
            {audience === "parent"
              ? `What can your child do in ${chosen.length > 1 ? "each" : chosen[0]}? Tick all that apply, or New to it.`
              : `What can you do in ${chosen.length > 1 ? "each" : chosen[0]}? Tick all that apply, or New to it.`}
          </p>
          {chosen.map((lang) => (
            <LanguageSkillRow
              key={lang}
              lang={lang}
              skills={cleanSkills(skills[lang])}
              level={levels[lang]}
              onToggle={(skill) => onToggleSkill(lang, skill)}
              onNewToIt={() => onNewToIt(lang)}
            />
          ))}
          {unrated.length > 0 && (
            <p role="status" className="pt-2 text-center text-xs font-medium text-amber-700 dark:text-amber-400">
              {LANGUAGE_LEVEL_MESSAGE}
            </p>
          )}
        </div>
      )}
      {/* A missing level is shown by the line above, which goes away once it's picked. */}
      <FieldError message={error === LANGUAGE_LEVEL_MESSAGE ? undefined : error} />
    </>
  );
};

export default IndianLanguageQuestion;
