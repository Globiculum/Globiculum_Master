import { GlobiculumIconTile, GlobiculumTargetIcon } from "@/components/icons";
import InputCard from "./InputCard";
import FieldError from "./FieldError";
import { NEW_SCHOOL_LANGUAGE_OPTIONS, newSchoolLanguageHint } from "./newSchoolLanguage";

/**
 * Body of the "new school" card in Language Exposure (ParentLanguageJourneyCard
 * and student LanguageJourneyCard): which Indian language the student will take
 * in Classes 6-10. It used to be a separate optional question at the top of
 * Academic Path; it now sits next to the languages the student already knows
 * and is required. See newSchoolLanguage.ts for when it is asked.
 */

interface Props {
  audience: "parent" | "student";
  grade: number;
  targetGoal: string;
  value: string;
  onChange: (value: string) => void;
  /** True while the value is the one pre-selected from the known languages. */
  suggested?: boolean;
  error?: string;
}

const IndianLanguageQuestion = ({ audience, grade, targetGoal, value, onChange, suggested, error }: Props) => (
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
    <FieldError message={error} />
  </>
);

export default IndianLanguageQuestion;
