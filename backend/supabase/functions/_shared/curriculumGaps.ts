// =============================================================================
// SHARED RAG GAP-ANALYSIS CORE — used by analyze-curriculum, diagnostics-engine,
// and alignment-engine.
//
// Before this module existed, the exact same curriculum registry, subject
// alias table, and per-subject percentile classification logic were
// hand-copied into all three functions independently. That already caused a
// real production incident: diagnostics-engine's classifier drifted from the
// other two, and the Guardian Dashboard showed a different readiness number
// than the parent/student report for the same student. Consolidating here
// means a future fix to the classification algorithm (or the curriculum
// registry) lands in one place instead of three.
//
// This module also adds a fix none of the three copies had: DOMAIN-AWARE
// coverage gating. The corpus currently ingested only has known, fixed
// subject coverage per curriculum system — NCERT/CBSE has (effectively)
// every subject, US Common Core has ONLY Math + English/ELA, NGSS has ONLY
// Science. No system in this database has ever taught Hindi, Sanskrit, or
// social studies to a US-curriculum student, and embedding similarity alone
// cannot reliably tell "weak real overlap" apart from "meaningless noise
// between two unrelated texts" — verified against production data: NCERT
// Hindi/Sanskrit topics matched against US Common Core Math/ELA text still
// produced similarity scores in the 0.21-0.36 range purely from incidental
// vocabulary/style overlap, high enough that a purely relative (percentile)
// classifier could still call some of them "covered". SOURCE_SYSTEM_DOMAINS
// below lets classifyGapsBySubject() short-circuit that: if the source
// curriculum(s) actually being queried structurally never teach a target
// subject's domain, every topic in it is a gap, full stop — no similarity
// number involved in that decision at all. Similarity is only used to rank
// severity *within* subjects the source curriculum plausibly could cover.
// =============================================================================

export interface CurriculumEntry {
  dbSystem: string;        // curriculum_system value in curriculum_nodes table
  nodeType: string | null; // node_type to filter on; null = all types
  label: string;           // human-readable name (used in LLM prompts)
}

// Single source of truth for all supported curricula. When a new curriculum
// is ingested into the DB, add one entry here (and, if it doesn't teach every
// subject, an entry in SOURCE_SYSTEM_DOMAINS below).
export const CURRICULUM_DB_REGISTRY: Record<string, CurriculumEntry> = {
  // ── Indian NCERT/CBSE system ────────────────────────────────────────────
  'cbse':          { dbSystem: 'ncert-cbse', nodeType: 'topic',    label: 'Indian CBSE (NCERT)' },
  'ncert':         { dbSystem: 'ncert-cbse', nodeType: 'topic',    label: 'Indian CBSE (NCERT)' },
  'icse':          { dbSystem: 'ncert-cbse', nodeType: 'topic',    label: 'Indian ICSE (NCERT-based)' },
  'state-board':   { dbSystem: 'ncert-cbse', nodeType: 'topic',    label: 'Indian State Board' },
  'ncert-cbse':    { dbSystem: 'ncert-cbse', nodeType: 'topic',    label: 'Indian CBSE (NCERT)' },
  'indian':        { dbSystem: 'ncert-cbse', nodeType: 'topic',    label: 'Indian Curriculum' },
  'india':         { dbSystem: 'ncert-cbse', nodeType: 'topic',    label: 'Indian Curriculum' },
  // ── US Common Core ──────────────────────────────────────────────────────
  'common-core':   { dbSystem: 'us-common-core', nodeType: 'standard', label: 'US Common Core' },
  'common_core':   { dbSystem: 'us-common-core', nodeType: 'standard', label: 'US Common Core' },
  'us-common-core':{ dbSystem: 'us-common-core', nodeType: 'standard', label: 'US Common Core' },
  'us':            { dbSystem: 'us-common-core', nodeType: 'standard', label: 'US Common Core' },
  // "State-Specific Standards" and "Honors / Advanced" both resolve to Common
  // Core as their BASE pool, because that's what they actually are: a state's
  // own math/ELA standards are Common Core-derived in ~41 states (California's
  // are literally published as "California Common Core State Standards"), and
  // honors/advanced is the same content accelerated, not different standards.
  // What genuinely differs per state — social studies — is layered on top via
  // the state social-studies merge in analyze-curriculum, keyed off the state
  // the form already collects. Before these entries existed, picking
  // "State-Specific Standards" on its own resolved to nothing, which skipped
  // RAG entirely and produced a generic LLM-only report.
  'state-specific':  { dbSystem: 'us-common-core', nodeType: 'standard', label: 'US State Standards' },
  'honors-advanced': { dbSystem: 'us-common-core', nodeType: 'standard', label: 'US Honors / Advanced' },
  // ── NGSS (US Science) — Common Core only covers Math/ELA, so this is a
  // separate standards framework merged in alongside 'us-common-core',
  // whichever side of the transition it's on. See mergeBestSourceMatch().
  'ngss':          { dbSystem: 'ngss',           nodeType: 'standard', label: 'US NGSS (Science)' },
  'science':       { dbSystem: 'ngss',           nodeType: 'standard', label: 'US NGSS (Science)' },
  // ── ISC (CISCE, Classes XI-XII only) ───────────────────────────────────
  // Ingested from the official CISCE 2027 syllabuses for the 12 core academic
  // subjects. Units map to node_type 'topic' and their subtopics to
  // 'learning_outcome', matching the NCERT shape, so the same retrieval path
  // works unchanged. ISC only exists for grades 11-12 — a grade-10-or-below
  // request will correctly find nothing here rather than mis-matching.
  // NOTE: 'icse' above still points at ncert-cbse. ICSE is the CISCE board's
  // grade 9-10 syllabus and is NOT this data; leave it until ICSE is ingested.
  'isc':           { dbSystem: 'isc-cisce', nodeType: 'topic', label: 'Indian ISC (CISCE)' },
  'isc-cisce':     { dbSystem: 'isc-cisce', nodeType: 'topic', label: 'Indian ISC (CISCE)' },
  'cisce':         { dbSystem: 'isc-cisce', nodeType: 'topic', label: 'Indian ISC (CISCE)' },
  // ── Future curricula (uncomment when ingested into DB) ─────────────────
  // 'ib-myp':     { dbSystem: 'ib-myp',            nodeType: 'objective', label: 'IB MYP' },
  // 'cambridge':  { dbSystem: 'cambridge-igcse',    nodeType: 'topic',    label: 'Cambridge IGCSE' },
  // 'igcse':      { dbSystem: 'cambridge-igcse',    nodeType: 'topic',    label: 'Cambridge IGCSE' },
  // 'uk':         { dbSystem: 'uk-national',        nodeType: 'standard', label: 'UK National Curriculum' },
};

// CISCE runs two syllabuses under one board: ICSE for classes 9-10, ISC for
// classes 11-12. A family member selecting "ICSE" for a class-11 transfer means
// ISC in practice, so the same label has to resolve differently by grade.
const CISCE_FAMILY_SELECTIONS = new Set(['icse', 'isc', 'cisce', 'isc-cisce']);
const ISC_FIRST_GRADE = 11;

/**
 * Resolve a curriculum string to its DB entry. Returns null if not yet ingested.
 *
 * `grade` is optional and only changes the outcome for CISCE selections: at
 * grade 11-12 they resolve to the ISC syllabus, below that they keep falling
 * back to ncert-cbse because ICSE's own 9-10 syllabus is not ingested yet.
 * Omitting grade preserves the previous behaviour for every caller.
 */
export function mapToDBEntry(curriculum?: string, grade?: number): CurriculumEntry | null {
  if (!curriculum) return null;
  const c = curriculum.toLowerCase().trim();

  if (CISCE_FAMILY_SELECTIONS.has(c) && typeof grade === 'number' && grade >= ISC_FIRST_GRADE) {
    return CURRICULUM_DB_REGISTRY['isc-cisce'];
  }

  if (CURRICULUM_DB_REGISTRY[c]) return CURRICULUM_DB_REGISTRY[c];
  for (const [key, entry] of Object.entries(CURRICULUM_DB_REGISTRY)) {
    if (c.includes(key) || key.includes(c)) return entry;
  }
  return null;
}

// Frontend subject labels don't always match the DB's stored metadata.subject
// string exactly (verified against production data: the frontend sends
// "Social Studies" and "English / Language Arts", the DB stores "Social
// Science" and "English" / "English Language Arts & Literacy"). Each entry
// here expands to every known equivalent. If none of these end up matching
// anything in the DB, find_curriculum_gaps_rag falls back to the unfiltered
// pool on its own — this table only needs to help, never needs to be exhaustive.
export const SUBJECT_ALIASES: Record<string, string[]> = {
  'social studies': ['social studies', 'social science'],
  'social_studies': ['social studies', 'social science'],
  'english / language arts': ['english / language arts', 'english', 'english language arts & literacy'],
  'english': ['english', 'english / language arts', 'english language arts & literacy'],
  'science': ['science', 'evs (the world around us)'],
};

export function expandSubjectFilter(subjects?: string[]): string[] | undefined {
  if (!subjects || subjects.length === 0) return undefined;
  const expanded = new Set<string>();
  for (const s of subjects) {
    const key = s.toLowerCase().trim();
    expanded.add(s);
    (SUBJECT_ALIASES[key] || []).forEach(alias => expanded.add(alias));
  }
  return [...expanded];
}

// =============================================================================
// DOMAIN-AWARE COVERAGE GATING
// =============================================================================

export type SubjectDomain =
  | 'mathematics' | 'english' | 'science' | 'social-science' | 'computer-science'
  | 'hindi' | 'sanskrit' | 'other-language' | 'other';

const DOMAIN_KEYWORDS: [SubjectDomain, RegExp][] = [
  // Course names as well as the subject: US forms and AP selections arrive as
  // "Algebra", "Geometry", "Pre-Calculus / Calculus", "AP ... Calculus", none of
  // which contain "math".
  ['mathematics', /math|algebra|geometr|calculus|trigonometr/i],
  ['english', /english|^ela$|language arts/i],
  // Checked BEFORE the generic 'science' pattern below — "Social Science"
  // literally contains the substring "Science", so a naive science-first
  // ordering misclassified it into the 'science' domain. Confirmed against
  // production data: that bug let Social Science inherit NGSS's real science
  // coverage and show 64% aligned, when Common Core/NGSS have zero actual
  // social-studies content, so it should read 0%, same as Hindi/Sanskrit.
  // Economics belongs here: US social studies teaches it (California's
  // History-Social Science framework includes it), so a US state pool is a real
  // comparison for ISC/CBSE Economics rather than "domain not taught".
  ['social-science', /social (science|studies)|history|geography|civics|political|econom/i],
  // Also checked BEFORE 'science', and for the same substring reason: "Computer
  // Science" matches /science/ and was inheriting general science coverage. That
  // produced a 64% aligned card for ISC Computer Science (Java, DBMS, Boolean
  // algebra) off US science standards, which contain none of it. It gets its own
  // domain rather than falling to 'other' because states DO publish real CS
  // standards (California has 89 nodes at grade 11) — it is Common Core and NGSS
  // that have none, which SOURCE_SYSTEM_DOMAINS already expresses per system.
  ['computer-science', /computer science|informatics|information technology|\bcomp\.? sci/i],
  ['science', /science|physics|chemistry|biology|evs \(/i],
  ['sanskrit', /sanskrit/i],
  ['hindi', /^hindi/i],
];

const OTHER_LANGUAGE_RE = /french|german|spanish|urdu|telugu|tamil|kannada|marathi|gujarati|punjabi|bengali|malayalam|odia/i;

export function canonicalSubjectDomain(rawSubject: string | undefined | null): SubjectDomain {
  const s = (rawSubject || '').trim();
  if (!s) return 'other';
  for (const [domain, re] of DOMAIN_KEYWORDS) {
    if (re.test(s)) return domain;
  }
  if (OTHER_LANGUAGE_RE.test(s)) return 'other-language';
  return 'other';
}

// Which subject-domains does each ingested curriculum system actually contain?
// A system NOT listed here is treated as comprehensive/unknown-but-trusted
// (fail-open) — we only ever gate a subject to zero when we positively know
// the source system doesn't teach it, never by omission, so a newly-ingested
// curriculum system doesn't get every subject wrongly zeroed out just because
// nobody added it to this map yet.
export const SOURCE_SYSTEM_DOMAINS: Record<string, SubjectDomain[] | null> = {
  'us-common-core': ['mathematics', 'english'],
  'ngss': ['science'],
  // ISC was ingested for the 12 core academic subjects only. Art, Music, SUPW,
  // Fashion Designing and the other electives were deliberately left out: they
  // have no domain here, so as source material they could only contribute
  // cross-domain similarity noise.
  'isc-cisce': ['mathematics', 'english', 'science', 'social-science', 'computer-science'],
};

// The DB holds all 51 US state curricula in full (math, ELA, science, social
// studies, health, PE, arts), but a whole state pool is too large to scan per
// target row — measured: California's 17,262 in-range nodes time out at 20s,
// vs ~2s for us-common-core's 3,279. Every subject-scoped slice, though, is
// the same scale as us-common-core (800-6,500 nodes) — see
// fetchUSStateAwareSourceGaps below, which is how a state system is now used
// as the PRIMARY source for all four core subjects, not just social studies.
const US_STATE_SYSTEM_PREFIX = 'us-state-';
// A state system can legitimately contribute any of the four core domains —
// which one(s) it actually did for a given request is tracked per-subject in
// SubjectSourceAudit, not assumed here. This constant is the fail-open upper
// bound used by effectiveSourceDomains() when a state system appears in
// sourceSystemsQueried at all.
const US_STATE_CONTRIBUTED_DOMAINS: SubjectDomain[] = ['mathematics', 'english', 'science', 'social-science', 'computer-science'];

// The assessment form stores usState as the 2-letter code ("CA"), while the
// ingested systems are slugged full names ("us-state-california"), so a naive
// slug of the form value would produce a nonexistent "us-state-ca" and
// silently skip every state merge. Both forms are accepted here.
const US_STATE_CODE_TO_NAME: Record<string, string> = {
  al: 'alabama', ak: 'alaska', az: 'arizona', ar: 'arkansas', ca: 'california',
  co: 'colorado', ct: 'connecticut', de: 'delaware', fl: 'florida', ga: 'georgia',
  hi: 'hawaii', id: 'idaho', il: 'illinois', in: 'indiana', ia: 'iowa',
  ks: 'kansas', ky: 'kentucky', la: 'louisiana', me: 'maine', md: 'maryland',
  ma: 'massachusetts', mi: 'michigan', mn: 'minnesota', ms: 'mississippi', mo: 'missouri',
  mt: 'montana', ne: 'nebraska', nv: 'nevada', nh: 'new-hampshire', nj: 'new-jersey',
  nm: 'new-mexico', ny: 'new-york', nc: 'north-carolina', nd: 'north-dakota', oh: 'ohio',
  ok: 'oklahoma', or: 'oregon', pa: 'pennsylvania', ri: 'rhode-island', sc: 'south-carolina',
  sd: 'south-dakota', tn: 'tennessee', tx: 'texas', ut: 'utah', vt: 'vermont',
  va: 'virginia', wa: 'washington', wv: 'west-virginia', wi: 'wisconsin', wy: 'wyoming',
  dc: 'district-of-columbia',
};

/** Maps a form's usState value — either the 2-letter code the assessment
 * actually stores ("CA") or a full name ("California") — to its ingested
 * curriculum_system slug. Returns null for empty/unknown input so callers skip
 * the state merge rather than querying a curriculum_system that doesn't exist. */
export function usStateToCurriculumSystem(usState?: string | null): string | null {
  const raw = (usState || '').trim().toLowerCase();
  if (!raw) return null;

  const byCode = US_STATE_CODE_TO_NAME[raw];
  if (byCode) return `${US_STATE_SYSTEM_PREFIX}${byCode}`;

  const slug = raw.replace(/[^a-z\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
  if (!slug) return null;
  // Only return a system we know was ingested — an unrecognised free-text
  // state ("other") must not produce a query for a nonexistent system.
  const known = Object.values(US_STATE_CODE_TO_NAME).includes(slug);
  return known ? `${US_STATE_SYSTEM_PREFIX}${slug}` : null;
}

const US_STATE_DISPLAY_NAMES: Record<string, string> = {
  alabama: 'Alabama', alaska: 'Alaska', arizona: 'Arizona', arkansas: 'Arkansas', california: 'California',
  colorado: 'Colorado', connecticut: 'Connecticut', delaware: 'Delaware', florida: 'Florida', georgia: 'Georgia',
  hawaii: 'Hawaii', idaho: 'Idaho', illinois: 'Illinois', indiana: 'Indiana', iowa: 'Iowa',
  kansas: 'Kansas', kentucky: 'Kentucky', louisiana: 'Louisiana', maine: 'Maine', maryland: 'Maryland',
  massachusetts: 'Massachusetts', michigan: 'Michigan', minnesota: 'Minnesota', mississippi: 'Mississippi', missouri: 'Missouri',
  montana: 'Montana', nebraska: 'Nebraska', nevada: 'Nevada', 'new-hampshire': 'New Hampshire', 'new-jersey': 'New Jersey',
  'new-mexico': 'New Mexico', 'new-york': 'New York', 'north-carolina': 'North Carolina', 'north-dakota': 'North Dakota', ohio: 'Ohio',
  oklahoma: 'Oklahoma', oregon: 'Oregon', pennsylvania: 'Pennsylvania', 'rhode-island': 'Rhode Island', 'south-carolina': 'South Carolina',
  'south-dakota': 'South Dakota', tennessee: 'Tennessee', texas: 'Texas', utah: 'Utah', vermont: 'Vermont',
  virginia: 'Virginia', washington: 'Washington', 'west-virginia': 'West Virginia', wisconsin: 'Wisconsin', wyoming: 'Wyoming',
  'district-of-columbia': 'District of Columbia',
};

/** "us-state-new-york" -> "New York". Used for prompt/report labels and the
 * audit log, not for the parent-facing UI (which has its own copy in
 * ParentSchoolProfileWizard.tsx / StudentProfileWizard.tsx's
 * resolveCurriculumOptionLabel(), since it renders before any backend call
 * happens). */
export function usStateSystemToDisplayName(stateSystem: string): string {
  const slug = stateSystem.replace(US_STATE_SYSTEM_PREFIX, '');
  return US_STATE_DISPLAY_NAMES[slug] || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// =============================================================================
// SOURCE CURRICULUM RESOLUTION
// =============================================================================
//
// The parent-facing curriculum question used to offer US Common Core / NGSS /
// State-Specific Standards as separate technical choices — a false choice for
// most US students, since a state's own math/ELA standards typically ARE
// Common Core (California's are literally published as "California Common
// Core State Standards"). It's now a single "Regular U.S. school curriculum"
// option (see the frontend curriculum wizards), and this function is what
// turns that + the state already collected at Stage 1 into an actual source
// plan — no second question, no exposed database identifiers.

export type SourceResolutionMode = 'us-state' | 'fallback-entry' | 'none';

export interface SourceResolution {
  mode: SourceResolutionMode;
  /** "Honors / Advanced" is a rigor modifier, not a different curriculum —
   * both 'regular-us' and 'honors-advanced' resolve the SAME way (state-
   * primary when possible); this just flags it so the LLM prompt can frame
   * gaps as "accelerate into" rather than "catch up to". */
  isHonorsOrAdvanced: boolean;
  /** Set when mode === 'us-state'. */
  stateSystem: string | null;
  stateLabel: string | null;
  /** Set when mode === 'fallback-entry' — the pre-existing single-dbSystem
   * resolution path (Common Core, or null/LLM-only for IB/Cambridge/Other,
   * which aren't ingested yet). */
  fallbackEntry: CurriculumEntry | null;
}

// Legacy values from BEFORE the option list was collapsed still need to
// resolve correctly on retake — old saved_reports and in-flight sessions can
// carry 'us-common-core'/'state-specific'/'ngss' as the selection. All of
// them mean the same thing under the new model: "regular US schooling."
const REGULAR_US_SELECTION_VALUES = new Set([
  'regular-us', 'regular_us', 'regular',
  'us-common-core', 'common-core', 'common_core',
  'state-specific', 'state_specific',
  'ngss',
]);
const HONORS_SELECTION_VALUES = new Set(['honors-advanced', 'honors_advanced', 'honors', 'advanced']);

/**
 * Resolves the SOURCE curriculum plan from the student's raw
 * currentCurriculum selection(s) + location + state. Accepts either the new
 * array shape or the comma-joined string the wire payload actually sends
 * (see submitAssessment.ts) so this is safe to call from either an edge
 * function's parsed body or a re-split string.
 */
export function resolveSourceCurriculum(
  currentCurriculum: string[] | string | undefined,
  snapshotLocation: string | undefined,
  usState: string | undefined
): SourceResolution {
  const values = Array.isArray(currentCurriculum)
    ? currentCurriculum
    : (currentCurriculum || '').split(',').map(s => s.trim()).filter(Boolean);
  const normalized = values.map(v => v.toLowerCase().trim());

  const isHonorsOrAdvanced = normalized.some(v => HONORS_SELECTION_VALUES.has(v));
  const isRegularUS = normalized.some(v => REGULAR_US_SELECTION_VALUES.has(v)) || isHonorsOrAdvanced;
  const isUS = (snapshotLocation || '').toLowerCase() === 'us';

  if (isUS && isRegularUS) {
    const stateSystem = usStateToCurriculumSystem(usState);
    if (stateSystem) {
      return {
        mode: 'us-state',
        isHonorsOrAdvanced,
        stateSystem,
        stateLabel: `${usStateSystemToDisplayName(stateSystem)} State Curriculum`,
        fallbackEntry: null,
      };
    }
    // US + regular curriculum but state unknown/unrecognised (e.g. picked
    // "Other" for state, or a brand-new territory not yet ingested) — fall
    // back to the pre-state-aware behavior instead of failing outright.
    return {
      mode: 'fallback-entry',
      isHonorsOrAdvanced,
      stateSystem: null,
      stateLabel: null,
      fallbackEntry: CURRICULUM_DB_REGISTRY['us-common-core'],
    };
  }

  // IB / Cambridge / Other / non-US: existing single-entry resolution.
  // mapToDBEntry does substring matching, so try each selected value in turn
  // (a multi-value legacy string might have "ib-myp, other" — take whichever
  // one actually resolves).
  let entry: CurriculumEntry | null = null;
  for (const v of normalized) {
    entry = mapToDBEntry(v);
    if (entry) break;
  }
  return { mode: entry ? 'fallback-entry' : 'none', isHonorsOrAdvanced, stateSystem: null, stateLabel: null, fallbackEntry: entry };
}

// ILIKE patterns (not exact names) because states name the subject
// differently: "History-Social Science (1998-)" (CA), "Social Studies
// (2010-2018)" (TX), "Social Studies (2012-2018)" (OH). Deliberately does NOT
// use a bare '%social%', which would also match California's
// "Social-Emotional Development".
export const STATE_SOCIAL_STUDIES_PATTERNS = [
  '%social studies%',
  // A state that names it just "Social Science" (no "History"/"Studies")
  // wasn't observed in the 12-state sample audited, but nothing before this
  // covered that spelling defensively — add it rather than rely on every
  // state also using "History" alongside it (California/Massachusetts do;
  // a future ingestion might not).
  '%social science%',
  '%history%',
  '%civic%',
  '%geograph%',
  '%government%',
  '%economic%',
];

/**
 * Union of domains covered by every source curriculum system actually
 * contributing rows to this request (e.g. ['us-common-core', 'ngss'] once
 * NGSS has been merged in — see mergeBestSourceMatch()). Returns null
 * (meaning "don't gate anything") if any contributing system isn't in
 * SOURCE_SYSTEM_DOMAINS at all, since an unmapped system is assumed
 * comprehensive rather than assumed empty.
 */
export function effectiveSourceDomains(sourceSystemsQueried: string[]): Set<SubjectDomain> | null {
  const domains = new Set<SubjectDomain>();
  for (const sys of sourceSystemsQueried) {
    const key = sys.toLowerCase();
    if (key.startsWith(US_STATE_SYSTEM_PREFIX)) {
      US_STATE_CONTRIBUTED_DOMAINS.forEach(x => domains.add(x));
      continue;
    }
    if (!(key in SOURCE_SYSTEM_DOMAINS)) return null;
    const d = SOURCE_SYSTEM_DOMAINS[key];
    if (d === null) return null;
    d.forEach(x => domains.add(x));
  }
  return domains;
}

// =============================================================================
// SUBJECT-SCOPED STATE SOURCE RETRIEVAL
// =============================================================================
//
// Runs one find_curriculum_gaps_rag call per core subject domain, in parallel,
// each scoped on BOTH sides: source_subjects narrows the state pool to just
// that subject's slice (the thing that makes a whole-state query feasible at
// all — see the module header), and target_subjects narrows which target
// nodes that slice is compared against.
//
// Disjointness is ENFORCED here, not assumed. The RPC falls back to the whole
// target pool when target_subjects matches nothing, and the static target
// names below are CBSE Class 1-10 labels ("Science", "Social Science"). For a
// Class 11-12 target, where boards teach Physics/Chemistry/History instead,
// both queries fell back and returned every target node: measured on a live
// California -> ISC Class 11 request, 215 rows for 102 distinct nodes, with
// ISC History scored against California science standards. Target names are
// now read from the target board itself, and every query's rows are filtered
// to its own domain before they are concatenated, so no merge-by-
// best-similarity needed (contrast with mergeBestSourceMatch, which is for
// re-querying the SAME target nodes against a second source).
//
// Math/English/Science all have a fallback (Common Core or NGSS) for when a
// state's own data for that subject is missing or too sparse to trust —
// falling silently back to the pre-state-aware source rather than reporting
// a fake gap. Social Studies has NO fallback (neither Common Core nor NGSS
// contains any), so a missing/sparse state pool there is reported as
// "state data unavailable", not scored as a gap at all — see
// analyze-curriculum's use of `unavailableSubjectKeys` below.

export type CoreDomain = 'mathematics' | 'english' | 'science' | 'social-science' | 'computer-science';

export interface SubjectSourceQuery {
  key: CoreDomain;
  label: string;
  /** Target-side metadata.subject values this query is scoped to. Only used
   * when the target board's own subject list can't be read (no rpcNamed, or
   * get_curriculum_subjects failed); normally the names come from the board. */
  targetSubjects: string[];
  /** What it means when neither the state nor a fallback has data:
   *  'unavailable' — every US school teaches it, so a missing pool is OUR data
   *                  gap and must not be scored (Social Studies);
   *  'not-covered' — genuinely optional in US schooling, so missing standards
   *                  mean the student likely never studied it (Computer Science,
   *                  published by only 21 of 51 jurisdictions). */
  missingMeans: 'unavailable' | 'not-covered';
  /** ILIKE patterns matched against the STATE's own metadata.subject naming.
   * Only used when subject_mappings can't be read; normally the exact current
   * labels come from get_canonical_subjects. */
  stateSourceSubjects: string[];
  /** ILIKE patterns to exclude from the state match — e.g. Science's pattern
   * would otherwise also match "History-Social Science". */
  stateSourceExclude?: string[];
  fallbackSystem: 'us-common-core' | 'ngss' | null;
  fallbackNodeType: string | null;
  fallbackLabel: string;
}

export const US_STATE_SUBJECT_QUERIES: SubjectSourceQuery[] = [
  {
    key: 'mathematics',
    missingMeans: 'unavailable',
    label: 'Mathematics',
    targetSubjects: ['Mathematics', 'Math'],
    stateSourceSubjects: ['%math%'],
    fallbackSystem: 'us-common-core',
    fallbackNodeType: 'standard',
    fallbackLabel: 'US Common Core',
  },
  {
    key: 'english',
    missingMeans: 'unavailable',
    label: 'English / ELA',
    targetSubjects: ['English', 'English / Language Arts', 'English Language Arts & Literacy'],
    stateSourceSubjects: ['%english%', '%language arts%', '%reading%', '%literacy%'],
    fallbackSystem: 'us-common-core',
    fallbackNodeType: 'standard',
    fallbackLabel: 'US Common Core',
  },
  {
    key: 'science',
    missingMeans: 'unavailable',
    label: 'Science',
    targetSubjects: ['Science'],
    // '%science%' (not just a 'Science%' prefix) — verified against live
    // production data across 12 states: prefix-only missed real rows like
    // New York's "Math, Science & Technology (1996-2005)" and Virginia's
    // "Expanded High School Science (2025-)". A bare '%science%' also
    // matches "History-Social Science" (California) and "Computer Science"
    // (FL/VA/WA/MA/SC/NC all have this as its own elective subject) — both
    // excluded below rather than relying on prefix-anchoring to avoid them.
    stateSourceSubjects: ['%science%', '%physical science%', '%life science%', '%earth science%', '%biology%', '%chemistry%', '%physics%'],
    stateSourceExclude: ['%social%', '%history%', '%computer%'],
    fallbackSystem: 'ngss',
    fallbackNodeType: 'standard',
    fallbackLabel: 'US NGSS (Science)',
  },
  {
    key: 'social-science',
    missingMeans: 'unavailable',
    label: 'Social Studies',
    targetSubjects: ['Social Science', 'Social Studies'],
    stateSourceSubjects: STATE_SOCIAL_STUDIES_PATTERNS,
    fallbackSystem: null, // no fallback exists — see module header
    fallbackNodeType: null,
    fallbackLabel: '',
  },
  {
    key: 'computer-science',
    missingMeans: 'not-covered',
    label: 'Computer Science',
    targetSubjects: ['Computer Science', 'Informatics Practices', 'Information Technology'],
    stateSourceSubjects: ['%computer science%', '%computing%', '%cyber%'],
    // Neither Common Core nor NGSS contains any computer science.
    fallbackSystem: null,
    fallbackNodeType: null,
    fallbackLabel: '',
  },
];

// Below this many rows, a state's subject-scoped pool is treated as too thin
// to trust rather than a genuine "the state teaches almost nothing here."
export const MIN_VIABLE_SOURCE_ROWS = 15;

export interface SubjectSourceAuditEntry {
  subject: string;
  source: string;
  sourceLabel: string;
  /** state/fallback: a real pool was compared. unavailable/error: our data gap,
   * not scored. not-covered/not-studied: scored as "not taught by the source".
   * no-target: the target board has nothing in this domain at this grade. */
  status: 'state' | 'fallback' | 'unavailable' | 'error' | 'not-covered' | 'not-studied' | 'no-target';
  rowCount: number;
}

export interface StateAwareSourceGapsResult {
  allTargetNodes: GapNode[];
  sourceSystemsQueried: string[];
  /** Keyed by SubjectSourceQuery.key — one entry per core domain, regardless
   * of outcome. Log this on the response so a report can be audited against
   * exactly which source produced each subject's numbers. */
  subjectSourceAudit: Record<string, SubjectSourceAuditEntry>;
  /** Subject keys where NO source (state or fallback) could be used —
   * callers must NOT run these through classifyGapsBySubject, since that
   * would score "we have no data" as "0% covered = full gap", which is a
   * data problem, not a curriculum finding. */
  unavailableSubjectKeys: string[];
  /** Domains for which a real source pool was compared. Pass this to
   * classifyGapsBySubject: every other domain is "not taught by the source",
   * which a state system's blanket domain list cannot express — a student who
   * never took Computer Science must not inherit their state's CS standards. */
  coveredDomains: Set<SubjectDomain>;
}

export interface RpcCaller {
  (params: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

/** Calls any Postgres function by name — used for subject lookups. */
export interface NamedRpcCaller {
  // PromiseLike, not Promise: supabase.rpc() returns a thenable query builder.
  (fn: string, params: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

export interface DebugLogger {
  (step: string, message: string, data?: Record<string, unknown>): void;
}

const CORE_DOMAIN_SET = new Set<SubjectDomain>(US_STATE_SUBJECT_QUERIES.map(q => q.key));

// Every US school teaches these through grade 12, so a parent leaving one
// unanswered on the form almost always means "skipped", not "never studied".
// Computer Science is the only genuinely optional core domain.
const UNIVERSAL_US_DOMAINS = new Set<SubjectDomain>(['mathematics', 'english', 'science', 'social-science']);

/**
 * Core domains the student actually studies, from the form's academicPath.
 * The four universal domains are always assumed; Computer Science counts only
 * when selected. Returns null (assume everything) when academicPath is empty,
 * since then there is no evidence either way.
 */
export function studiedSourceDomains(academicPath?: string[] | null): Set<SubjectDomain> | null {
  if (!academicPath || academicPath.length === 0) return null;
  const studied = new Set<SubjectDomain>(UNIVERSAL_US_DOMAINS);
  for (const subject of academicPath) {
    const d = canonicalSubjectDomain(subject);
    if (CORE_DOMAIN_SET.has(d)) studied.add(d);
  }
  return studied;
}

/** Escapes LIKE wildcards so an exact label can be passed as an ILIKE pattern. */
function asExactLikePattern(label: string): string {
  return label.replace(/[\\%_]/g, ch => `\\${ch}`);
}

/**
 * Exact current-vintage state labels per core domain, from subject_mappings.
 * Returns null when the mapping isn't reachable (e.g. the migration hasn't been
 * applied yet), in which case callers fall back to the ILIKE patterns.
 */
async function loadStateLabelsByDomain(
  rpcNamed: NamedRpcCaller,
  stateSystem: string,
  gradeMin: number,
  gradeMax: number,
  debug: DebugLogger
): Promise<Map<SubjectDomain, { labels: string[]; nodes: number }> | null> {
  const { data, error } = await rpcNamed('get_canonical_subjects', {
    p_curriculum_system: stateSystem,
    p_grade_min: gradeMin,
    p_grade_max: gradeMax,
    p_core_only: true,
  });
  if (error || !Array.isArray(data)) {
    debug('rag_state_labels_unavailable', 'subject_mappings unreachable, using ILIKE patterns', {
      stateSystem, error: error?.message,
    });
    return null;
  }
  const byDomain = new Map<SubjectDomain, { labels: string[]; nodes: number }>();
  for (const row of data as { domain: SubjectDomain; raw_subjects: string[] | null; node_count: number }[]) {
    const entry = byDomain.get(row.domain) ?? { labels: [], nodes: 0 };
    entry.labels.push(...(row.raw_subjects ?? []));
    entry.nodes += Number(row.node_count) || 0;
    byDomain.set(row.domain, entry);
  }
  debug('rag_state_labels', 'Exact state labels loaded from subject_mappings', {
    stateSystem,
    pools: Object.fromEntries([...byDomain].map(([d, e]) => [d, { labels: e.labels.length, nodes: e.nodes }])),
  });
  return byDomain;
}

/**
 * The target board's own subject names across the grade window, optionally
 * narrowed to a stream, grouped by domain. Reading names from the board is
 * what keeps target_subjects from silently missing (see section header).
 */
export async function loadTargetSubjects(
  rpcNamed: NamedRpcCaller,
  targetCurriculum: string,
  gradeMin: number,
  gradeMax: number,
  stream: string | null | undefined,
  debug: DebugLogger = () => {}
): Promise<{ all: string[]; byDomain: Map<SubjectDomain, string[]> } | null> {
  const grades: number[] = [];
  for (let g = gradeMin; g <= gradeMax; g++) grades.push(g);

  const fetchNames = async (useStream: string | null) => {
    const names = new Set<string>();
    for (const g of grades) {
      const { data, error } = await rpcNamed('get_curriculum_subjects', {
        p_curriculum_system: targetCurriculum,
        p_grade: g,
        p_stream: useStream,
      });
      if (error || !Array.isArray(data)) return null;
      for (const row of data as { subject: string }[]) if (row.subject) names.add(row.subject);
    }
    return names;
  };

  // Streams only exist from Class XI. A board with no stream metadata (one
  // ingested later without it) would empty the list, so that is retried without
  // the filter rather than reporting that the board teaches nothing.
  const streamApplies = !!stream && gradeMax >= 11;
  let names = await fetchNames(streamApplies ? stream! : null);
  if (names && names.size === 0 && streamApplies) {
    debug('rag_target_stream_empty', 'Stream filter matched no subjects, retrying without it', {
      targetCurriculum, stream,
    });
    names = await fetchNames(null);
  }
  if (!names) {
    debug('rag_target_subjects_unavailable', 'Target subject list unreachable, using static names', { targetCurriculum });
    return null;
  }

  const byDomain = new Map<SubjectDomain, string[]>();
  for (const name of names) {
    const d = canonicalSubjectDomain(name);
    const list = byDomain.get(d) ?? [];
    list.push(name);
    byDomain.set(d, list);
  }
  return { all: [...names], byDomain };
}

/** Full target subject label. getNodeSubjectLabel truncates to 40 chars for
 * display grouping, which would break exact name comparisons. */
function targetSubjectOf(n: GapNode): string {
  const m = (n.target_metadata || {}) as Record<string, unknown>;
  return ((m.subject as string) || (m.domain as string) || '').trim();
}

/** Rows whose target subject belongs to `domain` — the disjointness guard. */
function keepDomain(rows: GapNode[], domain: SubjectDomain): GapNode[] {
  return rows.filter(r => canonicalSubjectDomain(targetSubjectOf(r)) === domain);
}

/**
 * Fetches gap rows for every core domain using the student's state as the
 * primary source, in parallel, with per-domain fallback. See the section
 * header above for the full rationale.
 */
export async function fetchUSStateAwareSourceGaps(opts: {
  rpc: RpcCaller;
  /** Enables exact state labels and board-sourced target names. Without it
   * the static ILIKE patterns and target names are used, and target subjects
   * outside the core domains are not fetched. */
  rpcNamed?: NamedRpcCaller;
  stateSystem: string;
  stateLabel: string;
  targetCurriculum: string;
  targetNodeType: string | null;
  gradeMin: number;
  gradeMax: number;
  sourceGradeMin: number;
  sourceGradeMax: number;
  /** 'science-pcm' | 'science-pcb' | 'commerce' | 'humanities' — narrows Class XI-XII targets. */
  targetStream?: string | null;
  /** The student's own grade. Target subject NAMES are read at this grade
   * only; the gradeMin..gradeMax window still supplies neighbouring chapters of
   * those subjects. Reading names across the whole window pulls in subjects
   * that only start a year later — a Class 10 entrant was shown Accountancy and
   * Business Studies, which begin in Class 11. */
  targetGrade?: number;
  /** From studiedSourceDomains(); null assumes every core domain. */
  studiedDomains?: Set<SubjectDomain> | null;
  resultLimitPerSubject?: number;
  onDebug?: DebugLogger;
}): Promise<StateAwareSourceGapsResult> {
  const {
    rpc, rpcNamed, stateSystem, stateLabel, targetCurriculum, targetNodeType,
    gradeMin, gradeMax, sourceGradeMin, sourceGradeMax, targetStream, targetGrade,
    studiedDomains = null, resultLimitPerSubject = 300, onDebug,
  } = opts;
  const debug = onDebug ?? (() => {});

  const [stateLabels, targetSubjects] = rpcNamed
    ? await Promise.all([
        loadStateLabelsByDomain(rpcNamed, stateSystem, sourceGradeMin, sourceGradeMax, debug),
        loadTargetSubjects(
          rpcNamed, targetCurriculum,
          targetGrade ?? gradeMin, targetGrade ?? gradeMax,
          targetStream, debug
        ),
      ])
    : [null, null];

  const coveredDomains = new Set<SubjectDomain>();

  const perSubject = await Promise.all(US_STATE_SUBJECT_QUERIES.map(async (q): Promise<{
    key: string; rows: GapNode[]; audit: SubjectSourceAuditEntry;
  }> => {
    const targetNames = targetSubjects ? (targetSubjects.byDomain.get(q.key) ?? []) : q.targetSubjects;
    const empty = (status: SubjectSourceAuditEntry['status'], source = stateSystem, sourceLabel = stateLabel) => ({
      key: q.key, rows: [] as GapNode[],
      audit: { subject: q.label, source, sourceLabel, status, rowCount: 0 },
    });

    // The board teaches nothing in this domain at this grade/stream.
    if (targetSubjects && targetNames.length === 0) return empty('no-target');

    // The student doesn't study it: their targets are scored as not taught.
    if (studiedDomains && !studiedDomains.has(q.key)) {
      debug('rag_state_subject_not_studied', `${q.label} not in the student's subjects`, { subject: q.key });
      return empty('not-studied');
    }

    const baseParams = {
      target_curriculum: targetCurriculum,
      target_node_type_filter: targetNodeType,
      target_subjects: targetNames,
      grade_min: gradeMin,
      grade_max: gradeMax,
      source_grade_min: sourceGradeMin,
      source_grade_max: sourceGradeMax,
      similarity_threshold: 0.0,
      result_limit: resultLimitPerSubject,
    };

    // With the mapping loaded, a state that has no labels for this domain has
    // no pool at all, so the state query is skipped rather than widened to
    // broad patterns. Without the mapping, the ILIKE patterns are used.
    const statePool = stateLabels?.get(q.key);
    const exactLabels = statePool?.labels ?? [];
    const useExact = exactLabels.length > 0;
    const stateHasPool = !stateLabels || useExact;
    const { data: stateRows, error: stateError } = stateHasPool
      ? await rpc({
          ...baseParams,
          source_curriculum: stateSystem,
          source_node_type: 'standard',
          source_subjects: useExact ? exactLabels.map(asExactLikePattern) : q.stateSourceSubjects,
          source_subjects_exclude: useExact ? null : (q.stateSourceExclude ?? null),
        })
      : { data: [], error: null };
    const stateInDomain = Array.isArray(stateRows) ? keepDomain(stateRows as GapNode[], q.key) : [];

    // "Too thin to trust" is a property of the SOURCE pool. Counting returned
    // rows measures the TARGET side instead: ISC has only 11 Mathematics units
    // and 6 English units, so a state with a full math and ELA framework was
    // always judged thin and silently replaced by Common Core. With the mapping
    // the pool size is known exactly; without it, returned rows are the only
    // signal available.
    const viable = useExact
      ? (statePool?.nodes ?? 0) >= MIN_VIABLE_SOURCE_ROWS && stateInDomain.length > 0
      : stateInDomain.length >= MIN_VIABLE_SOURCE_ROWS;
    if (!stateError && viable) {
      debug('rag_state_subject_query', `State data used for ${q.label}`, {
        subject: q.key, source: stateSystem, rowCount: stateInDomain.length,
        matching: useExact ? 'exact-labels' : 'ilike-patterns',
        sourcePoolNodes: statePool?.nodes ?? null,
        droppedOutOfDomain: Array.isArray(stateRows) ? stateRows.length - stateInDomain.length : 0,
      });
      coveredDomains.add(q.key);
      return {
        key: q.key,
        rows: stateInDomain,
        audit: { subject: q.label, source: stateSystem, sourceLabel: stateLabel, status: 'state', rowCount: stateInDomain.length },
      };
    }

    if (stateError) {
      debug('rag_state_subject_error', `State query failed for ${q.label} (non-fatal)`, { subject: q.key, error: stateError.message });
    } else {
      debug('rag_state_subject_thin', `State data too thin for ${q.label}`, { subject: q.key, rowCount: stateInDomain.length });
    }

    if (q.fallbackSystem) {
      const { data: fbRows, error: fbError } = await rpc({
        ...baseParams,
        source_curriculum: q.fallbackSystem,
        source_node_type: q.fallbackNodeType,
        source_subjects: null,
        source_subjects_exclude: null,
      });
      if (!fbError && Array.isArray(fbRows)) {
        const fbInDomain = keepDomain(fbRows as GapNode[], q.key);
        debug('rag_state_subject_fallback', `Fell back to ${q.fallbackLabel} for ${q.label}`, {
          subject: q.key, source: q.fallbackSystem, rowCount: fbInDomain.length,
        });
        coveredDomains.add(q.key);
        return {
          key: q.key,
          rows: fbInDomain,
          audit: { subject: q.label, source: q.fallbackSystem, sourceLabel: q.fallbackLabel, status: 'fallback', rowCount: fbInDomain.length },
        };
      }
      debug('rag_state_subject_fallback_error', `Fallback also failed for ${q.label}`, { subject: q.key, error: fbError?.message });
    }

    if (q.missingMeans === 'not-covered') return empty('not-covered');
    // Universal subject with no usable pool anywhere: our data gap, not a
    // finding about the student. The caller must skip scoring it.
    return empty(stateError ? 'error' : 'unavailable');
  }));

  const allTargetNodes: GapNode[] = [];
  const sourceSystemsQueried = new Set<string>();
  const subjectSourceAudit: Record<string, SubjectSourceAuditEntry> = {};
  const unavailableSubjectKeys: string[] = [];

  for (const { key, rows, audit } of perSubject) {
    subjectSourceAudit[key] = audit;
    if (audit.status === 'unavailable' || audit.status === 'error') {
      unavailableSubjectKeys.push(key);
      continue;
    }
    if (audit.status === 'state' || audit.status === 'fallback') {
      allTargetNodes.push(...rows);
      sourceSystemsQueried.add(audit.source);
    }
  }

  // Target subjects outside every compared domain — Hindi and Sanskrit at
  // Classes 1-10, Accountancy and Business Studies at XI-XII, plus any core
  // domain the student doesn't study. They still belong in the report as
  // gaps, so they're fetched once here; the source pool is irrelevant because
  // classifyGapsBySubject marks an uncovered domain's topics CRITICAL and
  // orders them by curriculum sequence, never by similarity.
  if (rpcNamed && targetSubjects) {
    const unavailable = new Set<string>(unavailableSubjectKeys);
    const residual = targetSubjects.all.filter(name => {
      const d = canonicalSubjectDomain(name);
      return !coveredDomains.has(d) && !unavailable.has(d);
    });
    if (residual.length > 0) {
      const { data: resRows, error: resError } = await rpc({
        target_curriculum: targetCurriculum,
        target_node_type_filter: targetNodeType,
        target_subjects: residual,
        grade_min: gradeMin,
        grade_max: gradeMax,
        source_grade_min: sourceGradeMin,
        source_grade_max: sourceGradeMax,
        similarity_threshold: 0.0,
        result_limit: resultLimitPerSubject,
        source_curriculum: 'us-common-core',
        source_node_type: 'standard',
        source_subjects: null,
        source_subjects_exclude: null,
      });
      if (!resError && Array.isArray(resRows)) {
        const wanted = new Set(residual.map(n => n.toLowerCase()));
        const kept = (resRows as GapNode[]).filter(r => wanted.has(targetSubjectOf(r).toLowerCase()));
        allTargetNodes.push(...kept);
        debug('rag_state_residual', 'Fetched target subjects no source pool covers', {
          subjects: residual, rowCount: kept.length,
        });
      } else {
        debug('rag_state_residual_error', 'Residual subject fetch failed (non-fatal)', { error: resError?.message });
      }
    }
  }

  // Final guard: each target node appears once, whatever happened above.
  const seen = new Set<string>();
  const deduped = allTargetNodes.filter(n => {
    if (seen.has(n.target_node_id)) return false;
    seen.add(n.target_node_id);
    return true;
  });

  return {
    allTargetNodes: deduped,
    sourceSystemsQueried: [...sourceSystemsQueried],
    subjectSourceAudit,
    unavailableSubjectKeys,
    coveredDomains,
  };
}

// =============================================================================
// GAP CLASSIFICATION
// =============================================================================

export interface GapNode {
  target_node_id: string;
  target_node_name: string;
  target_node_type: string;
  target_grade_min: number;
  target_grade_max: number;
  target_description: string;
  target_metadata: Record<string, unknown>;
  best_source_match: string | null;
  best_similarity: number | null;
  gap_exists: boolean;
}

export interface GapNodeWithSeverity extends GapNode {
  _severity: 'CRITICAL' | 'MAJOR' | 'MODERATE';
}

// A subject only gets any "covered" nodes if BOTH:
//  (a) the effective source curriculum structurally teaches that subject's
//      domain at all (see effectiveSourceDomains) — a hard gate, no
//      similarity number can override it, and
//  (b) its average similarity clears this fraction of the best-matched
//      subject's average — a softer, relative safety net for subjects whose
//      domain nominally matches but whose actual DB content still turns out
//      to be a poor match for some other reason.
// Below either gate, every node in the subject is a gap no matter how it
// ranks among its own (uniformly bad) peers.
export const SUBJECT_QUALIFY_RATIO = 0.6;

// Absolute similarity a node must reach to count as covered. This is now the
// only per-topic test (the percentile cut was removed: it also forced the
// bottom 35% of every subject to be gaps, capping scores near 65%).
//
// Percentile classification alone manufactures coverage: it splits by RANK, so
// ~65% of a subject's nodes land above the 35th percentile whatever the actual
// overlap is. A California -> ISC Class 11 report showed every subject at
// 63-68%, Geography included, where nothing in US schooling matches.
//
// Calibrated on the node types production actually queries (ISC units and
// NCERT chapters, node_type 'topic') by reading the real match pairs in each
// similarity band, California -> ISC Class 11 and -> CBSE Class 8:
//   >= 0.55  genuine same-concept matches: "Working with Fractions" <- operations
//            with fractions (0.597); "Laws of Motion" <- Newton's second law
//            (0.575); "Classification of Elements" <- the periodic table (0.575)
//   0.50-0.55  partial, adjacent concepts
//   < 0.50   unrelated
// It also splits ISC History cleanly: its world-history units (Cold War 0.711,
// Great Depression 0.701, World War I, Decolonisation, Rise of Fascism) clear
// it, and every Indian national-movement unit (Partition 0.495, Gandhian
// Nationalism 0.448) does not. All of ISC Geography falls below it.
// An earlier value of 0.65 was calibrated on subtopic nodes, which production
// never queries; on chapter-level nodes it rejected every genuine match and read
// CBSE Class 8 Mathematics as 0% for a California eighth grader.
export const COVERAGE_SIMILARITY_FLOOR = 0.55;
// Below this the best source match is unrelated (see the bands above), so the
// gap is new content: CRITICAL. Between it and the floor: MAJOR.
export const GAP_UNRELATED_BELOW = 0.50;

export interface SubjectClassification {
  subject: string;
  avgSimilarity: number;
  domainCovered: boolean;
  qualifies: boolean;
  count: number;
}

export function getNodeSubjectLabel(n: { target_metadata?: Record<string, unknown> | null }): string {
  const m = (n.target_metadata || {}) as Record<string, unknown>;
  return ((m.subject as string) || (m.domain as string) || 'Unknown').substring(0, 40);
}

/**
 * Compare English on skills, not prescribed texts. Indian English nodes are
 * literature chapters ("The Proposal", "Silk Road"); US English standards are
 * skills, so chapters never matched and English read 0% with chapter titles as
 * its top gaps. Where a board has English skill nodes for the grade
 * (metadata.component 'language-skills', from rag-pipeline/ingest/english_skills.py)
 * they replace that subject's chapter nodes; literature is one of the skills.
 * Grades without skill nodes are returned unchanged.
 *
 * targetGrade: the student's grade. The retrieval window also spans the
 * neighbouring grade, so without it a Class 10 entrant would be measured
 * against Class 11 skills; skill nodes not covering this grade are dropped.
 */
export function preferEnglishSkillNodes<T extends {
  target_metadata?: Record<string, unknown> | null;
  target_grade_min?: number | null;
  target_grade_max?: number | null;
}>(nodes: T[], targetGrade?: number): T[] {
  const isSkill = (n: T) => (n.target_metadata as Record<string, unknown> | null)?.component === 'language-skills';
  const coversGrade = (n: T) =>
    targetGrade == null || ((n.target_grade_min ?? targetGrade) <= targetGrade && targetGrade <= (n.target_grade_max ?? targetGrade));
  const kept = nodes.filter(n => !isSkill(n) || coversGrade(n));
  const subjectsWithSkills = new Set(
    kept.filter(n => isSkill(n) && canonicalSubjectDomain(getNodeSubjectLabel(n)) === 'english')
      .map(n => getNodeSubjectLabel(n))
  );
  if (subjectsWithSkills.size === 0) return kept;
  return kept.filter(n => isSkill(n) || !subjectsWithSkills.has(getNodeSubjectLabel(n)));
}

/**
 * Keep one node per (subject, unit name). ISC repeats units across classes
 * (Computer Science Class XII re-lists "Objects", "Primitive Values...",
 * "Recursion" from Class XI), so a Class 12 entrant had them counted twice and
 * listed twice as gaps. The copy for the student's own grade wins, then the
 * later class.
 */
export function dedupeRepeatedUnits<T extends {
  target_node_name: string;
  target_metadata?: Record<string, unknown> | null;
  target_grade_min?: number | null;
  target_grade_max?: number | null;
}>(nodes: T[], targetGrade?: number): T[] {
  const covers = (n: T) => targetGrade != null
    && (n.target_grade_min ?? targetGrade) <= targetGrade && targetGrade <= (n.target_grade_max ?? targetGrade);
  const best = new Map<string, T>();
  for (const n of nodes) {
    const key = `${getNodeSubjectLabel(n).toLowerCase()}|${(n.target_node_name || '').toLowerCase().trim()}`;
    const prior = best.get(key);
    if (!prior
      || (covers(n) && !covers(prior))
      || (covers(n) === covers(prior) && (n.target_grade_max ?? 0) > (prior.target_grade_max ?? 0))) {
      best.set(key, n);
    }
  }
  const keep = new Set(best.values());
  return nodes.filter(n => keep.has(n));
}

/** Target-node clean-up shared by the gap engines: English as skills, one copy of repeated units. */
export function prepareTargetNodes<T extends {
  target_node_name: string;
  target_metadata?: Record<string, unknown> | null;
  target_grade_min?: number | null;
  target_grade_max?: number | null;
}>(nodes: T[], targetGrade?: number): T[] {
  return dedupeRepeatedUnits(preferEnglishSkillNodes(nodes, targetGrade), targetGrade);
}

// NCERT Hindi/Sanskrit chapter lists mix grammar/script reference material
// (verb-form tables, sandhi-samas appendices, alphabet drills) in among
// literature chapters (poems, stories, prose) — real signal already present
// in chapter titles, not inferred. A student with zero background in the
// subject needs the grammar/mechanics chapters before the literature makes
// sense, regardless of where either happens to sit in the textbook's own
// chapter order — a skill-based reading of "what to learn first," not a
// page-order one.
const GRAMMAR_CHAPTER_RE = /व्याकरण|धातुरूप|शब्दरूप|सन्धि|समास|परिशिष्ट|वर्णमाला|वर्णोच्चारण|मात्रा/;

export function languageSkillCategory(nodeName: string): 'grammar' | 'literature' {
  return GRAMMAR_CHAPTER_RE.test(nodeName || '') ? 'grammar' : 'literature';
}

// Maps the same chapter-title keywords used above to a short, readable
// concept label — several distinct NCERT appendix chapters often cover the
// same underlying skill (e.g. multiple "shabda-rupa"/word-declension
// appendices for different noun classes), so this collapses them to ONE
// named concept each, not one bullet per appendix.
const GRAMMAR_CONCEPT_LABELS: [RegExp, string][] = [
  [/धातुरूप/, 'verb conjugation (dhātu-rūpa)'],
  [/शब्दरूप/, 'word declension (śabda-rūpa)'],
  [/सन्धि|समास/, 'sandhi & samās (word-joining rules)'],
  [/उपसर्ग|प्रत्यय/, 'prefixes & suffixes (upasarga-pratyaya)'],
  [/वर्णमाला|वर्णोच्चारण|मात्रा/, 'script reading & pronunciation'],
  [/व्याकरण/, 'grammar fundamentals'],
];

function summarizeGrammarConcepts(nodeNames: string[]): string[] {
  const found: string[] = [];
  for (const [re, label] of GRAMMAR_CONCEPT_LABELS) {
    if (nodeNames.some(n => re.test(n)) && !found.includes(label)) found.push(label);
  }
  return found;
}

/**
 * Builds ONE report entry representing an entire subject the source
 * curriculum has zero content for (Hindi, Sanskrit, any other unrepresented
 * language) — replacing what was previously every individual chapter/poem
 * title listed one by one in Critical Gaps (30-50+ entries per subject,
 * confirmed against production data, none independently actionable to a
 * student with no literacy in the language yet). Rather than a bare "not
 * taught" statement, this names the actual grammar concepts this grade's
 * NCERT chapters cover (real chapter-title data, deduplicated across
 * near-duplicate appendix chapters — see summarizeGrammarConcepts above),
 * so the one entry is still concretely useful: what to start with, not just
 * that something is missing.
 */
export function buildLanguageSubjectSummary(
  subjectNodes: GapNode[],
  subject: string,
  sourceLabel: string
): { topic: string; reason: string } {
  const grammarNames = subjectNodes
    .filter(n => languageSkillCategory(n.target_node_name || '') === 'grammar')
    .map(n => n.target_node_name || '');
  const concepts = summarizeGrammarConcepts(grammarNames);
  const base = `${subject} is not taught at all in ${sourceLabel}, at any grade — this is entirely new material.`;
  const reason = concepts.length > 0
    ? `${base} At this grade, the curriculum expects grounding in: ${concepts.join(', ')} — start there before literature.`
    : `${base} Start with script reading and basic vocabulary before literature.`;
  return { topic: subject, reason };
}

/**
 * Ordering key for a subject the source curriculum has NO content for at
 * all. best_similarity in that case is pure noise — comparing e.g. a Hindi
 * poem's embedding against English Math/ELA text has no real meaning, so
 * "worst similarity first" was effectively presenting topics in random
 * order. Ingestion already captures real pedagogical sequencing
 * (difficulty_score, chapter_number, subtopic_index for NCERT content) —
 * use that instead, so a completely new subject is introduced starting from
 * its actual Chapter 1 / easiest content, not whatever happened to score
 * lowest against irrelevant text. For language subjects specifically, skill
 * category (grammar/script before literature) takes priority over book
 * order — see languageSkillCategory above.
 */
function naturalOrderKey(n: GapNode, domain: SubjectDomain): [number, number, number, number] {
  const m = (n.target_metadata || {}) as Record<string, unknown>;
  const isLanguageDomain = domain === 'hindi' || domain === 'sanskrit' || domain === 'other-language';
  const skillRank = isLanguageDomain ? (languageSkillCategory(n.target_node_name || '') === 'grammar' ? 0 : 1) : 0;
  const difficulty = typeof m.difficulty_score === 'number' ? m.difficulty_score : 1;
  const chapter = typeof m.chapter_number === 'number' ? m.chapter_number : 9999;
  const subtopic = typeof m.subtopic_index === 'number' ? m.subtopic_index : 0;
  return [skillRank, difficulty, chapter, subtopic];
}

function compareNaturalOrder(a: GapNode, b: GapNode, domain: SubjectDomain): number {
  const ka = naturalOrderKey(a, domain);
  const kb = naturalOrderKey(b, domain);
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] !== kb[i]) return ka[i] - kb[i];
  }
  return 0;
}

export interface ClassifyResult {
  gapNodesWithSeverity: GapNodeWithSeverity[];
  /** All nodes classified as covered, across every subject. */
  coveredNodes: GapNode[];
  coveredCount: number;
  total: number;
  subjectClassifications: SubjectClassification[];
  /** Real per-subject total/covered counts — the source of truth for
   * subjectAnalysis[].topicsCovered/totalTopics. Never derive these from
   * gap-list length or an LLM-invented formula. */
  subjectStats: Map<string, { total: number; covered: number }>;
  /** Gap rows grouped by subject key (same key as subjectStats). */
  bySubjectGaps: Map<string, GapNode[]>;
  /** Covered rows grouped by subject key (same key as subjectStats). */
  bySubjectCovered: Map<string, GapNode[]>;
}

/**
 * Classifies target nodes into gap/covered + severity PER SUBJECT, gated by
 * domain-availability first, then the subject ratio gate, then each topic's
 * similarity against COVERAGE_SIMILARITY_FLOOR. Severity comes from the same
 * calibrated bands (GAP_UNRELATED_BELOW), not from rank.
 *
 * @param allTargetNodes  Raw rows from find_curriculum_gaps_rag (after
 *   merging any secondary target/source curricula, e.g. NGSS).
 * @param sourceSystemsQueried  The curriculum_system value(s) that actually
 *   contributed candidate source nodes for this request — e.g.
 *   ['us-common-core'], or ['us-common-core', 'ngss'] once the NGSS
 *   source-side merge succeeds. Passing the ACTUAL contributing systems
 *   (not the aspirational list) means a subject correctly reverts to "not
 *   covered" if an NGSS merge attempt failed or timed out, instead of
 *   silently keeping a stale cross-domain similarity number.
 * @param subjectKeyFn  How to derive the grouping key from a node. Defaults
 *   to the raw, case-preserved subject label; callers that need a
 *   lowercased/normalized key (to match against user-supplied subject
 *   strings) can pass their own.
 */
export function classifyGapsBySubject(
  allTargetNodes: GapNode[],
  sourceSystemsQueried: string[],
  subjectKeyFn: (n: GapNode) => string = getNodeSubjectLabel,
  /** Explicit set of domains a real source pool was compared for — pass
   * StateAwareSourceGapsResult.coveredDomains. Overrides the per-system
   * lookup, which can only say a US state teaches "everything". */
  coveredDomains?: Set<SubjectDomain> | null
): ClassifyResult {
  const domains = coveredDomains !== undefined ? coveredDomains : effectiveSourceDomains(sourceSystemsQueried);

  const bySubject = new Map<string, GapNode[]>();
  for (const n of allTargetNodes) {
    const subj = subjectKeyFn(n);
    if (!bySubject.has(subj)) bySubject.set(subj, []);
    bySubject.get(subj)!.push(n);
  }

  const subjectAvg = new Map<string, number>();
  for (const [subj, nodes] of bySubject) {
    subjectAvg.set(subj, nodes.reduce((sum, n) => sum + (n.best_similarity ?? 0), 0) / nodes.length);
  }
  // The ratio gate's baseline is the best COMPARED subject. A subject whose
  // domain the source never teaches is scored against an arbitrary pool, so its
  // average is noise and must not move the bar for real comparisons.
  const comparedAvgs = [...subjectAvg].filter(([subj]) =>
    domains === null || domains.has(canonicalSubjectDomain(subj))
  ).map(([, avg]) => avg);
  const bestAvg = comparedAvgs.length > 0 ? Math.max(...comparedAvgs) : 0;

  const gapNodesWithSeverity: GapNodeWithSeverity[] = [];
  const coveredNodes: GapNode[] = [];
  const subjectClassifications: SubjectClassification[] = [];
  const subjectStats = new Map<string, { total: number; covered: number }>();
  const bySubjectGaps = new Map<string, GapNode[]>();
  const bySubjectCovered = new Map<string, GapNode[]>();
  let coveredCount = 0;

  // Collected per subject, ordered into the final list only after every
  // subject has been classified — see the sort below for why.
  const subjectGapLists: { domainCovered: boolean; avg: number; gaps: GapNodeWithSeverity[] }[] = [];

  for (const [subj, nodes] of bySubject) {
    const avg = subjectAvg.get(subj)!;
    const domain = canonicalSubjectDomain(subj);
    const domainCovered = domains === null || domains.has(domain);
    const ratioQualifies = bestAvg > 0 && avg >= bestAvg * SUBJECT_QUALIFY_RATIO;
    const qualifies = domainCovered && ratioQualifies;
    subjectClassifications.push({ subject: subj, avgSimilarity: avg, domainCovered, qualifies, count: nodes.length });

    // Worst-similarity-first is only meaningful when the subject's domain is
    // actually covered by the source curriculum — otherwise fall back to
    // real curriculum sequencing (see naturalOrderKey above).
    const sortedAsc = domainCovered
      ? [...nodes].sort((a, b) => (a.best_similarity ?? 0) - (b.best_similarity ?? 0))
      : [...nodes].sort((a, b) => compareNaturalOrder(a, b, domain));
    const n = sortedAsc.length;
    let subjCovered = 0;
    const gapsHere: GapNodeWithSeverity[] = [];
    const coveredHere: GapNode[] = [];

    sortedAsc.forEach((node) => {
      // Covered = the subject qualifies and the topic clears the absolute floor.
      // Rank plays no part: the earlier rule also made the bottom 35% of every
      // subject a gap by position, so a topic matched at 0.57 ("Persuasive
      // writing" <- "Write to argue a position") was listed as missing, and no
      // subject could score above ~65% even between near-identical syllabuses.
      const sim = node.best_similarity ?? 0;
      const isGap = !qualifies || sim < COVERAGE_SIMILARITY_FLOOR;
      if (!isGap) {
        coveredCount++;
        subjCovered++;
        coveredNodes.push(node);
        coveredHere.push(node);
        return;
      }
      // Severity from the same calibrated bands as the floor: below
      // GAP_UNRELATED_BELOW the closest source topic is unrelated (new content);
      // between it and the floor it is an adjacent concept (partial). A topic
      // above the floor is a gap only because its subject failed the ratio gate.
      // When the source has no content for the domain at all, every topic is an
      // equally-unknown unknown and the similarity numbers are noise.
      const severity: 'CRITICAL' | 'MAJOR' | 'MODERATE' = !domainCovered || sim < GAP_UNRELATED_BELOW
        ? 'CRITICAL'
        : sim < COVERAGE_SIMILARITY_FLOOR ? 'MAJOR' : 'MODERATE';
      gapsHere.push({ ...node, _severity: severity });
    });

    subjectStats.set(subj, { total: n, covered: subjCovered });
    bySubjectGaps.set(subj, gapsHere);
    bySubjectCovered.set(subj, coveredHere);
    subjectGapLists.push({ domainCovered, avg, gaps: gapsHere });
  }

  // Final ordering: subjects with NO source-curriculum content at all lead
  // the list — they represent the largest genuine prep burden, and their own
  // chapter-order sequencing (set above) is meaningful. Subjects the source
  // curriculum does cover follow, worst-average-similarity first. This
  // replaces a blanket global similarity sort, which was meaningless for any
  // not-covered subject mixed into it — and this order is what
  // analyze-curriculum ultimately writes into analysisData.criticalGaps, so
  // it's what determines "High/Medium/Low priority" in the report.
  subjectGapLists.sort((a, b) => (a.domainCovered === b.domainCovered ? a.avg - b.avg : a.domainCovered ? 1 : -1));
  for (const { gaps } of subjectGapLists) gapNodesWithSeverity.push(...gaps);

  return {
    gapNodesWithSeverity,
    coveredNodes,
    coveredCount,
    total: allTargetNodes.length,
    subjectClassifications,
    subjectStats,
    bySubjectGaps,
    bySubjectCovered,
  };
}

/**
 * Selects a fair cross-subject sample of gap nodes (for an LLM prompt or any
 * other size-limited display), instead of a pure global top-N by similarity.
 * Confirmed against production data: before this existed, Hindi + Sanskrit's
 * ~80 near-zero-similarity nodes (vs. a source curriculum that teaches
 * neither) sorted ahead of EVERY other subject's gaps, so a plain "worst N
 * overall" slice contained nothing but Hindi and Sanskrit, every time,
 * regardless of grade — even when Science or Social Science had real gaps of
 * their own worth surfacing. Reserves a minimum number of slots per subject
 * (round-robin, priority-order-within-subject) before filling any remaining
 * slots.
 */
export function selectFairGapSample(sortedGapNodes: GapNodeWithSeverity[], limit: number): GapNodeWithSeverity[] {
  const bySubject = new Map<string, GapNodeWithSeverity[]>();
  for (const g of sortedGapNodes) {
    const subj = getNodeSubjectLabel(g);
    if (!bySubject.has(subj)) bySubject.set(subj, []);
    // Per-subject order is already correct coming in — see
    // classifyGapsBySubject: worst-similarity-first for domain-covered
    // subjects, real chapter/difficulty order for subjects the source
    // curriculum has no content for at all (where similarity is noise).
    bySubject.get(subj)!.push(g);
  }
  const subjects = [...bySubject.keys()];
  if (subjects.length <= 1) return sortedGapNodes.slice(0, limit);

  const selected: GapNodeWithSeverity[] = [];
  const cursors = new Map(subjects.map(s => [s, 0]));
  let progressed = true;
  while (selected.length < limit && progressed) {
    progressed = false;
    for (const subj of subjects) {
      if (selected.length >= limit) break;
      const cursor = cursors.get(subj)!;
      const nodes = bySubject.get(subj)!;
      if (cursor >= nodes.length) continue;
      selected.push(nodes[cursor]);
      cursors.set(subj, cursor + 1);
      progressed = true;
    }
  }
  // No final re-sort: doing so would re-scramble priority order back into
  // raw similarity order, which is exactly the bug this function exists to
  // avoid for subjects with no real source-curriculum content. Consumers
  // (buildRagContext) regroup by subject anyway, so the flat array's
  // cross-subject interleaving doesn't need to be a single sorted sequence.
  return selected;
}

/**
 * Builds a per-topic "why is this a gap" reason grounded in the actual RAG
 * comparison data, replacing a bank of ~6 static canned sentences chosen by
 * keyword-matching the topic title and subject string. That approach had two
 * real problems, both confirmed in production: (1) a subject string like
 * "Social Science" contains the substring "science", so a naive check like
 * `/science/.test(subject)` fired the generic Science reason on Social
 * Science topics whose titles didn't happen to contain a civics/history/
 * geography keyword ("Understanding Social Science", "Geographical
 * Diversity of India"); (2) even the "correct" branches were identical
 * static text repeated across hundreds of unrelated topics — "This topic
 * appears earlier or is emphasized more..." says nothing specific about any
 * given topic. This version uses the real best_source_match/best_similarity
 * the database actually computed, so the reason is specific to each topic
 * rather than one of a handful of templates.
 */
/**
 * Truncates at the last word boundary before `max` chars and appends an
 * ellipsis, instead of a blunt substring cut that lands mid-word. US
 * Common Core/NGSS standard text is often a full sentence (e.g. "Determine
 * whether a group of objects (up to 20) has an odd or even number of
 * members, e.g., by pairing objects...") — a plain .substring(0, 80) cut
 * that off mid-word as "...number of mem", which reads as broken even
 * though the underlying match and percentage are both real.
 */
function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}

export function buildGapReason(gap: GapNode, domainCovered: boolean, sourceLabel: string): string {
  const subject = getNodeSubjectLabel(gap);
  const domain = canonicalSubjectDomain(subject);
  const topic = truncateAtWord(gap.target_node_name || '', 90);

  if (!domainCovered) {
    if (domain === 'hindi' || domain === 'sanskrit' || domain === 'other-language') {
      return languageSkillCategory(gap.target_node_name || '') === 'grammar'
        ? `${subject} has no prior coverage in ${sourceLabel} at all — this is foundational grammar/script material, and a good place to start since there's nothing from prior coursework to build on.`
        : `${subject} has no prior coverage in ${sourceLabel} at all — this is a reading/literature chapter, best tackled once the subject's grammar and script basics are in place.`;
    }
    if (domain === 'social-science') {
      return `${sourceLabel} does not include Indian history, civics, or geography — "${topic}" has no equivalent in your prior coursework.`;
    }
    return `${subject} has no comparable content in ${sourceLabel} — this introduces entirely new material.`;
  }

  // Domain is genuinely covered, but this specific topic still landed in the
  // gap bucket — ground the "why" in the nearest match actually found rather
  // than guessing from keywords.
  const pct = gap.best_similarity != null ? Math.round(gap.best_similarity * 100) : null;
  // Below GAP_UNRELATED_BELOW the "closest match" is merely the least-unrelated
  // standard and quoting it misleads ("Mechanical Properties of Solids" <-
  // "Explain the physiology of skeletal muscle"), so it is not named.
  if (gap.best_similarity != null && gap.best_similarity < GAP_UNRELATED_BELOW) {
    return `Nothing closely related appears in your ${sourceLabel} coursework — "${topic}" will be new content.`;
  }
  // Some state documents carry heading and cross-reference stubs as standards
  // ("Skills to be mastered at this grade level are as follows:", "See Writing
  // Types and Narrative Techniques."). Quoting one as the match says nothing.
  const isStub = (s: string) => /:\s*$/.test(s.trim()) || /^see\s/i.test(s.trim());
  if (gap.best_source_match && isStub(gap.best_source_match)) {
    return `Your ${sourceLabel} coursework only partly covers this — "${topic}" goes beyond what you've studied.`;
  }
  if (gap.best_source_match && pct != null) {
    const match = truncateAtWord(gap.best_source_match, 110);
    return `Closest match in your ${sourceLabel} coursework was "${match}" — only about ${pct}% conceptually related, so "${topic}" introduces meaningfully new content beyond what you've studied.`;
  }
  return `No closely related topic was found in your ${sourceLabel} coursework — "${topic}" introduces new content.`;
}

/**
 * Message for a subject that couldn't be assessed at all — e.g. a state's
 * social-studies standards weren't found or returned too few rows, and there
 * is no fallback source to compare against. Deliberately does NOT say
 * anything resembling "gap" or "not covered": the honest statement is that
 * this is a data limitation, not a finding about the student. Callers using
 * this should also avoid a 0%-looking score — see analyze-curriculum's
 * handling of `unavailableSubjectKeys` for the numeric-display convention
 * (a neutral 50%, matching the existing "fallback, not computed" convention
 * already used elsewhere in this codebase for the same reason).
 */
export function buildUnavailableSubjectReason(subjectLabel: string, stateLabel: string): string {
  return `We don't yet have ${stateLabel}'s standards data for ${subjectLabel} in our system, so this subject could not be assessed this time. This is a data gap on our side, not a finding about the student — please don't read the score below as a curriculum gap.`;
}

/**
 * Merges a secondary source curriculum's find_curriculum_gaps_rag results
 * into a primary result set, keyed by target_node_id, keeping whichever call
 * found the HIGHER best_similarity for each target node. Use this (not a
 * plain concatenation — that's only correct for merging additional TARGET
 * rows, e.g. adding NGSS as extra target subjects) whenever the same target
 * nodes get re-queried against a second SOURCE curriculum, e.g. adding NGSS
 * alongside us-common-core on the source side so a student's real science
 * background counts, instead of every Science-domain target topic only ever
 * being compared against irrelevant Math/ELA text.
 */
/** US high-school course content (rag-pipeline/ingest/us_courses.py). */
export const US_COURSES_SYSTEM = 'us-courses';

/**
 * Credit the high-school courses a US student has taken. State standards are
 * broad (Maryland lists 71 NGSS statements for all of high-school science, with
 * no organic chemistry or optics), so a student who took Chemistry or AP Physics
 * read as a beginner. Each selected course's units (stored under
 * curriculum_system 'us-courses', metadata.subject = the form's course label)
 * are matched against the same target nodes, and a node's best match is raised
 * when a course matches it better than the state standards did. Only nodes
 * already in `nodes` change; nothing is added. Domains of the courses that were
 * found are returned so they count as taught.
 */
export async function applyCourseMatches(opts: {
  rpc: RpcCaller;
  academicPath: string[] | undefined | null;
  nodes: GapNode[];
  targetCurriculum: string;
  targetNodeType: string | null;
  targetSubjects: string[] | null;
  gradeMin: number;
  gradeMax: number;
  debug: DebugLogger;
}): Promise<{ nodes: GapNode[]; courseDomains: Set<SubjectDomain>; upgraded: number }> {
  const none = { nodes: opts.nodes, courseDomains: new Set<SubjectDomain>(), upgraded: 0 };
  const labels = (opts.academicPath ?? []).filter(Boolean);
  if (labels.length === 0 || opts.nodes.length === 0) return none;

  const { data, error } = await opts.rpc({
    source_curriculum: US_COURSES_SYSTEM,
    source_node_type: 'topic',
    // Exact labels: non-course entries ("Mathematics") match no course rows.
    source_subjects: labels.map(asExactLikePattern),
    source_grade_min: 9,
    source_grade_max: 12,
    target_curriculum: opts.targetCurriculum,
    target_node_type_filter: opts.targetNodeType,
    target_subjects: opts.targetSubjects,
    grade_min: opts.gradeMin,
    grade_max: opts.gradeMax,
    similarity_threshold: 0.0,
    result_limit: 2000,
  });
  if (error || !Array.isArray(data) || data.length === 0) {
    if (error) opts.debug('rag_course_error', 'Course match query failed (non-fatal)', { error: error.message });
    return none;
  }

  const better = new Map<string, GapNode>();
  for (const row of data as GapNode[]) better.set(row.target_node_id, row);
  let upgraded = 0;
  const nodes = opts.nodes.map(n => {
    const c = better.get(n.target_node_id);
    if (c && (c.best_similarity ?? -1) > (n.best_similarity ?? -1)) {
      upgraded++;
      return { ...n, best_similarity: c.best_similarity, best_source_match: c.best_source_match, gap_exists: c.gap_exists };
    }
    return n;
  });
  const courseDomains = new Set<SubjectDomain>();
  for (const label of labels) {
    const d = canonicalSubjectDomain(label);
    if (CORE_DOMAIN_SET.has(d)) courseDomains.add(d);
  }
  opts.debug('rag_course_matches', 'Course content applied', { courses: labels, upgraded, rows: data.length });
  return { nodes, courseDomains, upgraded };
}

export function mergeBestSourceMatch(primary: GapNode[], supplement: GapNode[]): GapNode[] {
  const byId = new Map<string, GapNode>();
  for (const n of primary) byId.set(n.target_node_id, n);
  for (const n of supplement) {
    const existing = byId.get(n.target_node_id);
    if (!existing || (n.best_similarity ?? -1) > (existing.best_similarity ?? -1)) {
      byId.set(n.target_node_id, n);
    }
  }
  return [...byId.values()];
}
