// What a child can do in each Indian language, from the form's tick-boxes
// (frontend components/assessment/shared/languageSkills.ts):
// { Hindi: ["understand", "speak"] }; [] = "New to it" (the new-school language).

export const LANGUAGE_SKILLS = ['understand', 'speak', 'read', 'write'] as const;
export type LanguageSkill = typeof LANGUAGE_SKILLS[number];

/**
 * Up to 10 languages; each name is passed through `cleanName` (the caller's
 * prompt sanitiser) and dropped when that leaves nothing; skills are allow-listed.
 */
export function sanitizeLanguageSkills(
  raw: unknown,
  cleanName: (value: unknown, maxLength: number) => string
): Record<string, LanguageSkill[]> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const out: Record<string, LanguageSkill[]> = {};
  for (const [lang, skills] of Object.entries(raw as Record<string, unknown>).slice(0, 10)) {
    const name = cleanName(lang, 50);
    if (!name || !Array.isArray(skills)) continue;
    out[name] = LANGUAGE_SKILLS.filter((s) => skills.includes(s));
  }
  return Object.keys(out).length ? out : undefined;
}

/** "Hindi: understands, speaks; can't yet read, write. Sanskrit: new to it (never studied)" */
export function describeLanguageSkills(skills: Record<string, LanguageSkill[]>): string {
  const can: Record<LanguageSkill, string> = { understand: 'understands', speak: 'speaks', read: 'reads', write: 'writes' };
  const cannot: Record<LanguageSkill, string> = { understand: 'understand it spoken', speak: 'speak', read: 'read', write: 'write' };
  return Object.entries(skills)
    .map(([lang, s]) => {
      if (s.length === 0) return `${lang}: new to it (never studied)`;
      if (s.length === LANGUAGE_SKILLS.length) return `${lang}: understands, speaks, reads and writes`;
      const missing = LANGUAGE_SKILLS.filter((x) => !s.includes(x));
      return `${lang}: ${s.map((x) => can[x]).join(', ')}; can't yet ${missing.map((x) => cannot[x]).join(', ')}`;
    })
    .join('. ');
}
