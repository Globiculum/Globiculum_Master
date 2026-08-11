"""
NGSS Ingestion — reads the NGSS (Next Generation Science Standards) Excel file
and inserts into curriculum_nodes.

Data model:
  Each Excel ROW = 1 performance expectation  →  1 'standard' node (curriculum_nodes)
  curriculum_system = 'ngss' (kept distinct from 'us-common-core', which only
  covers Math + ELA — NGSS is a separate standards framework for Science).

  No parent/child hierarchy is present in the source file (no "Parent Standard"
  column like the US Common Core dataset), so no edges are created here.

Deduplication:
  metadata.source_id = "NGSS-<Standard Code>" (e.g. "NGSS-K-2-ETS1-1").
  Standard Code is unique per row in the source file (verified: 208/208 unique).
  Skip any node whose source_id already exists.

Notes:
  - Grade Level Min/Max stored as zero-padded strings ("01", "K") — parsed to int,
    same convention as ingest_us_cc.py.
  - Concept Title duplicates Standard Code in this dataset, so Description
    (always populated) is used as the human-readable node name, matching the
    US CC convention.
  - Unlike US CC, this file has NO pre-built embedding_text column — embedding
    text is generated later in generate_embeddings.py from Domain Name +
    Standard Code + Description + Clarification notes.
  - Several columns present in the sheet (Sub-Topic, Depth Level, Difficulty
    Score, Estimated Hours, Prerequisites, Has Prerequisites) are entirely
    empty for every row in the current dataset — they are still read
    defensively (in case a future refresh populates them) but will store as
    None/False today.
"""

import sys
from pathlib import Path

import pandas as pd
from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import (
    NGSS_DATA_PATH,
    CURRICULUM_NGSS,
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

def process_ngss_file(filepath: Path, existing_source_ids: set[str]) -> list[dict]:
    """
    Parse the NGSS Excel file.
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

    for _, row in tqdm(df.iterrows(), total=len(df), desc="Parsing NGSS rows"):
        standard_code = _safe_str(row.get("Standard Code"))
        if not standard_code:
            continue  # skip rows with no identifier

        source_id = f"NGSS-{standard_code}"
        if source_id in existing_source_ids:
            continue  # already ingested

        description = _safe_str(row.get("Description"))
        concept_title = _safe_str(row.get("Concept Title"))

        # Description is always populated in this dataset — prefer it as the
        # human-readable name (same convention as ingest_us_cc.py).
        name = description if description else (concept_title or standard_code)
        if len(name) > 500:
            name = name[:497] + "..."

        grade_min = _parse_grade_level(row.get("Grade Level Min"))
        grade_max = _parse_grade_level(row.get("Grade Level Max"))

        estimated_hours = _safe_float(row.get("Estimated Hours"))

        node = {
            "node_type": "standard",
            "name": name,
            "description": description or None,
            "grade_level_min": grade_min,
            "grade_level_max": grade_max,
            "curriculum_system": CURRICULUM_NGSS,
            "metadata": {
                "source_id": source_id,
                "source_type": "standard",
                "subject": _safe_str(row.get("Subject")) or None,
                "grade": _safe_str(row.get("Grade")) or None,
                "domain_code": _safe_str(row.get("Domain Code")) or None,
                "domain": _safe_str(row.get("Domain Name")) or None,
                "concept_title": concept_title or None,
                "standard_code": standard_code,
                "depth_level": _safe_float(row.get("Depth Level")),
                "difficulty_score": _safe_float(row.get("Difficulty Score")),
                "estimated_hours": estimated_hours,
                "source_url": _safe_str(row.get("Source URL")) or None,
                "has_prerequisites": _safe_bool(row.get("Has Prerequisites")),
                "prerequisites": _safe_str(row.get("Prerequisites")) or None,
                "comments_examples": _safe_str(row.get("Clarification / Boundary Notes")) or None,
                "concept_id": source_id,
                # NGSS performance expectations have no parent/cluster hierarchy
                # in this dataset — always flat "standard" nodes.
                "is_grade_band": False,
                "is_anchor_or_practice": False,
            },
        }
        nodes.append(node)

    return nodes


# ── Main ingest function ───────────────────────────────────────────────────────

def ingest_ngss(fresh: bool = False) -> None:
    """
    Ingest the NGSS Excel into curriculum_nodes.

    Args:
        fresh: Delete all existing NGSS nodes before inserting.
    """
    print("\n=== NGSS Ingestion ===")
    print(f"Data path: {NGSS_DATA_PATH}")

    if not NGSS_DATA_PATH.exists():
        print(f"[ERROR] NGSS file not found: {NGSS_DATA_PATH}")
        return

    client = get_client()

    if fresh:
        print("[FRESH MODE] Deleting existing NGSS nodes...")
        client.table("curriculum_nodes").delete().eq(
            "curriculum_system", CURRICULUM_NGSS
        ).execute()
        print("  Deleted.")

    print("Fetching existing source IDs...")
    existing = get_existing_source_ids(client, CURRICULUM_NGSS)
    print(f"  Found {len(existing)} existing nodes - will skip these.")

    nodes = process_ngss_file(NGSS_DATA_PATH, existing)
    print(f"\nNew standard nodes to insert: {len(nodes)}")

    if not nodes:
        print("Nothing new to insert. Use --fresh to re-ingest everything.")
        return

    print("\nInserting standard nodes...")
    inserted = batch_insert(client, "curriculum_nodes", nodes, INSERT_BATCH_SIZE)
    print(f"  Inserted {len(inserted)} nodes.")

    print(f"\n[OK] NGSS ingestion complete.")
    print(f"  Standard nodes: {len(inserted)}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Ingest NGSS data into Supabase.")
    parser.add_argument("--fresh", action="store_true", help="Delete existing NGSS nodes first.")
    args = parser.parse_args()
    ingest_ngss(fresh=args.fresh)
