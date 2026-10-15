// Core vs elective subjects for the Academic Path step.
//
// Core subjects are the ones every student at the grade takes (Maths, English,
// Science, Social Studies and their equivalents); electives are the ones a
// student may or may not take (Computer Science, Arts, PE & Health, World
// Languages, Personal Finance). US states publish standards for both, even at
// Grade 1 (e.g. Delaware: Visual and Performing Arts, 135 Grade 1 standards),
// so electives are shown in their own section instead of being hidden.

const ELECTIVE_RE =
  /computer|\barts?\b|music|physical education|\bpe\b|health|world language|foreign language|personal finance|elective|technology/i;

export function isElectiveSubject(subject: string): boolean {
  return ELECTIVE_RE.test(subject);
}

/** Split a subject list into [core, electives], keeping the given order. */
export function splitCoreElectives(subjects: string[]): [string[], string[]] {
  const core: string[] = [];
  const electives: string[] = [];
  for (const s of subjects) (isElectiveSubject(s) ? electives : core).push(s);
  return [core, electives];
}
