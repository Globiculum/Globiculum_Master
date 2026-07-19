"""
US Common Core Ingestion — reads the CC Excel file and inserts into curriculum_nodes.

Data model:
  Each Excel ROW = 1 standard/concept  →  1 'standard' node (curriculum_nodes)
  Parent-child relationships (via 'Parent Standard' column)  →  'contains' edges

Deduplication:
  metadata.source_id = concept_id column (e.g. "CC-ebfed4de")
  Skip any node whose source_id already exists.

Notes:
  - Grade Level Min/Max stored as zero-padded strings ("01", "K") — parsed to int.
  - Kindergarten ("K") mapped to grade 0.
  - is_grade_band / is_anchor_or_practice rows are included (useful for context).
  - The existing embedding_text column is stored in metadata for use during
    embedding generation (saves compute — we can reuse it instead of rebuilding).
"""

import sys
from pathlib import Path

import pandas as pd
from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import (
    US_CC_DATA_PATH,
    CURRICULUM_US_CC,
    INSERT_BATCH_SIZE,
)
from db.supabase_client import get_client, batch_insert, get_existing_source_ids


# ── Helpers ────────────────────────────────────────────────────────────────────

def _safe_str(val, default: str = "") -> str:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return default
    s = str(val).strip()
    return s if s.lower() not in ("nan", "none") else default


def _safe_float(val, default=None):
    import math
    try:
        f = float(str(val))
        # NaN/inf are not JSON serializable
        if math.isnan(f) or math.isinf(f):
            return default
        return f
    except (ValueError, TypeError):
        return default


def _parse_grade_level(val) -> int:
    """Convert zero-padded grade strings ('01', 'K', '12') to int."""
    s = _safe_str(val).upper()
    if s in ("K", "KG", "KINDER", "KINDERGARTEN"):
        return 0
    try:
        return int(s.lstrip("0") or "0")
    except ValueError:
        return 0


def _safe_bool(val) -> bool:
    if isinstance(val, bool):
        return val
    s = _safe_str(val).lower()
    return s in ("true", "1", "yes")


# ── Core processing ────────────────────────────────────────────────────────────

def process_us_cc_file(filepath: Path, existing_source_ids: set[str]) -> list[dict]:
    """
    Parse the US Common Core Excel file.
    Returns a list of node dicts ready for curriculum_nodes insert.
    """
    print(f"Reading: {filepath}")
    try:
        df = pd.read_excel(filepath, engine="openpyxl")
    except Exception as exc:
        print(f"[ERROR] Could not read {filepath}: {exc}")
        return []

    print(f"  Rows found: {len(df)}")

    nodes: list[dict] = []

    for _, row in tqdm(df.iterrows(), total=len(df), desc="Parsing CC rows"):
        concept_id = _safe_str(row.get("concept_id"))
        if not concept_id:
            # Fallback to standard_code as source_id
            concept_id = _safe_str(row.get("Standard Code"))
        if not concept_id:
            continue  # skip rows with no identifier

        if concept_id in existing_source_ids:
            continue  # already ingested

        standard_code = _safe_str(row.get("Standard Code"))
        description   = _safe_str(row.get("Description"))
        embedding_text = _safe_str(row.get("embedding_text"))

        # Use Description as the human-readable name (semantically richest)
        name = description if description else standard_code
        if len(name) > 500:
            name = name[:497] + "..."

        grade_min = _parse_grade_level(row.get("Grade Level Min"))
        grade_max = _parse_grade_level(row.get("Grade Level Max"))

        # estimated_hours may be a string like "Ongoing (integrated...)" for anchor standards
        est_hours_raw = row.get("Estimated Hours")
        estimated_hours = _safe_float(est_hours_raw)  # None if not numeric

        node = {
            "node_type": "standard",
            "name": name,
            "description": description or None,
            "grade_level_min": grade_min,
            "grade_level_max": grade_max,
            "curriculum_system": CURRICULUM_US_CC,
            "metadata": {
                "source_id": concept_id,
                "source_type": "standard",
                "subject": _safe_str(row.get("Subject")) or None,
                "grade": _safe_str(row.get("Grade")) or None,
                "domain": _safe_str(row.get("Domain")) or None,
                "cluster": _safe_str(row.get("Cluster")) or None,
                "parent_standard": _safe_str(row.get("Parent Standard")) or None,
                "concept_title": _safe_str(row.get("Concept Title")) or None,
                "standard_code": standard_code or None,
                "alt_standard_code": _safe_str(row.get("Alt Standard Code")) or None,
                "depth_level": _safe_str(row.get("Depth Level")) or None,
                "difficulty_score": _safe_float(row.get("Difficulty Score")),
                "estimated_hours": estimated_hours,
                "source_url": _safe_str(row.get("Source URL")) or None,
                "has_prerequisites": _safe_str(row.get("Has Prerequisites")).lower() == "yes",
                "prerequisites": _safe_str(row.get("Prerequisites")) or None,
                "comments_examples": _safe_str(row.get("Comments/Examples")) or None,
                "concept_id": concept_id,
                "is_grade_band": _safe_bool(row.get("is_grade_band")),
                "is_anchor_or_practice": _safe_bool(row.get("is_anchor_or_practice")),
                "applies_to_grades": _safe_str(row.get("applies_to_grades")) or None,
                # Pre-built embedding text from the dataset — reuse during embed step
                "embedding_text": embedding_text or None,
            },
        }
        nodes.append(node)

    return nodes


def _build_parent_edges(
    client,
    inserted_nodes: list[dict],
) -> list[dict]:
    """
    For standards that have a Parent Standard, create 'contains' edges.
    Parent standard_code → child standard_code.
    """
    # Build standard_code → DB id from freshly inserted nodes
    code_to_id: dict[str, str] = {}
    for rec in inserted_nodes:
        sc = (rec.get("metadata") or {}).get("standard_code")
        if sc:
            code_to_id[sc] = rec["id"]

    edges: list[dict] = []
    for rec in inserted_nodes:
        meta = rec.get("metadata") or {}
        parent_sc = meta.get("parent_standard")
        if not parent_sc:
            continue
        parent_id = code_to_id.get(parent_sc)
        if not parent_id:
            continue  # parent may have been inserted previously or not found
        edges.append({
            "source_node_id": parent_id,
            "target_node_id": rec["id"],
            "relationship_type": "contains",
            "weight": 1.0,
            "metadata": {
                "subject": meta.get("subject"),
                "domain": meta.get("domain"),
            },
        })
    return edges


# ── Main ingest function ───────────────────────────────────────────────────────

def ingest_us_cc(fresh: bool = False) -> None:
    """
    Ingest the US Common Core Excel into curriculum_nodes + curriculum_edges.

    Args:
        fresh: Delete all existing US CC nodes before inserting.
    """
    print("\n=== US Common Core Ingestion ===")
    print(f"Data path: {US_CC_DATA_PATH}")

    if not US_CC_DATA_PATH.exists():
        print(f"[ERROR] US CC file not found: {US_CC_DATA_PATH}")
        return

    client = get_client()

    if fresh:
        print("[FRESH MODE] Deleting existing US CC nodes...")
        client.table("curriculum_nodes").delete().eq(
            "curriculum_system", CURRICULUM_US_CC
        ).execute()
        print("  Deleted.")

    print("Fetching existing source IDs...")
    existing = get_existing_source_ids(client, CURRICULUM_US_CC)
    print(f"  Found {len(existing)} existing nodes - will skip these.")

    nodes = process_us_cc_file(US_CC_DATA_PATH, existing)
    print(f"\nNew standard nodes to insert: {len(nodes)}")

    if not nodes:
        print("Nothing new to insert. Use --fresh to re-ingest everything.")
        return

    print("\nInserting standard nodes...")
    inserted = batch_insert(client, "curriculum_nodes", nodes, INSERT_BATCH_SIZE)
    print(f"  Inserted {len(inserted)} nodes.")

    # ── Parent-child edges ────────────────────────────────────────────────────
    edges = _build_parent_edges(client, inserted)
    if edges:
        print(f"\nInserting {len(edges)} parent->child edges...")
        batch_insert(client, "curriculum_edges", edges, INSERT_BATCH_SIZE)
        print("  Done.")

    print(f"\n[OK] US Common Core ingestion complete.")
    print(f"  Standard nodes: {len(inserted)}")
    print(f"  Edges created:  {len(edges)}")
