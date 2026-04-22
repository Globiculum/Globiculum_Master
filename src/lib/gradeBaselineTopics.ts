/**
 * Grade-level baseline topic expectations for Indian board transition (Grades 1–10).
 *
 * Purpose: enforce CONSISTENT report outputs for the same grade × subject × board
 * by guaranteeing a deterministic baseline of expected topics that the report
 * compares against, regardless of AI variance.
 *
 * For each grade × subject we list 4–8 priority topics. The chapter names map
 * directly into `getSyllabusReferenceForTopic` keywords in syllabusReferences.ts
 * so each baseline topic resolves to a Topic → Chapter → Link triplet.
 *
 * NOTE: This file is INPUT REFINEMENT only — it does not modify the alignment
 * engine, scoring algorithm, or DB schema. It augments missing-topic display
 * inside the client-rendered Transition Readiness Report.
 */

export type Board = "cbse" | "icse" | "ib" | "igcse";

export interface BaselineTopic {
  /** Display name shown to user (matches keys in GRADE_TOPIC_CHAPTERS for direct chapter resolution). */
  topic: string;
  /** Subject category — used to attach the topic to the right subject row in the report. */
  subjectKey: "math" | "science" | "english" | "social_studies" | "hindi";
}

/**
 * Expected topics per grade. Indexed by grade number (1–10).
 * Topics are board-agnostic (CBSE-aligned NCERT baseline) since CBSE coverage
 * is a superset for transition readiness.
 */
const GRADE_BASELINE: Record<number, BaselineTopic[]> = {
  1: [
    { topic: "Numbers 1 to 100", subjectKey: "math" },
    { topic: "Addition and Subtraction", subjectKey: "math" },
    { topic: "Shapes and Patterns", subjectKey: "math" },
    { topic: "My Family and Surroundings", subjectKey: "social_studies" },
    { topic: "Reading Simple Sentences", subjectKey: "english" },
  ],
  2: [
    { topic: "Place Value up to 1000", subjectKey: "math" },
    { topic: "Multiplication Tables", subjectKey: "math" },
    { topic: "Measurement of Length and Weight", subjectKey: "math" },
    { topic: "Plants and Animals Around Us", subjectKey: "science" },
    { topic: "Reading Comprehension", subjectKey: "english" },
  ],
  3: [
    { topic: "Numbers up to 10000", subjectKey: "math" },
    { topic: "Multiplication and Division", subjectKey: "math" },
    { topic: "Fractions", subjectKey: "math" },
    { topic: "Living and Non-Living Things", subjectKey: "science" },
    { topic: "Grammar Basics", subjectKey: "english" },
  ],
  4: [
    { topic: "Large Numbers and Place Value", subjectKey: "math" },
    { topic: "Factors and Multiples", subjectKey: "math" },
    { topic: "Decimals", subjectKey: "math" },
    { topic: "Food and Nutrition", subjectKey: "science" },
    { topic: "Writing Skills", subjectKey: "english" },
  ],
  5: [
    { topic: "Decimals", subjectKey: "math" },
    { topic: "Fractions", subjectKey: "math" },
    { topic: "Percentage", subjectKey: "math" },
    { topic: "Area and Perimeter", subjectKey: "math" },
    { topic: "Human Body Systems", subjectKey: "science" },
    { topic: "Reading Comprehension", subjectKey: "english" },
  ],
  6: [
    { topic: "Knowing Our Numbers", subjectKey: "math" },
    { topic: "Whole Numbers", subjectKey: "math" },
    { topic: "Integers", subjectKey: "math" },
    { topic: "Fractions", subjectKey: "math" },
    { topic: "Decimals", subjectKey: "math" },
    { topic: "Basic Algebra", subjectKey: "math" },
    { topic: "Ratio and Proportion", subjectKey: "math" },
    { topic: "Basic Geometrical Ideas", subjectKey: "math" },
    { topic: "Food", subjectKey: "science" },
    { topic: "Fibre to Fabric", subjectKey: "science" },
    { topic: "Body Movements", subjectKey: "science" },
    { topic: "Living Organisms", subjectKey: "science" },
    { topic: "Grammar", subjectKey: "english" },
  ],
  7: [
    { topic: "Integers", subjectKey: "math" },
    { topic: "Fractions", subjectKey: "math" },
    { topic: "Rational Numbers", subjectKey: "math" },
    { topic: "Simple Equations", subjectKey: "math" },
    { topic: "Lines and Angles", subjectKey: "math" },
    { topic: "Comparing Quantities", subjectKey: "math" },
    { topic: "Algebraic Expressions", subjectKey: "math" },
    { topic: "Exponents and Powers", subjectKey: "math" },
    { topic: "Nutrition in Plants", subjectKey: "science" },
    { topic: "Heat", subjectKey: "science" },
    { topic: "Acids Bases and Salts", subjectKey: "science" },
    { topic: "Weather Climate", subjectKey: "science" },
    { topic: "Respiration", subjectKey: "science" },
    { topic: "Electric Current", subjectKey: "science" },
  ],
  8: [
    { topic: "Rational Numbers", subjectKey: "math" },
    { topic: "Linear Equations in One Variable", subjectKey: "math" },
    { topic: "Understanding Quadrilaterals", subjectKey: "math" },
    { topic: "Squares and Square Roots", subjectKey: "math" },
    { topic: "Cubes and Cube Roots", subjectKey: "math" },
    { topic: "Comparing Quantities", subjectKey: "math" },
    { topic: "Mensuration", subjectKey: "math" },
    { topic: "Factorisation", subjectKey: "math" },
    { topic: "Direct and Inverse Proportions", subjectKey: "math" },
    { topic: "Crop Production", subjectKey: "science" },
    { topic: "Microorganisms", subjectKey: "science" },
    { topic: "Combustion", subjectKey: "science" },
    { topic: "Cell Structure", subjectKey: "science" },
    { topic: "Force and Pressure", subjectKey: "science" },
    { topic: "Friction", subjectKey: "science" },
    { topic: "Sound Class 8", subjectKey: "science" },
  ],
  9: [
    { topic: "Number Systems", subjectKey: "math" },
    { topic: "Polynomials", subjectKey: "math" },
    { topic: "Coordinate Geometry Class 9", subjectKey: "math" },
    { topic: "Linear Equations in Two Variables", subjectKey: "math" },
    { topic: "Euclid's Geometry", subjectKey: "math" },
    { topic: "Heron's Formula", subjectKey: "math" },
    { topic: "Surface Areas and Volumes Class 9", subjectKey: "math" },
    { topic: "Matter in Our Surroundings", subjectKey: "science" },
    { topic: "Atoms and Molecules", subjectKey: "science" },
    { topic: "Structure of Atom", subjectKey: "science" },
    { topic: "Tissues", subjectKey: "science" },
    { topic: "Motion Class 9", subjectKey: "science" },
    { topic: "Force and Laws of Motion", subjectKey: "science" },
    { topic: "Gravitation", subjectKey: "science" },
    { topic: "Work and Energy", subjectKey: "science" },
  ],
  10: [
    { topic: "Real Numbers", subjectKey: "math" },
    { topic: "Polynomials", subjectKey: "math" },
    { topic: "Pair of Linear Equations", subjectKey: "math" },
    { topic: "Quadratic Equations", subjectKey: "math" },
    { topic: "Arithmetic Progression", subjectKey: "math" },
    { topic: "Triangles", subjectKey: "math" },
    { topic: "Coordinate Geometry", subjectKey: "math" },
    { topic: "Trigonometry", subjectKey: "math" },
    { topic: "Circles", subjectKey: "math" },
    { topic: "Surface Area and Volumes", subjectKey: "math" },
    { topic: "Statistics", subjectKey: "math" },
    { topic: "Probability", subjectKey: "math" },
    { topic: "Chemical Reactions", subjectKey: "science" },
    { topic: "Acids Bases", subjectKey: "science" },
    { topic: "Metals Non-metals", subjectKey: "science" },
    { topic: "Carbon Compounds", subjectKey: "science" },
    { topic: "Periodic Classification", subjectKey: "science" },
    { topic: "Life Processes", subjectKey: "science" },
    { topic: "Heredity Evolution", subjectKey: "science" },
    { topic: "Light", subjectKey: "science" },
    { topic: "Electricity", subjectKey: "science" },
  ],
};

/** Map a free-form subject string from the AI/UI to a baseline subject key. */
export function classifySubject(subjectName: string): BaselineTopic["subjectKey"] | null {
  const s = subjectName.toLowerCase();
  if (/math|algebra|geometry|calculus|arithmetic/.test(s)) return "math";
  if (/science|physics|chemistry|biology/.test(s)) return "science";
  if (/english|language\s*arts|reading|writing/.test(s)) return "english";
  if (/social|history|civics|geography|economics/.test(s)) return "social_studies";
  if (/hindi/.test(s)) return "hindi";
  return null;
}

/**
 * Returns expected baseline topics for the student's grade & subject.
 * Empty array if grade is outside the Foundation Transition range (1–10) or unknown.
 */
export function getBaselineTopics(
  grade: number | undefined,
  subjectName: string,
): string[] {
  if (!grade || grade < 1 || grade > 10) return [];
  const key = classifySubject(subjectName);
  if (!key) return [];
  return (GRADE_BASELINE[grade] || [])
    .filter((t) => t.subjectKey === key)
    .map((t) => t.topic);
}

/**
 * Merge AI-generated gaps with baseline expected topics. Any baseline topic NOT
 * already represented (case-insensitive substring match) in `aiGaps` is appended.
 * Guarantees consistent topic coverage per grade × subject.
 */
export function mergeWithBaseline(
  grade: number | undefined,
  subjectName: string,
  aiGaps: string[],
  options: { maxTopics?: number } = {},
): string[] {
  const baseline = getBaselineTopics(grade, subjectName);
  if (baseline.length === 0) return aiGaps;

  const lowerAi = aiGaps.map((g) => g.toLowerCase());
  const merged = [...aiGaps];
  for (const topic of baseline) {
    const t = topic.toLowerCase();
    const alreadyPresent = lowerAi.some((g) => g.includes(t) || t.includes(g));
    if (!alreadyPresent) merged.push(topic);
  }
  return options.maxTopics ? merged.slice(0, options.maxTopics) : merged;
}
