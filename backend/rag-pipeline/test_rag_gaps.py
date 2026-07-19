"""
RAG Gap-Finding Test — mirrors the exact adaptive percentile logic in analyze-curriculum edge fn.
- similarity_threshold=0.0  (fetch ALL CC standards, classify in Python)
- Bottom 10% by sim = CRITICAL, 10-20% = MAJOR, 20-35% = MODERATE, top 65% = covered
"""
import sys, io
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

sys.path.insert(0, str(Path(__file__).parent))
from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from supabase import create_client

client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

print("=== RAG Gap-Finding Test (adaptive percentile) ===")
print("Simulating: Grade 8 NCERT/CBSE student -> US Common Core\n")

resp = client.rpc('find_curriculum_gaps_rag', {
    'source_curriculum': 'ncert-cbse',
    'target_curriculum': 'us-common-core',
    'grade_min': 7,
    'grade_max': 9,
    'similarity_threshold': 0.0,   # fetch ALL; classify in Python
    'result_limit': 300,
    'source_node_type': 'topic',
    'target_node_type_filter': 'standard',
}).execute()

data = [g for g in (resp.data or []) if g.get('target_node_type') == 'standard']

# ── Mirror edge function adaptive percentile logic ──────────────────────────
sorted_asc = sorted(data, key=lambda g: g['best_similarity'] or 0)
total      = len(sorted_asc)

if total == 0:
    print("ERROR: No CC standards returned. Check embeddings exist.")
    sys.exit(1)

crit_idx  = int(total * 0.10)
major_idx = int(total * 0.20)
gap_idx   = int(total * 0.35)

crit_thresh  = sorted_asc[crit_idx ]['best_similarity'] or 0
major_thresh = sorted_asc[major_idx]['best_similarity'] or 0
gap_thresh   = sorted_asc[gap_idx  ]['best_similarity'] or 0

def severity(sim):
    s = sim or 0
    if s <= crit_thresh:  return 'CRITICAL'
    if s <= major_thresh: return 'MAJOR'
    if s <= gap_thresh:   return 'MODERATE'
    return 'COVERED'

gap_nodes     = sorted_asc[:gap_idx + 1]   # bottom 35%
covered_nodes = sorted_asc[gap_idx + 1:]   # top 65%
alignment_pct = round(len(covered_nodes) / total * 100)

sims = [g['best_similarity'] or 0 for g in sorted_asc]
print(f"Total CC standards   : {total}")
print(f"Similarity range     : {min(sims):.4f} - {max(sims):.4f}")
print(f"Mean / Median        : {sum(sims)/len(sims):.4f} / {sims[total//2]:.4f}")
print(f"Percentile thresholds: CRITICAL<={crit_thresh:.4f}  MAJOR<={major_thresh:.4f}  GAP<={gap_thresh:.4f}")
print(f"Overall alignment    : ~{alignment_pct}% of CC standards covered by NCERT background")
print(f"Gaps identified      : {len(gap_nodes)} ({int(total*0.10)} CRITICAL, {int(total*0.10)} MAJOR, {gap_idx-int(total*0.20)} MODERATE)")

# ── Per-subject breakdown ────────────────────────────────────────────────────
by_subject = {}
for g in data:
    meta = g.get('target_metadata') or {}
    subj = str(meta.get('subject', meta.get('domain', 'General')))[:50]
    if subj not in by_subject:
        by_subject[subj] = {'gap': 0, 'covered': 0}
    sev = severity(g['best_similarity'])
    if sev == 'COVERED':
        by_subject[subj]['covered'] += 1
    else:
        by_subject[subj]['gap'] += 1

print("\n=== Per-subject alignment ===")
for subj, counts in sorted(by_subject.items()):
    total_subj = counts['gap'] + counts['covered']
    pct = round(counts['covered'] / total_subj * 100) if total_subj else 0
    bar = '#' * (pct // 5) + '.' * (20 - pct // 5)
    print(f"  [{bar}] {pct:3d}%  {subj}")
    print(f"           {counts['covered']} covered / {counts['gap']} gaps out of {total_subj} standards")

print("\n=== TOP 15 PRIORITY GAPS (CRITICAL + MAJOR) ===")
shown = 0
for g in sorted_asc:
    if shown >= 15: break
    sev = severity(g['best_similarity'])
    if sev not in ('CRITICAL', 'MAJOR'): continue
    meta  = g.get('target_metadata') or {}
    subj  = str(meta.get('subject', '?'))[:30]
    name  = (g['target_node_name'] or '')[:75].encode('ascii', 'replace').decode()
    match = (g['best_source_match'] or 'none')[:55].encode('ascii', 'replace').decode()
    desc  = (g['target_description'] or '')[:60].encode('ascii', 'replace').decode()
    print(f"  [{sev}] [{subj}] {name}")
    if desc: print(f"    Context  : {desc}")
    print(f"    Nearest NCERT: {match}")
    shown += 1

print("\n=== TOP 10 COVERED (highest NCERT similarity) ===")
for g in reversed(sorted_asc[-10:]):
    meta  = g.get('target_metadata') or {}
    subj  = str(meta.get('subject', '?'))[:30]
    sim   = round((g['best_similarity'] or 0) * 1000) / 10
    name  = (g['target_node_name'] or '')[:70].encode('ascii', 'replace').decode()
    match = (g['best_source_match'] or 'none')[:50].encode('ascii', 'replace').decode()
    print(f"  {sim:.1f}  [{subj}] {name}")
    print(f"         -> {match}")
