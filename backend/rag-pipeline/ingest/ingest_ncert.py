"""
NCERT Ingestion — reads all NCERT Excel files and inserts into curriculum_nodes.

Data model:
  Each Excel ROW = 1 chapter  →  1 'topic' node (curriculum_nodes)
  Each SUBTOPIC line in that row  →  1 'learning_outcome' node per line
  Each chapter  →  subtopic connection  →  1 'contains' edge (curriculum_edges)

Deduplication:
  metadata.source_id is used as a stable key.
  Chapter:   source_id = standard_code  (e.g. "NCERT-MATH-5-CH1")
  Subtopic:  source_id = standard_code + "-sub-" + index  (e.g. "NCERT-MATH-5-CH1-sub-0")
  Skip any node whose source_id already exists in the DB.
"""

import re
import sys
from pathlib import Path

import pandas as pd
from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import (
    NCERT_DATA_PATH,
    NCERT_STREAMS,
    CURRICULUM_NCERT,
    INSERT_BATCH_SIZE,
)
from db.supabase_client import get_client, batch_insert, get_existing_source_ids


# ── Helpers ────────────────────────────────────────────────────────────────────

def _split_lines(cell_value) -> list[str]:
    """Split a multi-line Excel cell into individual trimmed strings."""
    if cell_value is None or (isinstance(cell_value, float) and pd.isna(cell_value)):
        return []
    raw = str(cell_value).strip()
    if not raw or raw.lower() == "nan":
        return []
    lines = re.split(r"\r?\n", raw)
    return [ln.strip() for ln in lines if ln.strip()]


def _safe_str(val, default: str = "") -> str:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return default
    s = str(val).strip()
    return s if s.lower() != "nan" else default


def _safe_int(val, default: int = 0) -> int:
    try:
        return int(float(str(val)))
    except (ValueError, TypeError):
        return default


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


def _get_stream(filepath: Path) -> str | None:
    """Extract stream name (Arts/Commerce/Medical/Non Medical) from file path."""
    for part in filepath.parts:
        if part in NCERT_STREAMS:
            return part
    return None


def _find_all_files(root: Path) -> list[Path]:
    """Recursively find all .xlsx files under the NCERT root folder."""
    return sorted(root.rglob("*.xlsx"))


# ── Core processing ────────────────────────────────────────────────────────────

def process_file(filepath: Path, existing_source_ids: set[str]) -> tuple[list[dict], list[dict]]:
    """
    Parse one NCERT Excel file.

    Returns:
        chapter_nodes  — list of dicts ready for curriculum_nodes insert
        subtopic_nodes — list of (dict, parent_standard_code) tuples
    """
    stream = _get_stream(filepath)

    try:
        df = pd.read_excel(filepath, engine="openpyxl")
    except Exception as exc:
        print(f"  [WARN] Could not read {filepath.name}: {exc}")
        return [], []

    chapter_nodes: list[dict] = []
    subtopic_nodes: list[tuple[dict, str]] = []

    for _, row in df.iterrows():
        standard_code = _safe_str(row.get("Standard Code"))
        if not standard_code:
            continue  # skip rows without a code

        chapter_name = _safe_str(row.get("Chapter"))
        if not chapter_name:
            continue

        grade_min = _safe_int(row.get("Grade Level Min"), 1)
        grade_max = _safe_int(row.get("Grade Level Max"), grade_min)
        subject    = _safe_str(row.get("Subject"))

        # ── Chapter node ──────────────────────────────────────────────────────
        chapter_source_id = standard_code
        if chapter_source_id not in existing_source_ids:
            chapter_node = {
                "node_type": "topic",
                "name": chapter_name[:500],
                "description": _safe_str(row.get("Description")) or None,
                "grade_level_min": grade_min,
                "grade_level_max": grade_max,
                "curriculum_system": CURRICULUM_NCERT,
                "metadata": {
                    "source_id": chapter_source_id,
                    "source_type": "chapter",
                    "subject": subject,
                    "book": _safe_str(row.get("Book")) or None,
                    "chapter_number": _safe_int(row.get("Chapter Number"), 0) or None,
                    "stream": stream,
                    "depth_level": _safe_str(row.get("Depth Level")) or None,
                    "difficulty_score": _safe_float(row.get("Difficulty Score")),
                    "estimated_hours": _safe_float(row.get("Estimated Hours")),
                    "standard_code": standard_code,
                    "url": _safe_str(row.get("URL")) or None,
                    "has_prerequisites": _safe_str(row.get("Has Prerequisites")).lower() == "yes",
                    "prerequisites": _split_lines(row.get("Prerequisites")),
                    "learning_objectives": _split_lines(row.get("Learning Objectives")),
                },
            }
            chapter_nodes.append(chapter_node)

        # ── Subtopic nodes ────────────────────────────────────────────────────
        subtopics = _split_lines(row.get("Subtopics"))
        for idx, subtopic_text in enumerate(subtopics):
            sub_source_id = f"{standard_code}-sub-{idx}"
            if sub_source_id in existing_source_ids:
                continue

            subtopic_node = {
                "node_type": "learning_outcome",
                "name": subtopic_text[:500],
                "description": subtopic_text,
                "grade_level_min": grade_min,
                "grade_level_max": grade_max,
                "curriculum_system": CURRICULUM_NCERT,
                "metadata": {
                    "source_id": sub_source_id,
                    "source_type": "subtopic",
                    "subject": subject,
                    "book": _safe_str(row.get("Book")) or None,
                    "chapter_number": _safe_int(row.get("Chapter Number"), 0) or None,
                    "chapter": chapter_name,
                    "parent_standard_code": standard_code,
                    "subtopic_index": idx,
                    "stream": stream,
                    "depth_level": _safe_str(row.get("Depth Level")) or None,
                    "difficulty_score": _safe_float(row.get("Difficulty Score")),
                    "url": _safe_str(row.get("URL")) or None,
                },
            }
            subtopic_nodes.append((subtopic_node, standard_code))

    return chapter_nodes, subtopic_nodes


# ── Main ingest function ───────────────────────────────────────────────────────

def ingest_ncert(fresh: bool = False) -> None:
    """
    Ingest all NCERT Excel files into curriculum_nodes + curriculum_edges.

    Args:
        fresh: If True, delete all existing NCERT nodes before inserting.
               If False (default), skip rows whose source_id already exists.
    """
    print("\n=== NCERT Ingestion ===")
    print(f"Data path: {NCERT_DATA_PATH}")

    if not NCERT_DATA_PATH.exists():
        print(f"[ERROR] NCERT data path not found: {NCERT_DATA_PATH}")
        return

    client = get_client()

    # ── Optional: wipe existing NCERT data ───────────────────────────────────
    if fresh:
        print("[FRESH MODE] Deleting existing NCERT nodes...")
        client.table("curriculum_nodes").delete().eq(
            "curriculum_system", CURRICULUM_NCERT
        ).execute()
        print("  Deleted.")

    # ── Load existing source_ids for deduplication ────────────────────────────
    print("Fetching existing source IDs...")
    existing = get_existing_source_ids(client, CURRICULUM_NCERT)
    print(f"  Found {len(existing)} existing nodes - will skip these.")

    # ── Discover all Excel files ──────────────────────────────────────────────
    files = _find_all_files(NCERT_DATA_PATH)
    print(f"Found {len(files)} Excel files.\n")

    all_chapter_nodes: list[dict] = []
    # Map standard_code → chapter_node so we can match after insert
    chapter_code_to_node: dict[str, dict] = {}
    # Each item: (subtopic_node_dict, parent_standard_code)
    all_subtopic_pairs: list[tuple[dict, str]] = []

    # ── Parse all files ───────────────────────────────────────────────────────
    for fpath in tqdm(files, desc="Parsing files"):
        ch_nodes, sub_pairs = process_file(fpath, existing)
        for cn in ch_nodes:
            sc = cn["metadata"]["standard_code"]
            chapter_code_to_node[sc] = cn
        all_chapter_nodes.extend(ch_nodes)
        all_subtopic_pairs.extend(sub_pairs)

    print(f"\nNew chapter nodes to insert:  {len(all_chapter_nodes)}")
    print(f"New subtopic nodes to insert: {len(all_subtopic_pairs)}")

    if not all_chapter_nodes and not all_subtopic_pairs:
        print("Nothing new to insert. Use --fresh to re-ingest everything.")
        return

    # ── Insert chapter nodes ──────────────────────────────────────────────────
    inserted_chapters: list[dict] = []
    if all_chapter_nodes:
        print("\nInserting chapter nodes...")
        inserted_chapters = batch_insert(
            client, "curriculum_nodes", all_chapter_nodes, INSERT_BATCH_SIZE
        )
        print(f"  Inserted {len(inserted_chapters)} chapter nodes.")

    # Build standard_code → DB id mapping for edge creation
    code_to_db_id: dict[str, str] = {}
    for rec in inserted_chapters:
        sc = (rec.get("metadata") or {}).get("standard_code")
        if sc:
            code_to_db_id[sc] = rec["id"]

    # For already-existing chapter nodes we still need their IDs for new subtopics
    # Fetch IDs for any standard_codes whose subtopics are new but chapters existed
    missing_codes = set()
    for _, parent_sc in all_subtopic_pairs:
        if parent_sc not in code_to_db_id:
            missing_codes.add(parent_sc)

    if missing_codes:
        print(f"Fetching IDs for {len(missing_codes)} existing parent chapters...")
        # Query in batches of 50
        missing_list = list(missing_codes)
        for i in range(0, len(missing_list), 50):
            batch_codes = missing_list[i : i + 50]
            rows = (
                client.table("curriculum_nodes")
                .select("id, metadata")
                .eq("curriculum_system", CURRICULUM_NCERT)
                .in_("metadata->>source_id", batch_codes)
                .execute()
            )
            for row in (rows.data or []):
                sc = (row.get("metadata") or {}).get("standard_code")
                if sc:
                    code_to_db_id[sc] = row["id"]

    # ── Insert subtopic nodes ─────────────────────────────────────────────────
    all_subtopic_nodes = [pair[0] for pair in all_subtopic_pairs]
    inserted_subtopics: list[dict] = []
    if all_subtopic_nodes:
        print("\nInserting subtopic nodes...")
        inserted_subtopics = batch_insert(
            client, "curriculum_nodes", all_subtopic_nodes, INSERT_BATCH_SIZE
        )
        print(f"  Inserted {len(inserted_subtopics)} subtopic nodes.")

    # ── Build source_id → inserted DB id for subtopics ───────────────────────
    source_id_to_db_id: dict[str, str] = {}
    for rec in inserted_subtopics:
        sid = (rec.get("metadata") or {}).get("source_id")
        if sid:
            source_id_to_db_id[sid] = rec["id"]

    # ── Create edges (chapter 'contains' subtopic) ────────────────────────────
    edge_records: list[dict] = []
    for sub_node, parent_sc in all_subtopic_pairs:
        parent_db_id = code_to_db_id.get(parent_sc)
        sub_source_id = sub_node["metadata"]["source_id"]
        sub_db_id = source_id_to_db_id.get(sub_source_id)

        if parent_db_id and sub_db_id:
            edge_records.append({
                "source_node_id": parent_db_id,
                "target_node_id": sub_db_id,
                "relationship_type": "contains",
                "weight": 1.0,
                "metadata": {
                    "subject": sub_node["metadata"]["subject"],
                    "chapter": sub_node["metadata"]["chapter"],
                },
            })

    if edge_records:
        print(f"\nInserting {len(edge_records)} chapter->subtopic edges...")
        batch_insert(client, "curriculum_edges", edge_records, INSERT_BATCH_SIZE)
        print("  Done.")

    print(f"\n[OK] NCERT ingestion complete.")
    print(f"  Chapter nodes: {len(inserted_chapters)}")
    print(f"  Subtopic nodes: {len(inserted_subtopics)}")
    print(f"  Edges created: {len(edge_records)}")
