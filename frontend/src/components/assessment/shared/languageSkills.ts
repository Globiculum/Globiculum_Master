import { NEW_TO_LANGUAGE } from "./newSchoolLanguage";

// What a child can do in each Indian language: understand it when spoken,
// speak, read, write. Asked as four tick-boxes instead of one level
// (Beginner / Intermediate / Fluent), because the abilities don't move
// together: many children abroad speak Hindi at home but can't read it, and
// some read and write a language they rarely speak. "Fluent" for a child who
// speaks but can't read made the report skip the script starters that child
// needed most.
//
// Stored in languageSkills { Hindi: ["understand", "speak"] }. The single
// level in languageProficiencies is still filled in, worked out from the ticks
// (levelFromSkills), so validation, progress and the report's choice of
// resources keep working, and so do reports saved before this change.

export type LanguageSkill = "understand" | "speak" | "read" | "write";

export const LANGUAGE_SKILLS: { value: LanguageSkill; label: string }[] = [
  { value: "understand", label: "Understands" },
  { value: "speak", label: "Speaks" },
  { value: "read", label: "Reads" },
  { value: "write", label: "Writes" },
];

const SKILL_ORDER: LanguageSkill[] = LANGUAGE_SKILLS.map((s) => s.value);

/** The ticks in a fixed order, unknown values dropped. */
export function cleanSkills(skills: unknown): LanguageSkill[] {
  return Array.isArray(skills) ? SKILL_ORDER.filter((s) => skills.includes(s)) : [];
}

/**
 * The single level the rest of the app reads (languageProficiencies):
 * no reading or writing yet -> "beginner" (start with the script);
 * reads or writes, but not all four -> "intermediate"; all four -> "fluent".
 * Nothing ticked -> "" (not answered).
 */
export function levelFromSkills(skills: LanguageSkill[]): string {
  if (skills.length === 0) return "";
  if (skills.length === SKILL_ORDER.length) return "fluent";
  return skills.includes("read") || skills.includes("write") ? "intermediate" : "beginner";
}

export interface SkillAnswers {
  languageSkills: Record<string, LanguageSkill[]>;
  languageProficiencies: Record<string, string>;
}

/** Ticks or unticks one skill, and keeps the level in step. */
export function toggleSkill(answers: SkillAnswers, lang: string, skill: LanguageSkill): SkillAnswers {
  const current = cleanSkills(answers.languageSkills[lang]);
  const next = current.includes(skill) ? current.filter((s) => s !== skill) : cleanSkills([...current, skill]);
  const level = levelFromSkills(next);
  const levels = { ...answers.languageProficiencies };
  if (level) levels[lang] = level;
  else delete levels[lang];
  return { languageSkills: { ...answers.languageSkills, [lang]: next }, languageProficiencies: levels };
}

/** "New to it" (the new-school language, never studied): no ticks. */
export function markNewToLanguage(answers: SkillAnswers, lang: string): SkillAnswers {
  return {
    languageSkills: { ...answers.languageSkills, [lang]: [] },
    languageProficiencies: { ...answers.languageProficiencies, [lang]: NEW_TO_LANGUAGE },
  };
}

/** Drops a language's ticks and level (language removed). */
export function forgetLanguage(answers: SkillAnswers, lang: string): SkillAnswers {
  const skills = { ...answers.languageSkills };
  const levels = { ...answers.languageProficiencies };
  delete skills[lang];
  delete levels[lang];
  return { languageSkills: skills, languageProficiencies: levels };
}

/**
 * A language answered before the tick-boxes has a level but no ticks:
 * "Fluent" becomes all four ticks and "New to it" stays; "Beginner" and
 * "Intermediate" can't be split into skills, so they are cleared and asked
 * again. Languages that already have ticks keep them, with the level worked
 * out from them.
 */
export function withLanguageSkills<T extends { languageProficiencies?: Record<string, string>; languageSkills?: unknown }>(
  data: T
): T & SkillAnswers {
  const saved =
    data.languageSkills && typeof data.languageSkills === "object" && !Array.isArray(data.languageSkills)
      ? (data.languageSkills as Record<string, unknown>)
      : {};
  const skills: Record<string, LanguageSkill[]> = {};
  const levels: Record<string, string> = {};
  for (const [lang, level] of Object.entries(data.languageProficiencies ?? {})) {
    if (level === NEW_TO_LANGUAGE) {
      skills[lang] = [];
      levels[lang] = NEW_TO_LANGUAGE;
    } else if (lang in saved) {
      skills[lang] = cleanSkills(saved[lang]);
      const derived = levelFromSkills(skills[lang]);
      if (derived) levels[lang] = derived;
    } else if (level === "fluent") {
      skills[lang] = [...SKILL_ORDER];
      levels[lang] = "fluent";
    }
  }
  return { ...data, languageSkills: skills, languageProficiencies: levels };
}

/** "Understands, speaks" / "Understands, speaks, reads, writes" / "New to it" — for summaries and Review. */
export function skillsLabel(skills: LanguageSkill[] | undefined, level?: string): string {
  const s = cleanSkills(skills);
  if (s.length > 0) {
    const words = s.map((x) => LANGUAGE_SKILLS.find((l) => l.value === x)!.label.toLowerCase()).join(", ");
    return words[0].toUpperCase() + words.slice(1);
  }
  return level === NEW_TO_LANGUAGE ? "New to it" : "—";
}

/** "Hindi: understands, speaks; Telugu: understands" — for the Review step. */
export function formatLanguageSkills(
  languages: string[],
  skills: Record<string, LanguageSkill[]> | undefined,
  levels: Record<string, string> | undefined
): string {
  const parts = languages.map((lang) => `${lang}: ${skillsLabel(skills?.[lang], levels?.[lang]).toLowerCase()}`);
  return parts.length ? parts.join("; ") : "—";
}

/** The ticks sent to the AI: known languages, plus "New to it" ones as []. */
export function languageSkillsForAnalysis(
  selectedLanguages: string[],
  skills: Record<string, unknown> | undefined,
  levels: Record<string, string> | undefined
): Record<string, LanguageSkill[]> | undefined {
  const out: Record<string, LanguageSkill[]> = {};
  for (const lang of selectedLanguages) {
    const s = cleanSkills(skills?.[lang]);
    if (s.length) out[lang] = s;
  }
  for (const [lang, level] of Object.entries(levels ?? {})) {
    if (level === NEW_TO_LANGUAGE && !(lang in out)) out[lang] = [];
  }
  return Object.keys(out).length ? out : undefined;
}
