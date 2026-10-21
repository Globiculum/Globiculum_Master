import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Study resources for a report (textbooks, video lessons, practice material),
 * from the learning_resources table. Every row is a link verified to show the
 * expected class and subject (backend/rag-pipeline/ingest/learning_resources.py).
 */

export type ResourceType = "textbook" | "video" | "practice";

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
}

/** Familiarity picked on the form's language card (languageProficiencies). */
export type LanguageFamiliarity = "beginner" | "intermediate" | "fluent";

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
    default:
      return `Not marked as known on the form: start with the starter resources, then work up to Class ${grade} material.`;
  }
}

/**
 * Resource board for a target board and entry grade. ISC is CISCE's Classes
 * 11-12 syllabus; below that the report compares against NCERT, so NCERT
 * material is what matches it.
 */
export function resourceBoard(targetGoal: string | undefined, grade: number | undefined): "cbse" | "isc" | null {
  const board = (targetGoal || "").toLowerCase();
  if (board === "cbse" || board === "ncert") return "cbse";
  if (board === "icse" || board === "isc" || board === "cisce") return grade && grade >= 11 ? "isc" : "cbse";
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

const TYPE_ORDER: Record<ResourceType, number> = { textbook: 0, video: 1, practice: 2 };

export function useLearningResources(targetGoal: string | undefined, grade: number | undefined) {
  const [resources, setResources] = useState<LearningResource[]>([]);
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

  /** Class material for one report subject: textbooks first, then videos, then practice. */
  const forSubject = (label: string, limit = 4): LearningResource[] => {
    const keys = resourceSubjectKeys(label, grade);
    const seen = new Set<string>();
    return resources
      .filter((r) => !r.level && keys.includes(r.subject))
      .sort((a, b) => TYPE_ORDER[a.resource_type] - TYPE_ORDER[b.resource_type])
      .filter((r) => !seen.has(r.url) && seen.add(r.url))
      .slice(0, limit);
  };

  /**
   * Hindi/Sanskrit resources grouped by where the student should start: a
   * newcomer gets starter material first, a fluent speaker only class material.
   */
  const forLanguage = (label: string, familiarity?: LanguageFamiliarity, perGroup = 3): ResourceGroup[] => {
    const lang = levelledLanguage(label);
    const atLevel = (level: "beginner" | "intermediate") =>
      resources.filter((r) => r.subject === lang && r.level === level).slice(0, perGroup);
    const groups: ResourceGroup[] = [
      { heading: "Start here (new to the language)", items: familiarity === "fluent" || familiarity === "intermediate" ? [] : atLevel("beginner") },
      { heading: "Next step", items: familiarity === "fluent" ? [] : atLevel("intermediate") },
      { heading: `Class ${grade} material`, items: forSubject(label, perGroup + 1) },
    ];
    // A book can be both a next step and class material (Class 10 Vyakaranavithi): show it once.
    const seen = new Set<string>();
    return groups
      .map((g) => ({ ...g, items: g.items.filter((r) => !seen.has(r.url) && seen.add(r.url)).slice(0, perGroup) }))
      .filter((g) => g.items.length > 0);
  };

  /** One type across the report's subjects, plus resources for every subject ('*'). Class material only. */
  const ofType = (type: ResourceType, subjectLabels: string[], limit = 6): LearningResource[] => {
    const keys = new Set(subjectLabels.flatMap((l) => resourceSubjectKeys(l, grade)));
    const seen = new Set<string>();
    return resources
      .filter((r) => !r.level && r.resource_type === type && (r.subject === "*" || keys.has(r.subject)))
      .filter((r) => !seen.has(r.url) && seen.add(r.url))
      .slice(0, limit);
  };

  return { resources, forSubject, forLanguage, ofType };
}
