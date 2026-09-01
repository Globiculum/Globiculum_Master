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
  // ── NGSS (US Science) — Common Core only covers Math/ELA, so this is a
  // separate standards framework merged in alongside 'us-common-core',
  // whichever side of the transition it's on. See mergeBestSourceMatch().
  'ngss':          { dbSystem: 'ngss',           nodeType: 'standard', label: 'US NGSS (Science)' },
  'science':       { dbSystem: 'ngss',           nodeType: 'standard', label: 'US NGSS (Science)' },
  // ── Future curricula (uncomment when ingested into DB) ─────────────────
  // 'ib-myp':     { dbSystem: 'ib-myp',            nodeType: 'objective', label: 'IB MYP' },
  // 'cambridge':  { dbSystem: 'cambridge-igcse',    nodeType: 'topic',    label: 'Cambridge IGCSE' },
  // 'igcse':      { dbSystem: 'cambridge-igcse',    nodeType: 'topic',    label: 'Cambridge IGCSE' },
  // 'uk':         { dbSystem: 'uk-national',        nodeType: 'standard', label: 'UK National Curriculum' },
};

/** Resolve a curriculum string to its DB entry. Returns null if not yet ingested. */
export function mapToDBEntry(curriculum?: string): CurriculumEntry | null {
  if (!curriculum) return null;
  const c = curriculum.toLowerCase().trim();
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
  | 'mathematics' | 'english' | 'science' | 'social-science'
  | 'hindi' | 'sanskrit' | 'other-language' | 'other';

const DOMAIN_KEYWORDS: [SubjectDomain, RegExp][] = [
  ['mathematics', /math/i],
  ['english', /english|^ela$|language arts/i],
  // Checked BEFORE the generic 'science' pattern below — "Social Science"
  // literally contains the substring "Science", so a naive science-first
  // ordering misclassified it into the 'science' domain. Confirmed against
  // production data: that bug let Social Science inherit NGSS's real science
  // coverage and show 64% aligned, when Common Core/NGSS have zero actual
  // social-studies content, so it should read 0%, same as Hindi/Sanskrit.
  ['social-science', /social (science|studies)|history|geography|civics|political/i],
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
};

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
    if (!(key in SOURCE_SYSTEM_DOMAINS)) return null;
    const d = SOURCE_SYSTEM_DOMAINS[key];
    if (d === null) return null;
    d.forEach(x => domains.add(x));
  }
  return domains;
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
 * domain-availability first and relative percentile second — see the module
 * header for why a single global percentile (or a percentile-only per-subject
 * check) isn't enough on its own.
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
  subjectKeyFn: (n: GapNode) => string = getNodeSubjectLabel
): ClassifyResult {
  const domains = effectiveSourceDomains(sourceSystemsQueried);

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
  const bestAvg = subjectAvg.size > 0 ? Math.max(...subjectAvg.values()) : 0;

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
    const critIdx = Math.floor(n * 0.10);
    const majorIdx = Math.floor(n * 0.20);
    const gapIdx = Math.floor(n * 0.35);
    let subjCovered = 0;
    const gapsHere: GapNodeWithSeverity[] = [];
    const coveredHere: GapNode[] = [];

    sortedAsc.forEach((node, i) => {
      const isGap = !qualifies || i <= gapIdx;
      if (!isGap) {
        coveredCount++;
        subjCovered++;
        coveredNodes.push(node);
        coveredHere.push(node);
        return;
      }
      // When the source curriculum structurally has no content for this
      // domain at all, every topic is an equally-unknown unknown — ranking
      // them by percentile would imply a precision the similarity numbers
      // (pure cross-domain noise in that case) don't actually have.
      const severity: 'CRITICAL' | 'MAJOR' | 'MODERATE' = !domainCovered
        ? 'CRITICAL'
        : i <= critIdx ? 'CRITICAL' : i <= majorIdx ? 'MAJOR' : 'MODERATE';
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
  if (gap.best_source_match && pct != null) {
    const match = truncateAtWord(gap.best_source_match, 110);
    return `Closest match in your ${sourceLabel} coursework was "${match}" — only about ${pct}% conceptually related, so "${topic}" introduces meaningfully new content beyond what you've studied.`;
  }
  return `No closely related topic was found in your ${sourceLabel} coursework — "${topic}" introduces new content.`;
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
