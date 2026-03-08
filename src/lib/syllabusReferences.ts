/**
 * Syllabus Reference URLs for Missing Topics
 * Maps topic keywords to official Indian educational resources (NCERT, CBSE, ICSE)
 */

interface SyllabusReference {
  url: string;
  label: string;
}

// Subject-based NCERT book URLs
const NCERT_SUBJECT_URLS: Record<string, string> = {
  mathematics: "https://ncert.nic.in/textbook.php?subject=Mathematics",
  math: "https://ncert.nic.in/textbook.php?subject=Mathematics",
  science: "https://ncert.nic.in/textbook.php?subject=Science",
  physics: "https://ncert.nic.in/textbook.php?subject=Physics",
  chemistry: "https://ncert.nic.in/textbook.php?subject=Chemistry",
  biology: "https://ncert.nic.in/textbook.php?subject=Biology",
  english: "https://ncert.nic.in/textbook.php?subject=English",
  hindi: "https://ncert.nic.in/textbook.php?subject=Hindi",
  sanskrit: "https://ncert.nic.in/textbook.php?subject=Sanskrit",
  "social studies": "https://ncert.nic.in/textbook.php?subject=SocialScience",
  "social science": "https://ncert.nic.in/textbook.php?subject=SocialScience",
  history: "https://ncert.nic.in/textbook.php?subject=History",
  geography: "https://ncert.nic.in/textbook.php?subject=Geography",
  civics: "https://ncert.nic.in/textbook.php?subject=Civics",
  economics: "https://ncert.nic.in/textbook.php?subject=Economics",
  "computer science": "https://ncert.nic.in/textbook.php?subject=ComputerScience",
  accountancy: "https://ncert.nic.in/textbook.php?subject=Accountancy",
  "business studies": "https://ncert.nic.in/textbook.php?subject=BusinessStudies",
};

// ──────────────────────────────────────────────────────────────
// Grade-level topic → specific NCERT chapter mappings
// ──────────────────────────────────────────────────────────────

interface ChapterRef {
  url: string;
  label: string;
}

const GRADE_TOPIC_CHAPTERS: Record<string, ChapterRef> = {
  // ── Grade 6 Mathematics ──
  "fractions": { url: "https://ncert.nic.in/textbook.php?fhma1=7-7", label: "NCERT Class 6 Math – Ch 7: Fractions" },
  "integers": { url: "https://ncert.nic.in/textbook.php?fhma1=6-6", label: "NCERT Class 6 Math – Ch 6: Integers" },
  "ratio and proportion": { url: "https://ncert.nic.in/textbook.php?fhma1=12-12", label: "NCERT Class 6 Math – Ch 12: Ratio & Proportion" },
  "basic algebra": { url: "https://ncert.nic.in/textbook.php?fhma1=11-11", label: "NCERT Class 6 Math – Ch 11: Algebra" },
  "basic geometrical ideas": { url: "https://ncert.nic.in/textbook.php?fhma1=4-4", label: "NCERT Class 6 Math – Ch 4: Basic Geometrical Ideas" },
  "understanding elementary shapes": { url: "https://ncert.nic.in/textbook.php?fhma1=5-5", label: "NCERT Class 6 Math – Ch 5: Elementary Shapes" },
  "whole numbers": { url: "https://ncert.nic.in/textbook.php?fhma1=2-2", label: "NCERT Class 6 Math – Ch 2: Whole Numbers" },
  "knowing our numbers": { url: "https://ncert.nic.in/textbook.php?fhma1=1-1", label: "NCERT Class 6 Math – Ch 1: Knowing Our Numbers" },
  "decimals": { url: "https://ncert.nic.in/textbook.php?fhma1=8-8", label: "NCERT Class 6 Math – Ch 8: Decimals" },
  "data handling": { url: "https://ncert.nic.in/textbook.php?fhma1=9-9", label: "NCERT Class 6 Math – Ch 9: Data Handling" },
  "symmetry": { url: "https://ncert.nic.in/textbook.php?fhma1=13-13", label: "NCERT Class 6 Math – Ch 13: Symmetry" },

  // ── Grade 7 Mathematics ──
  "rational numbers": { url: "https://ncert.nic.in/textbook.php?ghma1=9-9", label: "NCERT Class 7 Math – Ch 9: Rational Numbers" },
  "simple equations": { url: "https://ncert.nic.in/textbook.php?ghma1=4-4", label: "NCERT Class 7 Math – Ch 4: Simple Equations" },
  "lines and angles": { url: "https://ncert.nic.in/textbook.php?ghma1=5-5", label: "NCERT Class 7 Math – Ch 5: Lines & Angles" },
  "comparing quantities": { url: "https://ncert.nic.in/textbook.php?ghma1=8-8", label: "NCERT Class 7 Math – Ch 8: Comparing Quantities" },
  "perimeter and area": { url: "https://ncert.nic.in/textbook.php?ghma1=11-11", label: "NCERT Class 7 Math – Ch 11: Perimeter & Area" },
  "algebraic expressions": { url: "https://ncert.nic.in/textbook.php?ghma1=12-12", label: "NCERT Class 7 Math – Ch 12: Algebraic Expressions" },
  "exponents and powers": { url: "https://ncert.nic.in/textbook.php?ghma1=13-13", label: "NCERT Class 7 Math – Ch 13: Exponents & Powers" },
  "congruence of triangles": { url: "https://ncert.nic.in/textbook.php?ghma1=7-7", label: "NCERT Class 7 Math – Ch 7: Congruence of Triangles" },

  // ── Grade 8 Mathematics ──
  "linear equations in one variable": { url: "https://ncert.nic.in/textbook.php?hemh1=2-2", label: "NCERT Class 8 Math – Ch 2: Linear Equations" },
  "understanding quadrilaterals": { url: "https://ncert.nic.in/textbook.php?hemh1=3-3", label: "NCERT Class 8 Math – Ch 3: Quadrilaterals" },
  "factorisation": { url: "https://ncert.nic.in/textbook.php?hemh1=14-14", label: "NCERT Class 8 Math – Ch 14: Factorisation" },
  "direct and inverse proportions": { url: "https://ncert.nic.in/textbook.php?hemh1=13-13", label: "NCERT Class 8 Math – Ch 13: Direct & Inverse Proportions" },
  "squares and square roots": { url: "https://ncert.nic.in/textbook.php?hemh1=6-6", label: "NCERT Class 8 Math – Ch 6: Squares & Square Roots" },
  "cubes and cube roots": { url: "https://ncert.nic.in/textbook.php?hemh1=7-7", label: "NCERT Class 8 Math – Ch 7: Cubes & Cube Roots" },
  "mensuration": { url: "https://ncert.nic.in/textbook.php?hemh1=11-11", label: "NCERT Class 8 Math – Ch 11: Mensuration" },
  "playing with numbers": { url: "https://ncert.nic.in/textbook.php?hemh1=16-16", label: "NCERT Class 8 Math – Ch 16: Playing with Numbers" },

  // ── Grade 9 Mathematics ──
  "number systems": { url: "https://ncert.nic.in/textbook.php?iemh1=1-1", label: "NCERT Class 9 Math – Ch 1: Number Systems" },
  "polynomials": { url: "https://ncert.nic.in/textbook.php?iemh1=2-2", label: "NCERT Class 9 Math – Ch 2: Polynomials" },
  "coordinate geometry class 9": { url: "https://ncert.nic.in/textbook.php?iemh1=3-3", label: "NCERT Class 9 Math – Ch 3: Coordinate Geometry" },
  "linear equations in two variables": { url: "https://ncert.nic.in/textbook.php?iemh1=4-4", label: "NCERT Class 9 Math – Ch 4: Linear Equations in Two Variables" },
  "euclid's geometry": { url: "https://ncert.nic.in/textbook.php?iemh1=5-5", label: "NCERT Class 9 Math – Ch 5: Euclid's Geometry" },
  "heron's formula": { url: "https://ncert.nic.in/textbook.php?iemh1=12-12", label: "NCERT Class 9 Math – Ch 12: Heron's Formula" },
  "surface areas and volumes class 9": { url: "https://ncert.nic.in/textbook.php?iemh1=13-13", label: "NCERT Class 9 Math – Ch 13: Surface Areas & Volumes" },

  // ── Grade 10 Mathematics (existing, now with better labels) ──
  "real numbers": { url: "https://ncert.nic.in/textbook.php?jemh1=1-1", label: "NCERT Class 10 Math – Ch 1: Real Numbers" },
  "polynomial": { url: "https://ncert.nic.in/textbook.php?jemh1=2-2", label: "NCERT Class 10 Math – Ch 2: Polynomials" },
  "linear equations": { url: "https://ncert.nic.in/textbook.php?jemh1=3-3", label: "NCERT Class 10 Math – Ch 3: Pair of Linear Equations" },
  "quadratic": { url: "https://ncert.nic.in/textbook.php?jemh1=4-4", label: "NCERT Class 10 Math – Ch 4: Quadratic Equations" },
  "arithmetic progression": { url: "https://ncert.nic.in/textbook.php?jemh1=5-5", label: "NCERT Class 10 Math – Ch 5: Arithmetic Progressions" },
  "triangles": { url: "https://ncert.nic.in/textbook.php?jemh1=6-6", label: "NCERT Class 10 Math – Ch 6: Triangles" },
  "coordinate geometry": { url: "https://ncert.nic.in/textbook.php?jemh1=7-7", label: "NCERT Class 10 Math – Ch 7: Coordinate Geometry" },
  "trigonometry": { url: "https://ncert.nic.in/textbook.php?jemh1=8-8", label: "NCERT Class 10 Math – Ch 8: Introduction to Trigonometry" },
  "circles": { url: "https://ncert.nic.in/textbook.php?jemh1=10-10", label: "NCERT Class 10 Math – Ch 10: Circles" },
  "constructions": { url: "https://ncert.nic.in/textbook.php?jemh1=11-11", label: "NCERT Class 10 Math – Ch 11: Constructions" },
  "surface area": { url: "https://ncert.nic.in/textbook.php?jemh1=13-13", label: "NCERT Class 10 Math – Ch 13: Surface Areas & Volumes" },
  "statistics": { url: "https://ncert.nic.in/textbook.php?jemh1=14-14", label: "NCERT Class 10 Math – Ch 14: Statistics" },
  "probability": { url: "https://ncert.nic.in/textbook.php?jemh1=15-15", label: "NCERT Class 10 Math – Ch 15: Probability" },

  // ── Grade 11–12 Mathematics ──
  "sets": { url: "https://ncert.nic.in/textbook.php?kemh1=1-1", label: "NCERT Class 11 Math – Ch 1: Sets" },
  "relations and functions": { url: "https://ncert.nic.in/textbook.php?kemh1=2-2", label: "NCERT Class 11 Math – Ch 2: Relations & Functions" },
  "complex numbers": { url: "https://ncert.nic.in/textbook.php?kemh1=5-5", label: "NCERT Class 11 Math – Ch 5: Complex Numbers" },
  "sequences and series": { url: "https://ncert.nic.in/textbook.php?kemh1=9-9", label: "NCERT Class 11 Math – Ch 9: Sequences & Series" },
  "permutations and combinations": { url: "https://ncert.nic.in/textbook.php?kemh1=7-7", label: "NCERT Class 11 Math – Ch 7: Permutations & Combinations" },
  "binomial theorem": { url: "https://ncert.nic.in/textbook.php?kemh1=8-8", label: "NCERT Class 11 Math – Ch 8: Binomial Theorem" },
  "limits and derivatives": { url: "https://ncert.nic.in/textbook.php?kemh1=13-13", label: "NCERT Class 11 Math – Ch 13: Limits & Derivatives" },
  "mathematical reasoning": { url: "https://ncert.nic.in/textbook.php?kemh1=14-14", label: "NCERT Class 11 Math – Ch 14: Mathematical Reasoning" },
  "calculus": { url: "https://ncert.nic.in/textbook.php?lemh1=5-5", label: "NCERT Class 12 Math – Ch 5: Continuity & Differentiability" },
  "matrices": { url: "https://ncert.nic.in/textbook.php?lemh1=3-3", label: "NCERT Class 12 Math – Ch 3: Matrices" },
  "determinants": { url: "https://ncert.nic.in/textbook.php?lemh1=4-4", label: "NCERT Class 12 Math – Ch 4: Determinants" },
  "integration": { url: "https://ncert.nic.in/textbook.php?lemh1=7-7", label: "NCERT Class 12 Math – Ch 7: Integrals" },
  "differentiation": { url: "https://ncert.nic.in/textbook.php?lemh1=5-5", label: "NCERT Class 12 Math – Ch 5: Continuity & Differentiability" },
  "vectors": { url: "https://ncert.nic.in/textbook.php?lemh2=10-10", label: "NCERT Class 12 Math – Ch 10: Vector Algebra" },
  "differential equations": { url: "https://ncert.nic.in/textbook.php?lemh1=9-9", label: "NCERT Class 12 Math – Ch 9: Differential Equations" },
  "probability class 12": { url: "https://ncert.nic.in/textbook.php?lemh2=13-13", label: "NCERT Class 12 Math – Ch 13: Probability" },
  "linear programming": { url: "https://ncert.nic.in/textbook.php?lemh2=12-12", label: "NCERT Class 12 Math – Ch 12: Linear Programming" },

  // ── Grade 6 Science ──
  "food": { url: "https://ncert.nic.in/textbook.php?fhsc1=1-1", label: "NCERT Class 6 Science – Ch 1: Food" },
  "fibre to fabric": { url: "https://ncert.nic.in/textbook.php?fhsc1=3-3", label: "NCERT Class 6 Science – Ch 3: Fibre to Fabric" },
  "sorting materials": { url: "https://ncert.nic.in/textbook.php?fhsc1=4-4", label: "NCERT Class 6 Science – Ch 4: Sorting Materials" },
  "separation of substances": { url: "https://ncert.nic.in/textbook.php?fhsc1=5-5", label: "NCERT Class 6 Science – Ch 5: Separation of Substances" },
  "body movements": { url: "https://ncert.nic.in/textbook.php?fhsc1=8-8", label: "NCERT Class 6 Science – Ch 8: Body Movements" },
  "living organisms": { url: "https://ncert.nic.in/textbook.php?fhsc1=9-9", label: "NCERT Class 6 Science – Ch 9: Living Organisms" },
  "motion and measurement": { url: "https://ncert.nic.in/textbook.php?fhsc1=10-10", label: "NCERT Class 6 Science – Ch 10: Motion & Measurement" },

  // ── Grade 10 Science ──
  "chemical reactions": { url: "https://ncert.nic.in/textbook.php?jesc1=1-1", label: "NCERT Class 10 Science – Ch 1: Chemical Reactions & Equations" },
  "acids bases": { url: "https://ncert.nic.in/textbook.php?jesc1=2-2", label: "NCERT Class 10 Science – Ch 2: Acids, Bases & Salts" },
  "metals non-metals": { url: "https://ncert.nic.in/textbook.php?jesc1=3-3", label: "NCERT Class 10 Science – Ch 3: Metals & Non-metals" },
  "carbon compounds": { url: "https://ncert.nic.in/textbook.php?jesc1=4-4", label: "NCERT Class 10 Science – Ch 4: Carbon & its Compounds" },
  "periodic classification": { url: "https://ncert.nic.in/textbook.php?jesc1=5-5", label: "NCERT Class 10 Science – Ch 5: Periodic Classification" },
  "life processes": { url: "https://ncert.nic.in/textbook.php?jesc1=6-6", label: "NCERT Class 10 Science – Ch 6: Life Processes" },
  "control coordination": { url: "https://ncert.nic.in/textbook.php?jesc1=7-7", label: "NCERT Class 10 Science – Ch 7: Control & Coordination" },
  "reproduction": { url: "https://ncert.nic.in/textbook.php?jesc1=8-8", label: "NCERT Class 10 Science – Ch 8: Reproduction" },
  "heredity evolution": { url: "https://ncert.nic.in/textbook.php?jesc1=9-9", label: "NCERT Class 10 Science – Ch 9: Heredity & Evolution" },
  "light": { url: "https://ncert.nic.in/textbook.php?jesc1=10-10", label: "NCERT Class 10 Science – Ch 10: Light" },
  "human eye": { url: "https://ncert.nic.in/textbook.php?jesc1=11-11", label: "NCERT Class 10 Science – Ch 11: Human Eye" },
  "electricity": { url: "https://ncert.nic.in/textbook.php?jesc1=12-12", label: "NCERT Class 10 Science – Ch 12: Electricity" },
  "magnetic effects": { url: "https://ncert.nic.in/textbook.php?jesc1=13-13", label: "NCERT Class 10 Science – Ch 13: Magnetic Effects" },
  "sources of energy": { url: "https://ncert.nic.in/textbook.php?jesc1=14-14", label: "NCERT Class 10 Science – Ch 14: Sources of Energy" },
  "environment": { url: "https://ncert.nic.in/textbook.php?jesc1=15-15", label: "NCERT Class 10 Science – Ch 15: Our Environment" },
  "natural resources": { url: "https://ncert.nic.in/textbook.php?jesc1=16-16", label: "NCERT Class 10 Science – Ch 16: Natural Resources" },

  // ── Grade 11–12 Biology ──
  "photosynthesis": { url: "https://ncert.nic.in/textbook.php?kebo1=13-13", label: "NCERT Class 11 Biology – Ch 13: Photosynthesis" },
  "cell biology": { url: "https://ncert.nic.in/textbook.php?kebo1=8-8", label: "NCERT Class 11 Biology – Ch 8: The Cell" },
  "plant kingdom": { url: "https://ncert.nic.in/textbook.php?kebo1=3-3", label: "NCERT Class 11 Biology – Ch 3: Plant Kingdom" },
  "animal kingdom": { url: "https://ncert.nic.in/textbook.php?kebo1=4-4", label: "NCERT Class 11 Biology – Ch 4: Animal Kingdom" },
  "genetics": { url: "https://ncert.nic.in/textbook.php?lebo1=5-5", label: "NCERT Class 12 Biology – Ch 5: Principles of Inheritance" },
  "evolution": { url: "https://ncert.nic.in/textbook.php?lebo1=7-7", label: "NCERT Class 12 Biology – Ch 7: Evolution" },
  "ecosystem": { url: "https://ncert.nic.in/textbook.php?lebo2=14-14", label: "NCERT Class 12 Biology – Ch 14: Ecosystem" },
  "biotechnology": { url: "https://ncert.nic.in/textbook.php?lebo2=11-11", label: "NCERT Class 12 Biology – Ch 11: Biotechnology Principles" },

  // ── Social Studies ──
  "indian freedom movement": { url: "https://ncert.nic.in/textbook.php?jess3=0-0", label: "NCERT Class 10 History" },
  "french revolution": { url: "https://ncert.nic.in/textbook.php?iess2=1-1", label: "NCERT Class 9 History – Ch 1: French Revolution" },
  "russian revolution": { url: "https://ncert.nic.in/textbook.php?iess2=2-2", label: "NCERT Class 9 History – Ch 2: Socialism in Europe" },
  "nazism": { url: "https://ncert.nic.in/textbook.php?iess2=3-3", label: "NCERT Class 9 History – Ch 3: Nazism & Rise of Hitler" },
  "democracy": { url: "https://ncert.nic.in/textbook.php?jess3=0-0", label: "NCERT Class 10 Civics" },
  "federalism": { url: "https://ncert.nic.in/textbook.php?jess3=2-2", label: "NCERT Class 10 Civics – Ch 2: Federalism" },
  "globalisation": { url: "https://ncert.nic.in/textbook.php?jess4=4-4", label: "NCERT Class 10 Economics – Ch 4: Globalisation" },
  "development": { url: "https://ncert.nic.in/textbook.php?jess4=1-1", label: "NCERT Class 10 Economics – Ch 1: Development" },
  "sectors of economy": { url: "https://ncert.nic.in/textbook.php?jess4=2-2", label: "NCERT Class 10 Economics – Ch 2: Sectors of Indian Economy" },
  "consumer rights": { url: "https://ncert.nic.in/textbook.php?jess4=5-5", label: "NCERT Class 10 Economics – Ch 5: Consumer Rights" },
  "resources": { url: "https://ncert.nic.in/textbook.php?jess1=1-1", label: "NCERT Class 10 Geography – Ch 1: Resources & Development" },
  "agriculture": { url: "https://ncert.nic.in/textbook.php?jess1=4-4", label: "NCERT Class 10 Geography – Ch 4: Agriculture" },
  "industries": { url: "https://ncert.nic.in/textbook.php?jess1=6-6", label: "NCERT Class 10 Geography – Ch 6: Manufacturing Industries" },

  // ── Language topics ──
  "grammar": { url: "https://ncert.nic.in/textbook.php?subject=English", label: "NCERT English" },
  "comprehension": { url: "https://ncert.nic.in/textbook.php?subject=English", label: "NCERT English" },
  "writing skills": { url: "https://ncert.nic.in/textbook.php?subject=English", label: "NCERT English" },
  "vyakaran": { url: "https://ncert.nic.in/textbook.php?subject=Hindi", label: "NCERT Hindi" },

  // ── Generic subject-level fallbacks ──
  "algebra": { url: "https://ncert.nic.in/textbook.php?subject=Mathematics", label: "NCERT Mathematics" },
  "geometry": { url: "https://ncert.nic.in/textbook.php?subject=Mathematics", label: "NCERT Mathematics" },
};

// CBSE official syllabus URLs by class
const CBSE_SYLLABUS_URLS: Record<string, string> = {
  "1": "https://cbseacademic.nic.in/curriculum_2024.html",
  "2": "https://cbseacademic.nic.in/curriculum_2024.html",
  "3": "https://cbseacademic.nic.in/curriculum_2024.html",
  "4": "https://cbseacademic.nic.in/curriculum_2024.html",
  "5": "https://cbseacademic.nic.in/curriculum_2024.html",
  "6": "https://cbseacademic.nic.in/curriculum_2024.html",
  "7": "https://cbseacademic.nic.in/curriculum_2024.html",
  "8": "https://cbseacademic.nic.in/curriculum_2024.html",
  "9": "https://cbseacademic.nic.in/curriculum_2024.html",
  "10": "https://cbseacademic.nic.in/curriculum_2024.html",
  "11": "https://cbseacademic.nic.in/curriculum_2024.html",
  "12": "https://cbseacademic.nic.in/curriculum_2024.html",
};

/**
 * Get a syllabus reference URL for a missing topic
 * Returns URL and label for the reference link
 */
export function getSyllabusReferenceForTopic(topic: string, subject?: string): SyllabusReference | null {
  const normalizedTopic = topic.toLowerCase().trim();
  const normalizedSubject = subject?.toLowerCase().trim() || "";
  
  // First, check for specific topic/chapter matches
  for (const [keyword, reference] of Object.entries(GRADE_TOPIC_CHAPTERS)) {
    if (normalizedTopic.includes(keyword.toLowerCase())) {
      return reference;
    }
  }
  
  // If no specific topic match, try subject-based URL
  if (normalizedSubject && NCERT_SUBJECT_URLS[normalizedSubject]) {
    return {
      url: NCERT_SUBJECT_URLS[normalizedSubject],
      label: `NCERT ${normalizedSubject.charAt(0).toUpperCase() + normalizedSubject.slice(1)} Textbooks`,
    };
  }
  
  // Check if topic text contains subject keywords
  for (const [subjectKey, url] of Object.entries(NCERT_SUBJECT_URLS)) {
    if (normalizedTopic.includes(subjectKey)) {
      return { url, label: `NCERT ${subjectKey.charAt(0).toUpperCase() + subjectKey.slice(1)} Textbooks` };
    }
  }
  
  // No reliable reference found
  return null;
}

/**
 * Resource URL mappings for recommendation items
 * Maps resource names/keywords to official URLs
 */
const RESOURCE_URL_MAPPINGS: Record<string, { url: string; pattern: RegExp }> = {
  // Khan Academy – subject-specific landing pages
  "khan_academy_algebra": { url: "https://www.khanacademy.org/math/algebra", pattern: /khan\s*academy\s*algebra/i },
  "khan_academy_geometry": { url: "https://www.khanacademy.org/math/geometry", pattern: /khan\s*academy\s*geometry/i },
  "khan_academy_trigonometry": { url: "https://www.khanacademy.org/math/trigonometry", pattern: /khan\s*academy\s*trigonometry/i },
  "khan_academy_calculus": { url: "https://www.khanacademy.org/math/calculus-1", pattern: /khan\s*academy\s*calculus/i },
  "khan_academy_precalculus": { url: "https://www.khanacademy.org/math/precalculus", pattern: /khan\s*academy\s*precalculus/i },
  "khan_academy_statistics": { url: "https://www.khanacademy.org/math/statistics-probability", pattern: /khan\s*academy\s*statistic/i },
  "khan_academy_arithmetic": { url: "https://www.khanacademy.org/math/arithmetic", pattern: /khan\s*academy\s*(arithmetic|basic\s*math)/i },
  "khan_academy_physics": { url: "https://www.khanacademy.org/science/physics", pattern: /khan\s*academy\s*physics/i },
  "khan_academy_chemistry": { url: "https://www.khanacademy.org/science/chemistry", pattern: /khan\s*academy\s*chemistry/i },
  "khan_academy_biology": { url: "https://www.khanacademy.org/science/biology", pattern: /khan\s*academy\s*biology/i },
  "khan_academy_math": { url: "https://www.khanacademy.org/math", pattern: /khan\s*academy\s*(math|mathematics)/i },
  "khan_academy_science": { url: "https://www.khanacademy.org/science", pattern: /khan\s*academy\s*science/i },
  "khan_academy": { url: "https://www.khanacademy.org/", pattern: /khan\s*academy/i },

  // NCERT – subject-specific textbook pages
  "ncert_math_6": { url: "https://ncert.nic.in/textbook.php?fhma1=0-0", pattern: /ncert\s*(class\s*6)\s*math/i },
  "ncert_math_7": { url: "https://ncert.nic.in/textbook.php?ghma1=0-0", pattern: /ncert\s*(class\s*7)\s*math/i },
  "ncert_math_8": { url: "https://ncert.nic.in/textbook.php?hemh1=0-0", pattern: /ncert\s*(class\s*8)\s*math/i },
  "ncert_math_9": { url: "https://ncert.nic.in/textbook.php?iemh1=0-0", pattern: /ncert\s*(class\s*9)\s*math/i },
  "ncert_math_10": { url: "https://ncert.nic.in/textbook.php?jemh1=0-0", pattern: /ncert\s*(class\s*10)\s*math/i },
  "ncert_math_11": { url: "https://ncert.nic.in/textbook.php?kemh1=0-0", pattern: /ncert\s*(class\s*11)\s*math/i },
  "ncert_math_12": { url: "https://ncert.nic.in/textbook.php?lemh1=0-0", pattern: /ncert\s*(class\s*12)\s*math/i },
  "ncert_science_10": { url: "https://ncert.nic.in/textbook.php?jesc1=0-0", pattern: /ncert\s*(class\s*10)\s*science/i },
  "ncert_textbook": { url: "https://ncert.nic.in/textbook.php", pattern: /ncert\s*(text)?books?/i },
  "ncert": { url: "https://ncert.nic.in/", pattern: /ncert/i },

  // CBSE resources
  "cbse_math": { url: "https://cbseacademic.nic.in/curriculum_2024.html", pattern: /cbse\s*math/i },
  "cbse_worksheets": { url: "https://cbseacademic.nic.in/supportive-material.html", pattern: /cbse\s*(worksheet|practice\s*paper|sample\s*paper|mock\s*test)/i },
  "cbse": { url: "https://cbseacademic.nic.in/curriculum_2024.html", pattern: /cbse\s*(syllabus|curriculum|academic|textbook)?/i },
  "icse": { url: "https://www.cisce.org/", pattern: /icse|cisce/i },

  // Practice & worksheets
  "practice_papers": { url: "https://cbseacademic.nic.in/supportive-material.html", pattern: /practice\s*(papers?|exercises?|worksheets?)/i },
  "mock_tests": { url: "https://cbseacademic.nic.in/supportive-material.html", pattern: /mock\s*test/i },
  "sample_papers": { url: "https://cbseacademic.nic.in/supportive-material.html", pattern: /sample\s*papers?/i },

  // Government education portals
  "diksha": { url: "https://diksha.gov.in/", pattern: /diksha/i },
  "swayam": { url: "https://swayam.gov.in/", pattern: /swayam/i },
  "nptel": { url: "https://nptel.ac.in/", pattern: /nptel/i },

  // Exam references
  "sat": { url: "https://satsuite.collegeboard.org/sat", pattern: /\bsat\b/i },
  "ap_exam": { url: "https://apstudents.collegeboard.org/", pattern: /\bap\s*(exam|course|class)?s?\b/i },
  "ielts": { url: "https://www.ielts.org/", pattern: /ielts/i },
  "toefl": { url: "https://www.ets.org/toefl", pattern: /toefl/i },
  "jee": { url: "https://jeemain.nta.nic.in/", pattern: /\bjee\b/i },
  "neet": { url: "https://neet.nta.nic.in/", pattern: /\bneet\b/i },
  "olympiad": { url: "https://olympiads.hbcse.tifr.res.in/", pattern: /olympiad/i },

  // International curriculum
  "ib": { url: "https://www.ibo.org/programmes/", pattern: /\bib\b|\binternational\s*baccalaureate\b/i },
  "igcse": { url: "https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-secondary-2/cambridge-igcse/", pattern: /igcse|cambridge/i },

  // Language
  "hindi_learning": { url: "https://ncert.nic.in/textbook.php?subject=Hindi", pattern: /hindi\s*(language|learning|proficiency|vocabulary|conversations?)?/i },
  "sanskrit": { url: "https://ncert.nic.in/textbook.php?subject=Sanskrit", pattern: /sanskrit/i },

  // Government
  "mhrd": { url: "https://www.education.gov.in/", pattern: /ministry|mhrd|education\s*ministry/i },
  "ugc": { url: "https://www.ugc.ac.in/", pattern: /\bugc\b/i },
};

/**
 * Extract resource URL from a recommendation text
 */
export function getResourceUrlFromText(text: string): { url: string; matchedText: string } | null {
  const normalizedText = text.toLowerCase();
  
  for (const [, mapping] of Object.entries(RESOURCE_URL_MAPPINGS)) {
    const match = normalizedText.match(mapping.pattern);
    if (match) {
      return {
        url: mapping.url,
        matchedText: match[0],
      };
    }
  }
  
  return null;
}

/**
 * Render recommendation text with hyperlinked resource names
 */
export function parseRecommendationWithLinks(text: string): Array<{ type: 'text' | 'link'; content: string; url?: string }> {
  const parts: Array<{ type: 'text' | 'link'; content: string; url?: string }> = [];
  let lastIndex = 0;
  
  const matches: Array<{ start: number; end: number; text: string; url: string }> = [];
  
  for (const [, mapping] of Object.entries(RESOURCE_URL_MAPPINGS)) {
    let match;
    const regex = new RegExp(mapping.pattern.source, 'gi');
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0],
        url: mapping.url,
      });
    }
  }
  
  matches.sort((a, b) => a.start - b.start);
  const filteredMatches = matches.filter((match, index) => {
    if (index === 0) return true;
    return match.start >= matches[index - 1].end;
  });
  
  for (const match of filteredMatches) {
    if (match.start > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.start) });
    }
    parts.push({ type: 'link', content: match.text, url: match.url });
    lastIndex = match.end;
  }
  
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }
  
  if (parts.length === 0) {
    parts.push({ type: 'text', content: text });
  }
  
  return parts;
}

/**
 * Get CBSE syllabus URL for a specific grade
 */
export function getCBSESyllabusUrl(grade?: string | number): string {
  const gradeStr = String(grade || "");
  return CBSE_SYLLABUS_URLS[gradeStr] || "https://cbseacademic.nic.in/curriculum_2024.html";
}

/**
 * Get NCERT textbook URL for a specific subject
 */
export function getNCERTSubjectUrl(subject?: string): string {
  const normalizedSubject = subject?.toLowerCase().trim() || "";
  return NCERT_SUBJECT_URLS[normalizedSubject] || "https://ncert.nic.in/textbook.php";
}
