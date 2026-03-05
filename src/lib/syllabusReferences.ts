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

// Topic keyword to specific NCERT chapter references
const TOPIC_KEYWORDS: Record<string, SyllabusReference> = {
  // Mathematics topics
  "quadratic": { url: "https://ncert.nic.in/textbook.php?jemh1=4-4", label: "NCERT Class 10 Ch.4" },
  "polynomial": { url: "https://ncert.nic.in/textbook.php?jemh1=2-2", label: "NCERT Class 10 Ch.2" },
  "trigonometry": { url: "https://ncert.nic.in/textbook.php?jemh1=8-8", label: "NCERT Class 10 Ch.8" },
  "coordinate geometry": { url: "https://ncert.nic.in/textbook.php?jemh1=7-7", label: "NCERT Class 10 Ch.7" },
  "mensuration": { url: "https://ncert.nic.in/textbook.php?hemh1=11-11", label: "NCERT Class 8 Ch.11" },
  "surface area": { url: "https://ncert.nic.in/textbook.php?jemh1=13-13", label: "NCERT Class 10 Ch.13" },
  "probability": { url: "https://ncert.nic.in/textbook.php?jemh1=15-15", label: "NCERT Class 10 Ch.15" },
  "statistics": { url: "https://ncert.nic.in/textbook.php?jemh1=14-14", label: "NCERT Class 10 Ch.14" },
  "linear equations": { url: "https://ncert.nic.in/textbook.php?jemh1=3-3", label: "NCERT Class 10 Ch.3" },
  "arithmetic progression": { url: "https://ncert.nic.in/textbook.php?jemh1=5-5", label: "NCERT Class 10 Ch.5" },
  "circles": { url: "https://ncert.nic.in/textbook.php?jemh1=10-10", label: "NCERT Class 10 Ch.10" },
  "triangles": { url: "https://ncert.nic.in/textbook.php?jemh1=6-6", label: "NCERT Class 10 Ch.6" },
  "constructions": { url: "https://ncert.nic.in/textbook.php?jemh1=11-11", label: "NCERT Class 10 Ch.11" },
  "real numbers": { url: "https://ncert.nic.in/textbook.php?jemh1=1-1", label: "NCERT Class 10 Ch.1" },
  "algebra": { url: "https://ncert.nic.in/textbook.php?subject=Mathematics", label: "NCERT Math" },
  "geometry": { url: "https://ncert.nic.in/textbook.php?subject=Mathematics", label: "NCERT Math" },
  "calculus": { url: "https://ncert.nic.in/textbook.php?lemh1=0-0", label: "NCERT Class 12 Math" },
  "matrices": { url: "https://ncert.nic.in/textbook.php?lemh1=3-3", label: "NCERT Class 12 Ch.3" },
  "determinants": { url: "https://ncert.nic.in/textbook.php?lemh1=4-4", label: "NCERT Class 12 Ch.4" },
  "vectors": { url: "https://ncert.nic.in/textbook.php?lemh2=10-10", label: "NCERT Class 12 Ch.10" },
  "integration": { url: "https://ncert.nic.in/textbook.php?lemh1=7-7", label: "NCERT Class 12 Ch.7" },
  "differentiation": { url: "https://ncert.nic.in/textbook.php?lemh1=5-5", label: "NCERT Class 12 Ch.5" },
  
  // Science topics
  "chemical reactions": { url: "https://ncert.nic.in/textbook.php?jesc1=1-1", label: "NCERT Class 10 Ch.1" },
  "acids bases": { url: "https://ncert.nic.in/textbook.php?jesc1=2-2", label: "NCERT Class 10 Ch.2" },
  "metals non-metals": { url: "https://ncert.nic.in/textbook.php?jesc1=3-3", label: "NCERT Class 10 Ch.3" },
  "carbon compounds": { url: "https://ncert.nic.in/textbook.php?jesc1=4-4", label: "NCERT Class 10 Ch.4" },
  "periodic classification": { url: "https://ncert.nic.in/textbook.php?jesc1=5-5", label: "NCERT Class 10 Ch.5" },
  "life processes": { url: "https://ncert.nic.in/textbook.php?jesc1=6-6", label: "NCERT Class 10 Ch.6" },
  "control coordination": { url: "https://ncert.nic.in/textbook.php?jesc1=7-7", label: "NCERT Class 10 Ch.7" },
  "reproduction": { url: "https://ncert.nic.in/textbook.php?jesc1=8-8", label: "NCERT Class 10 Ch.8" },
  "heredity evolution": { url: "https://ncert.nic.in/textbook.php?jesc1=9-9", label: "NCERT Class 10 Ch.9" },
  "light": { url: "https://ncert.nic.in/textbook.php?jesc1=10-10", label: "NCERT Class 10 Ch.10" },
  "human eye": { url: "https://ncert.nic.in/textbook.php?jesc1=11-11", label: "NCERT Class 10 Ch.11" },
  "electricity": { url: "https://ncert.nic.in/textbook.php?jesc1=12-12", label: "NCERT Class 10 Ch.12" },
  "magnetic effects": { url: "https://ncert.nic.in/textbook.php?jesc1=13-13", label: "NCERT Class 10 Ch.13" },
  "sources of energy": { url: "https://ncert.nic.in/textbook.php?jesc1=14-14", label: "NCERT Class 10 Ch.14" },
  "environment": { url: "https://ncert.nic.in/textbook.php?jesc1=15-15", label: "NCERT Class 10 Ch.15" },
  "natural resources": { url: "https://ncert.nic.in/textbook.php?jesc1=16-16", label: "NCERT Class 10 Ch.16" },
  "photosynthesis": { url: "https://ncert.nic.in/textbook.php?kebo1=13-13", label: "NCERT Class 11 Ch.13" },
  "cell biology": { url: "https://ncert.nic.in/textbook.php?kebo1=8-8", label: "NCERT Class 11 Ch.8" },
  "genetics": { url: "https://ncert.nic.in/textbook.php?lebo1=5-5", label: "NCERT Class 12 Ch.5" },
  "evolution": { url: "https://ncert.nic.in/textbook.php?lebo1=7-7", label: "NCERT Class 12 Ch.7" },
  
  // Social Studies topics
  "indian freedom movement": { url: "https://ncert.nic.in/textbook.php?jess3=0-0", label: "NCERT History" },
  "french revolution": { url: "https://ncert.nic.in/textbook.php?iess2=1-1", label: "NCERT Class 9 Ch.1" },
  "russian revolution": { url: "https://ncert.nic.in/textbook.php?iess2=2-2", label: "NCERT Class 9 Ch.2" },
  "nazism": { url: "https://ncert.nic.in/textbook.php?iess2=3-3", label: "NCERT Class 9 Ch.3" },
  "democracy": { url: "https://ncert.nic.in/textbook.php?jess3=0-0", label: "NCERT Civics" },
  "federalism": { url: "https://ncert.nic.in/textbook.php?jess3=2-2", label: "NCERT Class 10 Ch.2" },
  "globalisation": { url: "https://ncert.nic.in/textbook.php?jess4=4-4", label: "NCERT Class 10 Eco Ch.4" },
  "development": { url: "https://ncert.nic.in/textbook.php?jess4=1-1", label: "NCERT Class 10 Eco Ch.1" },
  "sectors of economy": { url: "https://ncert.nic.in/textbook.php?jess4=2-2", label: "NCERT Class 10 Eco Ch.2" },
  "consumer rights": { url: "https://ncert.nic.in/textbook.php?jess4=5-5", label: "NCERT Class 10 Eco Ch.5" },
  "resources": { url: "https://ncert.nic.in/textbook.php?jess1=1-1", label: "NCERT Class 10 Geo Ch.1" },
  "agriculture": { url: "https://ncert.nic.in/textbook.php?jess1=4-4", label: "NCERT Class 10 Geo Ch.4" },
  "industries": { url: "https://ncert.nic.in/textbook.php?jess1=6-6", label: "NCERT Class 10 Geo Ch.6" },
  
  // Language topics
  "grammar": { url: "https://ncert.nic.in/textbook.php?subject=English", label: "NCERT English" },
  "comprehension": { url: "https://ncert.nic.in/textbook.php?subject=English", label: "NCERT English" },
  "writing skills": { url: "https://ncert.nic.in/textbook.php?subject=English", label: "NCERT English" },
  "vyakaran": { url: "https://ncert.nic.in/textbook.php?subject=Hindi", label: "NCERT Hindi" },
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
  
  // First, check for specific topic keyword matches
  for (const [keyword, reference] of Object.entries(TOPIC_KEYWORDS)) {
    if (normalizedTopic.includes(keyword.toLowerCase())) {
      return reference;
    }
  }
  
  // If no specific topic match, try subject-based URL
  if (normalizedSubject && NCERT_SUBJECT_URLS[normalizedSubject]) {
    return {
      url: NCERT_SUBJECT_URLS[normalizedSubject],
      label: "View syllabus reference",
    };
  }
  
  // Check if topic text contains subject keywords
  for (const [subjectKey, url] of Object.entries(NCERT_SUBJECT_URLS)) {
    if (normalizedTopic.includes(subjectKey)) {
      return { url, label: "View syllabus reference" };
    }
  }
  
  // No reliable reference found - omit the link rather than default to generic NCERT
  return null;
}

/**
 * Resource URL mappings for recommendation items
 * Maps resource names/keywords to official URLs
 */
const RESOURCE_URL_MAPPINGS: Record<string, { url: string; pattern: RegExp }> = {
  // Educational platforms (official, non-commercial references only)
  "khan_academy": { url: "https://www.khanacademy.org/", pattern: /khan\s*academy/i },
  "ncert": { url: "https://ncert.nic.in/", pattern: /ncert/i },
  "ncert_textbook": { url: "https://ncert.nic.in/textbook.php", pattern: /ncert\s*(text)?books?/i },
  "cbse": { url: "https://cbseacademic.nic.in/", pattern: /cbse\s*(syllabus|curriculum|academic)?/i },
  "icse": { url: "https://www.cisce.org/", pattern: /icse|cisce/i },
  "diksha": { url: "https://diksha.gov.in/", pattern: /diksha/i },
  "swayam": { url: "https://swayam.gov.in/", pattern: /swayam/i },
  "nptel": { url: "https://nptel.ac.in/", pattern: /nptel/i },
  
  // Official exam/test references
  "sat": { url: "https://satsuite.collegeboard.org/sat", pattern: /\bsat\b/i },
  "ap_exam": { url: "https://apstudents.collegeboard.org/", pattern: /\bap\s*(exam|course|class)?s?\b/i },
  "ielts": { url: "https://www.ielts.org/", pattern: /ielts/i },
  "toefl": { url: "https://www.ets.org/toefl", pattern: /toefl/i },
  "jee": { url: "https://jeemain.nta.nic.in/", pattern: /\bjee\b/i },
  "neet": { url: "https://neet.nta.nic.in/", pattern: /\bneet\b/i },
  "olympiad": { url: "https://olympiads.hbcse.tifr.res.in/", pattern: /olympiad/i },
  
  // International curriculum references
  "ib": { url: "https://www.ibo.org/programmes/", pattern: /\bib\b|\binternational\s*baccalaureate\b/i },
  "igcse": { url: "https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-secondary-2/cambridge-igcse/", pattern: /igcse|cambridge/i },
  
  // Language learning (official resources)
  "hindi_learning": { url: "https://ncert.nic.in/textbook.php?subject=Hindi", pattern: /hindi\s*(language|learning|proficiency)?/i },
  "sanskrit": { url: "https://ncert.nic.in/textbook.php?subject=Sanskrit", pattern: /sanskrit/i },
  
  // Government education portals
  "mhrd": { url: "https://www.education.gov.in/", pattern: /ministry|mhrd|education\s*ministry/i },
  "ugc": { url: "https://www.ugc.ac.in/", pattern: /\bugc\b/i },
};

/**
 * Extract resource URL from a recommendation text
 * Returns the URL if a recognized resource is mentioned, null otherwise
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
 * Returns the text with resource names wrapped in appropriate markup
 */
export function parseRecommendationWithLinks(text: string): Array<{ type: 'text' | 'link'; content: string; url?: string }> {
  const parts: Array<{ type: 'text' | 'link'; content: string; url?: string }> = [];
  let remainingText = text;
  let lastIndex = 0;
  
  // Find all matches and their positions
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
  
  // Sort by position and remove overlaps
  matches.sort((a, b) => a.start - b.start);
  const filteredMatches = matches.filter((match, index) => {
    if (index === 0) return true;
    return match.start >= matches[index - 1].end;
  });
  
  // Build parts array
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
  
  // If no matches found, return the whole text as a single part
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
