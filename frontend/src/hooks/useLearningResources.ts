import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { topicLinks as buildTopicLinks, type TopicLink, type TopicResource } from "@/lib/topicLinks";

/**
 * Study resources for a report (textbooks, reference books, video lessons,
 * practice material) from the learning_resources table, and the links for each
 * gap topic from topic_resources. Every row is a link verified to show the
 * expected class and subject (backend/rag-pipeline/ingest/learning_resources.py
 * and topic_resources.py).
 */

/** reference: a reference book or question bank, linked to its publisher's page. */
export type ResourceType = "textbook" | "reference" | "video" | "practice";

export interface LearningResource {
  board: string;
  subject: string;
  grade_min: number;
  grade_max: number;
  resource_type: ResourceType;
  provider: string;
  title: string;
  url: string;
  /** Hindi/Sanskrit material pitched at a learner's level rather than a class; null = class material. */
  level: "beginner" | "intermediate" | null;
  /** A textbook published in parts (Part-I, Part-II): one entry, a link per part. */
  parts?: { label: string; url: string }[];
}

/** Familiarity picked on the form's language card (languageProficiencies);
 * "new": never studied, picked for the new-school language. */
export type LanguageFamiliarity = "new" | "beginner" | "intermediate" | "fluent";

export interface ResourceGroup {
  heading: string;
  items: LearningResource[];
}

/** Languages with level-based resources: report subject label -> key. */
export function levelledLanguage(label: string): "hindi" | "sanskrit" | null {
  const s = label.toLowerCase();
  return s.includes("sanskrit") ? "sanskrit" : s.startsWith("hindi") ? "hindi" : null;
}

/**
 * Where a student should start in Hindi or Sanskrit, from the familiarity
 * picked on the form (undefined: the language wasn't marked as known).
 */
export function languageStartNote(subject: string, grade: number, familiarity?: LanguageFamiliarity): string {
  switch (familiarity) {
    case "fluent":
      return `Marked as Fluent: spoken ${subject} is in place, so the gaps are mainly reading, writing and grammar at Class ${grade} level.`;
    case "intermediate":
      return `Marked as Intermediate: the basics are there; focus on grammar and writing with the next-step and Class ${grade} material.`;
    case "beginner":
      return `Marked as Beginner: build the script and everyday words with the starter resources first, then move up to Class ${grade} material.`;
    case "new":
      return `Marked as New to ${subject}: start from the script and everyday words with the starter resources, then work up to Class ${grade} material.`;
    default:
      return `Not marked as known on the form: start with the starter resources, then work up to Class ${grade} material.`;
  }
}

/**
 * Resource board for a target board and entry grade. CISCE has two syllabuses:
 * ISC for Classes 11-12 and ICSE for 9-10; below that the report compares
 * against NCERT, so NCERT material is what matches it.
 */
export function resourceBoard(targetGoal: string | undefined, grade: number | undefined): "cbse" | "isc" | "icse" | null {
  const board = (targetGoal || "").toLowerCase();
  if (board === "cbse" || board === "ncert") return "cbse";
  if (board === "icse" || board === "isc" || board === "cisce") {
    if (grade && grade >= 11) return "isc";
    return grade && grade >= 9 ? "icse" : "cbse";
  }
  return null; // IB / Cambridge: no catalogue yet
}

/** Report subject label -> resource subject keys. */
export function resourceSubjectKeys(label: string, grade?: number): string[] {
  const s = label.toLowerCase();
  const keys: string[] = [];
  if (s.startsWith("english")) keys.push("english");
  else if (/math/.test(s)) keys.push("mathematics");
  else if (/social science|social studies/.test(s)) keys.push("social-science");
  else if (/evs|world around|environmental/.test(s)) keys.push("evs");
  else if (/business/.test(s)) keys.push("business-studies");
  else if (/commercial/.test(s)) keys.push("commercial-studies");
  else if (/political/.test(s)) keys.push("political-science");
  else if (/computer/.test(s)) keys.push("computer-science");
  else if (/accountan|accounts/.test(s)) keys.push("accountancy");
  else {
    for (const k of ["physics", "chemistry", "biology", "economics", "history", "geography", "hindi", "sanskrit", "science"]) {
      if (s.includes(k)) { keys.push(k); break; }
    }
  }
  // Up to Class 10 these are parts of Social Science, whose books cover them.
  if (grade !== undefined && grade <= 10 && keys.some((k) => ["history", "geography", "economics", "political-science"].includes(k))) {
    keys.push("social-science");
  }
  return keys;
}

const TYPE_ORDER: Record<ResourceType, number> = { textbook: 0, reference: 1, video: 2, practice: 3 };

/**
 * Order inside a group of the subject card: the classic reference books first
 * (H.C. Verma, R.S. Aggarwal, Lakhmir Singh, Selina...), then question banks;
 * the class's own course before general channels; free solutions and official
 * papers before solution sites. Providers not listed keep catalogue order.
 */
const PROVIDER_RANK: Partial<Record<ResourceType, string[]>> = {
  reference: ["Bharati Bhawan", "S. Chand", "Selina Publishers", "Pradeep Publications", "Trueman Book Company", "VK Global",
    "Nageen Prakashan", "Oswaal Books", "Arihant", "Full Marks"],
  video: ["Khan Academy", "YouTube", "DIKSHA"],
  practice: ["KnowledgeBoat", "CBSE", "CISCE", "NCERT", "Khan Academy", "ICSEHELP", "Vedantu", "BYJU'S"],
};

const rankOf = (r: LearningResource) => {
  const i = PROVIDER_RANK[r.resource_type]?.indexOf(r.provider) ?? -1;
  return i === -1 ? 99 : i;
};

/** Up to `limit` items, a different provider each time while one is left. */
function diverse(items: LearningResource[], limit: number): LearningResource[] {
  const picked: LearningResource[] = [];
  const providers = new Set<string>();
  for (const pass of [0, 1]) {
    for (const r of items) {
      if (picked.length >= limit) break;
      if (picked.includes(r) || (pass === 0 && providers.has(r.provider))) continue;
      picked.push(r);
      providers.add(r.provider);
    }
  }
  return picked;
}

/** NCERT book code from a catalogue link (textbook.php?hegp1=0-7 -> "hegp"); parts of one book share it. */
const bookCode = (url: string): string | undefined => /textbook\.php\?([a-z]+)\d+=/i.exec(url)?.[1]?.toLowerCase();

/**
 * Textbooks for a subject card. With the book codes behind the subject's
 * chapters (sent by analyze-curriculum), only that book is shown: the
 * catalogue also lists the editions NCERT replaced (Class 8 "Mathematics"
 * next to "Ganita Prakash"). Without them (older reports, ISC) up to two
 * books are kept. A book's parts are always one entry.
 */
function pickTextbooks(textbooks: LearningResource[], codes: string[] | undefined): LearningResource[] {
  const matching = codes?.length ? textbooks.filter((t) => codes.includes(bookCode(t.url) ?? "")) : [];
  const pool = matching.length > 0 ? matching : textbooks;
  const books = new Map<string, LearningResource[]>();
  for (const t of pool) {
    const key = bookCode(t.url) ?? t.url;
    books.set(key, [...(books.get(key) ?? []), t]);
  }
  const merged = [...books.values()].map((parts) =>
    parts.length === 1
      ? parts[0]
      : {
          ...parts[0],
          title: parts[0].title.replace(/\s*Part-?\s*[IVX]+\b/i, ""),
          // "Ganita Manjari" + "Ganita Manjari PART-II": unnumbered parts count in Roman numerals too.
          parts: parts.map((p, i) => ({
            label: `Part ${(/Part-?\s*([IVX]+)\b/i.exec(p.title)?.[1] ?? ["I", "II", "III", "IV"][i] ?? String(i + 1)).toUpperCase()}`,
            url: p.url,
          })),
        }
  );
  return merged.slice(0, matching.length > 0 ? 1 : 2);
}

export function useLearningResources(targetGoal: string | undefined, grade: number | undefined) {
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [topicRows, setTopicRows] = useState<TopicResource[]>([]);
  const board = resourceBoard(targetGoal, grade);

  useEffect(() => {
    if (!board || !grade) {
      setResources([]);
      return;
    }
    let cancelled = false;
    // Cast through a loose type: integrations/supabase/types.ts predates the table.
    const from = supabase.from.bind(supabase) as unknown as (t: string) => {
      select: (c: string) => {
        in: (col: string, v: string[]) => {
          lte: (col: string, v: number) => {
            gte: (col: string, v: number) => PromiseLike<{ data: LearningResource[] | null; error: { message: string } | null }>;
          };
        };
      };
    };
    from("learning_resources")
      .select("board, subject, grade_min, grade_max, resource_type, provider, title, url, level")
      .in("board", [board, "any"])
      .lte("grade_min", grade)
      .gte("grade_max", grade)
      .then(({ data, error }) => {
        if (!cancelled) setResources(error ? [] : data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [board, grade]);

  // Links for the gap topics of the entry class and the class before it (the
  // report's target window). Until the table exists the query fails: no rows,
  // and topicLinks falls back to the link saved in the report.
  useEffect(() => {
    if (!board || !grade) {
      setTopicRows([]);
      return;
    }
    let cancelled = false;
    const from = supabase.from.bind(supabase) as unknown as (t: string) => {
      select: (c: string) => {
        eq: (col: string, v: string) => {
          gte: (col: string, v: number) => {
            lte: (col: string, v: number) => PromiseLike<{ data: TopicResource[] | null; error: { message: string } | null }>;
          };
        };
      };
    };
    from("topic_resources")
      .select("board, grade, subject, topic, resource_type, provider, title, url")
      .eq("board", board)
      .gte("grade", grade - 1)
      .lte("grade", grade)
      .then(({ data, error }) => {
        if (!cancelled) setTopicRows(error ? [] : data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [board, grade]);

  /** Class material for one report subject: its textbook first, then videos, then practice (reference books: subjectGroups). */
  const forSubject = (label: string, limit = 4, bookCodes?: string[]): LearningResource[] => {
    const keys = resourceSubjectKeys(label, grade);
    const seen = new Set<string>();
    const items = resources
      .filter((r) => !r.level && r.resource_type !== "reference" && keys.includes(r.subject))
      .sort((a, b) => TYPE_ORDER[a.resource_type] - TYPE_ORDER[b.resource_type])
      .filter((r) => !seen.has(r.url) && seen.add(r.url));
    const textbooks = pickTextbooks(items.filter((r) => r.resource_type === "textbook"), bookCodes);
    return [...textbooks, ...items.filter((r) => r.resource_type !== "textbook")].slice(0, limit);
  };

  /**
   * "Where to study" on a subject card, by kind: the textbook, two or three
   * reference books, then video lessons and practice. Each group mixes
   * providers; material for every subject ('*': DIKSHA, the ICSE channels,
   * sample papers) only fills places the subject's own material leaves.
   */
  const subjectGroups = (label: string, bookCodes?: string[]): ResourceGroup[] => {
    const keys = resourceSubjectKeys(label, grade);
    const classMaterial = resources.filter((r) => !r.level);
    const ofKind = (type: ResourceType) => {
      const byRank = (a: LearningResource, b: LearningResource) => rankOf(a) - rankOf(b);
      const own = classMaterial.filter((r) => r.resource_type === type && keys.includes(r.subject)).sort(byRank);
      const general = classMaterial.filter((r) => r.resource_type === type && r.subject === "*").sort(byRank);
      const seen = new Set<string>();
      return [...own, ...general].filter((r) => !seen.has(r.url) && seen.add(r.url));
    };
    const groups: ResourceGroup[] = [
      { heading: "Textbook", items: pickTextbooks(ofKind("textbook"), bookCodes) },
      { heading: "Reference books", items: diverse(ofKind("reference"), 3) },
      { heading: "Video lessons", items: diverse(ofKind("video"), 3) },
      { heading: "Practice", items: diverse(ofKind("practice"), 3) },
    ];
    return groups.filter((g) => g.items.length > 0);
  };

  /** Chapter, lesson, solutions and videos for one gap topic (lib/topicLinks). */
  const topicLinks = (topic: string, subject: string, topicGrade: number | undefined, savedUrl?: string): TopicLink[] =>
    buildTopicLinks(topicRows, { board, topic, subject, grade: topicGrade ?? grade, savedUrl });

  /**
   * Hindi/Sanskrit resources grouped by where the student should start: a
   * newcomer gets starter material first, a fluent speaker only class material.
   */
  const forLanguage = (label: string, familiarity?: LanguageFamiliarity, perGroup = 3, bookCodes?: string[]): ResourceGroup[] => {
    const lang = levelledLanguage(label);
    const atLevel = (level: "beginner" | "intermediate") =>
      resources.filter((r) => r.subject === lang && r.level === level).slice(0, perGroup);
    const groups: ResourceGroup[] = [
      { heading: "Start here (new to the language)", items: familiarity === "fluent" || familiarity === "intermediate" ? [] : atLevel("beginner") },
      { heading: "Next step", items: familiarity === "fluent" ? [] : atLevel("intermediate") },
      { heading: `Class ${grade} material`, items: forSubject(label, perGroup + 1, bookCodes) },
    ];
    // A book can be both a next step and class material (Class 10 Vyakaranavithi): show it once.
    const seen = new Set<string>();
    return groups
      .map((g) => ({ ...g, items: g.items.filter((r) => !seen.has(r.url) && seen.add(r.url)).slice(0, perGroup) }))
      .filter((g) => g.items.length > 0);
  };

  /**
   * One type across the report's subjects, class material only: resources for
   * every subject ('*') first, then one per subject in the given order before
   * any subject gets a second, so the last subjects aren't cut off by the limit.
   */
  const ofType = (type: ResourceType, subjectLabels: string[], limit = 6): LearningResource[] => {
    const ofThisType = resources.filter((r) => !r.level && r.resource_type === type);
    const perSubject = subjectLabels.map((l) => {
      const keys = resourceSubjectKeys(l, grade);
      return ofThisType.filter((r) => keys.includes(r.subject));
    });
    const picked = ofThisType.filter((r) => r.subject === "*");
    for (let i = 0; perSubject.some((list) => i < list.length); i++) {
      for (const list of perSubject) if (list[i]) picked.push(list[i]);
    }
    const seen = new Set<string>();
    // One row per provider first, so the list isn't six Khan Academy courses.
    return diverse(picked.filter((r) => !seen.has(r.url) && seen.add(r.url)), limit);
  };

  return { board, resources, forSubject, subjectGroups, forLanguage, ofType, topicLinks };
}
