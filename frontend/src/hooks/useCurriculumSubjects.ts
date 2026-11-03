import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subjects for the assessment form, read from the curriculum database instead of
 * hardcoded arrays.
 *
 * Two copies of a 14-entry HIGHER_SECONDARY_SUBJECTS list used to live in
 * ParentStep2 and AcademicProfileStep. They drifted from the data: both offered
 * Psychology and Sociology, which are not ingested, so a student could select a
 * subject the gap engine has nothing to compare against — it then rendered as a
 * permanent "0% aligned" card in the report. They also had no notion of stream,
 * so a Commerce student was shown Physics/Chemistry/Biology.
 */

/**
 * Classes XI-XII streams, as stored in curriculum_nodes.metadata.streams for
 * CBSE and ISC (see backend/rag-pipeline/ingest/subject_streams.py). Science is
 * split because a Medical (PCB) student takes no Mathematics and a Non-Medical
 * (PCM) student no Biology; one "Science" option compared both against both.
 */
export type TargetStream = "science-pcm" | "science-pcb" | "commerce" | "humanities";

export interface CurriculumSubject {
  subject: string;
  nodeCount: number;
  streams: string[];
}

interface RawSubjectRow {
  subject: string;
  node_count: number;
  streams: string[] | null;
}

export const TARGET_STREAMS: { value: TargetStream; label: string; hint: string }[] = [
  { value: "science-pcm", label: "Science – Non-Medical (PCM)", hint: "Physics, Chemistry, Mathematics" },
  { value: "science-pcb", label: "Science – Medical (PCB)", hint: "Physics, Chemistry, Biology" },
  { value: "commerce", label: "Commerce", hint: "Accountancy, Business Studies, Economics" },
  { value: "humanities", label: "Humanities / Arts", hint: "History, Political Science, Geography" },
];

const STREAM_MIN_GRADE = 11;

/**
 * The grade the student will enter in India: the current grade, or the next
 * one when "Same grade, or move up?" is answered "next". Mirrors
 * resolveTargetGrade() in supabase/functions/analyze-curriculum/index.ts.
 */
export function entryGrade(snapshotGrade: string | undefined, targetGrade?: string): number | undefined {
  const g = parseInt(snapshotGrade || "", 10);
  if (!Number.isFinite(g)) return undefined;
  return Math.min(12, g + (targetGrade === "next" ? 1 : 0));
}

/**
 * Whether the stream question applies: the student enters Class XI or XII on a
 * board that streams them. IB and Cambridge don't, so asking would only be
 * ignored. A Grade 10 student moving up to Class 11 is asked too.
 */
export function gradeHasStream(snapshotGrade: string | undefined, targetBoard?: string, targetGrade?: string): boolean {
  const g = entryGrade(snapshotGrade, targetGrade);
  if (g === undefined || g < STREAM_MIN_GRADE) return false;
  const board = (targetBoard || "").toLowerCase();
  return !board || board === "cbse" || board === "icse";
}

/**
 * A saved stream as the form should hold it. Drafts and reports from before the
 * PCM/PCB split hold "science", which no longer says which subjects apply, so
 * it is cleared and the stream question is asked again.
 */
export function normalizeTargetStream(value: string | undefined): TargetStream | "" {
  return TARGET_STREAMS.some((s) => s.value === value) ? (value as TargetStream) : "";
}

export function targetStreamLabel(value: string | undefined): string | undefined {
  return TARGET_STREAMS.find((s) => s.value === value)?.label;
}

/**
 * Map the form's target-board value to a curriculum_system in the database.
 *
 * CISCE runs two syllabuses under one board — ICSE for classes 9-10, ISC for
 * 11-12 — so the same "icse" selection has to resolve differently by grade.
 * This mirrors mapToDBEntry() in supabase/functions/_shared/curriculumGaps.ts;
 * keep the two in step.
 */
export function targetBoardToCurriculumSystem(
  targetBoard: string | undefined,
  grade: number | undefined
): string | null {
  const board = (targetBoard || "").toLowerCase().trim();
  if (!board) return null;

  if (board === "icse" || board === "isc" || board === "cisce") {
    if (typeof grade === "number" && grade >= 11) return "isc-cisce";
    // ICSE Classes 9-10 have their own syllabus; 1-8 are compared with NCERT.
    return typeof grade === "number" && grade >= 9 ? "icse-cisce" : "ncert-cbse";
  }
  if (board === "cbse" || board === "ncert") return "ncert-cbse";
  // IB and Cambridge are not ingested yet; returning null lets the caller fall
  // back rather than querying for a curriculum_system that has no rows.
  return null;
}

// ─── US source subjects ──────────────────────────────────────────────────────

const US_STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "District of Columbia",
};

// Mirrors REGULAR_US_SELECTION_VALUES / HONORS_SELECTION_VALUES in
// supabase/functions/_shared/curriculumGaps.ts: only these selections make the
// student's state the source curriculum. An IB or Cambridge school in the US is
// not taught to state standards.
const STATE_SOURCE_SELECTIONS = new Set([
  "regular-us", "regular_us", "regular", "us-common-core", "common-core", "common_core",
  "state-specific", "state_specific", "ngss",
  "honors-advanced", "honors_advanced", "honors", "advanced",
]);

/**
 * curriculum_system holding this student's own state standards, or null when
 * the state isn't the source (not in the US, IB/Cambridge school, unknown state).
 */
export function usStateSourceSystem(
  snapshotLocation: string | undefined,
  usState: string | undefined,
  currentCurriculum: string[] | undefined
): string | null {
  if ((snapshotLocation || "").toLowerCase() !== "us") return null;
  const selections = (currentCurriculum || []).map((c) => c.toLowerCase().trim());
  if (!selections.some((c) => STATE_SOURCE_SELECTIONS.has(c))) return null;
  const name = US_STATE_NAMES[(usState || "").toUpperCase()];
  if (!name) return null;
  return `us-state-${name.toLowerCase().replace(/\s+/g, "-")}`;
}

const CANONICAL_ORDER = [
  "Mathematics", "English", "Science", "Social Studies", "Computer Science",
  "World Languages", "Arts", "Physical Education & Health", "Personal Finance",
];

// World Languages is left out at every grade on advisory guidance, although
// states publish standards for it; the Language Exposure section asks about
// foreign languages instead. It is not a core domain in the gap engine, so the
// report is unchanged. Arts and Physical Education & Health stay at every grade
// the state has them: most states require both from elementary school
// (ArtScan 2026; Shape of the Nation 2016), and our data has them from Grade 1
// in 44 and 48 of 51 states.
export const NOT_OFFERED_SUBJECTS = ["World Languages"];

function isOfferedSubject(subject: string): boolean {
  return !NOT_OFFERED_SUBJECTS.includes(subject);
}

export interface CanonicalSubject {
  subject: string;
  domain: string;
  isCore: boolean;
}

interface RawCanonicalRow {
  canonical_subject: string;
  domain: string;
  is_core: boolean;
}

/**
 * The subjects a student in this US state studies at this grade, as canonical
 * names ("Mathematics", "English", "Science", "Social Studies", "Computer
 * Science", plus electives) resolved from 1,000+ raw state labels by the
 * subject_mappings table. These names are the same vocabulary the gap engine
 * uses to decide which source domains a student has actually studied.
 */
export function useCanonicalSubjects({
  curriculumSystem,
  grade,
  enabled = true,
}: {
  curriculumSystem: string | null;
  grade?: number;
  enabled?: boolean;
}): { subjects: CanonicalSubject[]; loading: boolean; error: string | null } {
  const [subjects, setSubjects] = useState<CanonicalSubject[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Loading is derived from which request last finished rather than set inside
  // the effect: an effect runs after the first render, so a flag set there
  // reads false for one paint and the form briefly showed the fallback list.
  const g = typeof grade === "number" && Number.isFinite(grade) ? grade : null;
  const requestKey = enabled && curriculumSystem ? `${curriculumSystem}|${g}` : null;
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);
  const loading = requestKey !== null && resolvedKey !== requestKey;

  useEffect(() => {
    if (!requestKey || !curriculumSystem) {
      setSubjects([]);
      setError(null);
      return;
    }
    let cancelled = false;
    setError(null);

    // bind: rpc reads this.rest internally, so a detached reference throws.
    const rpc = supabase.rpc.bind(supabase) as unknown as (
      fn: string,
      args: Record<string, unknown>
    ) => PromiseLike<{ data: RawCanonicalRow[] | null; error: { message: string } | null }>;

    (async () => {
      try {
        const { data, error: rpcError } = await rpc("get_canonical_subjects", {
          p_curriculum_system: curriculumSystem,
          p_grade_min: g,
          p_grade_max: g,
          p_core_only: false,
          // Only subjects the state sets for this grade: without it, K-12
          // catch-all standards put World Languages and Personal Finance on
          // every grade's list (see migration 20261009000000).
          p_grade_specific: true,
        });
        if (cancelled) return;
        if (rpcError) {
          setError(rpcError.message);
          setSubjects([]);
          return;
        }
        // The database returns core subjects alphabetically; show them in the
        // order families expect, starting with Mathematics.
        const rank = (s: string) => {
          const i = CANONICAL_ORDER.indexOf(s);
          return i === -1 ? CANONICAL_ORDER.length : i;
        };
        setSubjects(
          (data ?? [])
            .filter((row) => isOfferedSubject(row.canonical_subject))
            .map((row) => ({
              subject: row.canonical_subject,
              domain: row.domain,
              isCore: row.is_core,
            }))
            .sort((a, b) => rank(a.subject) - rank(b.subject))
        );
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load subjects");
          setSubjects([]);
        }
      } finally {
        if (!cancelled) setResolvedKey(requestKey);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [requestKey, curriculumSystem, g]);

  return { subjects, loading, error };
}

// ─── target-board subjects ───────────────────────────────────────────────────

interface Options {
  curriculumSystem: string | null;
  grade?: number;
  // A stream ("science-pcm") returns its core subjects; "<stream>:optional"
  // returns the subjects a student of that stream may choose as electives.
  stream?: TargetStream | `${TargetStream}:optional` | null;
  enabled?: boolean;
}

interface Result {
  subjects: CurriculumSubject[];
  loading: boolean;
  error: string | null;
  /** True when the query ran successfully but the curriculum has no data. */
  empty: boolean;
}

export function useCurriculumSubjects({
  curriculumSystem,
  grade,
  stream,
  enabled = true,
}: Options): Result {
  const [subjects, setSubjects] = useState<CurriculumSubject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !curriculumSystem) {
      setSubjects([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    // Cast through a loose signature: integrations/supabase/types.ts is generated
    // and predates this function, so its Functions union does not list it yet.
    // Regenerating those types will make the cast unnecessary.
    // bind: rpc reads this.rest internally, so a detached reference throws.
    const rpc = supabase.rpc.bind(supabase) as unknown as (
      fn: string,
      args: Record<string, unknown>
    ) => PromiseLike<{ data: RawSubjectRow[] | null; error: { message: string } | null }>;

    (async () => {
      try {
        const { data, error: rpcError } = await rpc("get_curriculum_subjects", {
          p_curriculum_system: curriculumSystem,
          p_grade: typeof grade === "number" && Number.isFinite(grade) ? grade : null,
          p_stream: stream ?? null,
        });
        if (cancelled) return;
        if (rpcError) {
          setError(rpcError.message);
          setSubjects([]);
          return;
        }
        setSubjects(
          (data ?? []).map((row) => ({
            subject: row.subject,
            nodeCount: Number(row.node_count) || 0,
            streams: row.streams ?? [],
          }))
        );
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load subjects");
          setSubjects([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [curriculumSystem, grade, stream, enabled]);

  return {
    subjects,
    loading,
    error,
    empty: !loading && !error && subjects.length === 0,
  };
}

// Optional subjects with no US-side comparison: the gap engine compares US
// standards only in Maths, English, Science, Social Studies and Computer
// Science, so a US student who picked PE would get a card scoring every PE
// chapter as new (0%), though they do take PE at school.
const UNCOMPARED_OPTIONAL_SUBJECTS = ["Physical Education"];

/**
 * Each stream's optional subjects at the grade being entered, loaded together so
 * the School Profile knows, as soon as a stream is picked, whether to ask which
 * ones the student will take. Only subjects the report compares are returned.
 *
 * Only a US student is asked: a student already on the board rates the board's
 * electives as their current subjects on the Academic Path step.
 */
export function useStreamElectives(form: {
  snapshotLocation: string;
  usState: string;
  currentCurriculum: string[];
  snapshotGrade: string;
  targetGoal: string;
  targetGrade: string;
}): Record<TargetStream, string[]> {
  const grade = entryGrade(form.snapshotGrade, form.targetGrade);
  const options = {
    curriculumSystem: targetBoardToCurriculumSystem(form.targetGoal, grade),
    grade,
    enabled:
      !!usStateSourceSystem(form.snapshotLocation, form.usState, form.currentCurriculum) &&
      gradeHasStream(form.snapshotGrade, form.targetGoal, form.targetGrade),
  };
  const pcm = useCurriculumSubjects({ ...options, stream: "science-pcm:optional" }).subjects;
  const pcb = useCurriculumSubjects({ ...options, stream: "science-pcb:optional" }).subjects;
  const commerce = useCurriculumSubjects({ ...options, stream: "commerce:optional" }).subjects;
  const humanities = useCurriculumSubjects({ ...options, stream: "humanities:optional" }).subjects;

  return useMemo(() => {
    const names = (list: CurriculumSubject[]) =>
      list.map((s) => s.subject).filter((s) => !UNCOMPARED_OPTIONAL_SUBJECTS.includes(s));
    return {
      "science-pcm": names(pcm),
      "science-pcb": names(pcb),
      commerce: names(commerce),
      humanities: names(humanities),
    };
  }, [pcm, pcb, commerce, humanities]);
}

/** The optional subjects offered for a stream value as the form holds it. */
export function electivesForStream(electives: Record<TargetStream, string[]>, stream: string | undefined): string[] {
  const s = normalizeTargetStream(stream);
  return s ? electives[s] : [];
}
