"""Load structured ISC syllabus JSON into curriculum_nodes + curriculum_edges.

Mirrors the NCERT shape so the existing gap engine needs no new code path:

    Unit      -> node_type 'topic'             (like an NCERT chapter)
    Subtopic  -> node_type 'learning_outcome'  (like an NCERT subtopic)
    Edge      -> relationship_type 'contains'  (unit -> subtopic)

metadata.embedding_text is pre-built here, which is what generate_embeddings.py's
generic branch already prefers - so embeddings need no ISC-specific change either.

Run isc_structure.py first. Usage (from backend/rag-pipeline/):
    python ingest/ingest_isc.py --dry-run
    python ingest/ingest_isc.py --only physics
    python ingest/ingest_isc.py --core
    python ingest/ingest_isc.py --core --fresh     # delete existing ISC rows first
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from config import INSERT_BATCH_SIZE, validate_config  # noqa: E402
from db.supabase_client import (  # noqa: E402
    batch_insert,
    delete_edges_for_curriculum,
    get_client,
    get_existing_source_ids,
    refresh_subject_index,
)
from subject_streams import subject_streams  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[3]
STRUCTURED_DIR = REPO_ROOT / "backend" / "data" / "isc" / "structured"

CURRICULUM_ISC = "isc-cisce"

CORE_SUBJECTS = [
    "mathematics", "physics", "chemistry", "biology", "english", "history",
    "geography", "economics", "political-science", "computer-science",
    "accountancy", "business-studies",
]

# Classes XI-XII are stream-based; which subjects each stream takes is shared
# with the CBSE importer in subject_streams.py.


def subject_code(slug: str) -> str:
    return re.sub(r"[^A-Z0-9]+", "", slug.upper())[:14] or "SUBJ"


def build_embedding_text(subject: str, grade: int, unit_name: str,
                         name: str, description: str, is_unit: bool) -> str:
    parts = [f"ISC Class {grade}", subject]
    if is_unit:
        parts += [f"Unit: {unit_name}", description[:200]]
    else:
        parts += [f"Unit: {unit_name}", f"Topic: {name}", description[:220]]
    return " - ".join(p for p in parts if p).strip()


def build_nodes(doc: dict, existing: set[str]) -> tuple[list[dict], list[tuple[dict, str]]]:
    """Return (unit_nodes, [(subtopic_node, parent_source_id), ...])."""
    subject = doc["subject"]
    code = subject_code(doc["slug"])
    unit_nodes: list[dict] = []
    subtopic_nodes: list[tuple[dict, str]] = []

    for cls in doc["classes"]:
        gmin, gmax = cls["grade_min"], cls["grade_max"]
        for unit in cls["units"]:
            if not unit.get("subtopics"):
                continue  # a unit with no extracted content adds no retrievable signal

            # Grade span is part of the key only when it actually spans two
            # classes. A subject can carry a combined XI-XII section AND a
            # class-specific one (English: a shared Language paper plus Class XI
            # prescribed texts), and both start at grade 11 - keying on gmin
            # alone collides. Single-grade ids keep their original shape so
            # already-ingested subjects are not re-inserted as new rows.
            span = f"{gmin}" if gmin == gmax else f"{gmin}-{gmax}"
            unit_sid = f"ISC-{code}-{span}-U{unit['number']}"
            unit_desc = re.sub(r"\s+", " ", unit.get("text", ""))[:2000]

            if unit_sid not in existing:
                unit_nodes.append(
                    {
                        "node_type": "topic",
                        "name": unit["name"][:500],
                        "description": unit_desc or None,
                        "grade_level_min": gmin,
                        "grade_level_max": gmax,
                        "curriculum_system": CURRICULUM_ISC,
                        "metadata": {
                            "source_id": unit_sid,
                            "source_type": "unit",
                            "subject": subject,
                            "streams": subject_streams(subject, gmin),
                            "board": "ISC",
                            "class_label": cls["class_label"],
                            "unit_number": unit["number"],
                            "exam_weightage": unit.get("weightage"),
                            "syllabus_year": doc.get("syllabus_year"),
                            "source_url": doc.get("source_url"),
                            "embedding_text": build_embedding_text(
                                subject, gmin, unit["name"], unit["name"], unit_desc, True
                            ),
                        },
                    }
                )
                existing.add(unit_sid)

            for idx, sub in enumerate(unit["subtopics"]):
                sub_sid = f"{unit_sid}-sub-{idx}"
                if sub_sid in existing:
                    continue
                description = sub.get("description", "") or sub["name"]
                subtopic_nodes.append(
                    (
                        {
                            "node_type": "learning_outcome",
                            "name": sub["name"][:500],
                            "description": description[:2000],
                            "grade_level_min": gmin,
                            "grade_level_max": gmax,
                            "curriculum_system": CURRICULUM_ISC,
                            "metadata": {
                                "source_id": sub_sid,
                                "source_type": "subtopic",
                                "subject": subject,
                                "streams": subject_streams(subject, gmin),
                                "board": "ISC",
                                "class_label": cls["class_label"],
                                "unit_number": unit["number"],
                                "unit": unit["name"],
                                "parent_source_id": unit_sid,
                                "subtopic_index": idx,
                                "exam_weightage": unit.get("weightage"),
                                "syllabus_year": doc.get("syllabus_year"),
                                "source_url": doc.get("source_url"),
                                "embedding_text": build_embedding_text(
                                    subject, gmin, unit["name"], sub["name"], description, False
                                ),
                            },
                        },
                        unit_sid,
                    )
                )
                existing.add(sub_sid)

    return unit_nodes, subtopic_nodes


def resolve_ids(client, source_ids: list[str]) -> dict[str, str]:
    """Map metadata.source_id -> node id for units already in the DB."""
    found: dict[str, str] = {}
    for i in range(0, len(source_ids), 200):
        chunk = source_ids[i: i + 200]
        resp = (
            client.table("curriculum_nodes")
            .select("id, metadata->>source_id")
            .eq("curriculum_system", CURRICULUM_ISC)
            .in_("metadata->>source_id", chunk)
            .execute()
        )
        for row in resp.data or []:
            if row.get("source_id"):
                found[row["source_id"]] = row["id"]
    return found


def main() -> int:
    parser = argparse.ArgumentParser(description="Ingest ISC syllabus into Supabase")
    parser.add_argument("--only", help="substring filter on subject slug")
    parser.add_argument("--core", action="store_true", help="the 12 core subjects")
    parser.add_argument("--fresh", action="store_true", help="delete existing ISC rows first")
    parser.add_argument("--dry-run", action="store_true", help="build nodes but do not write")
    args = parser.parse_args()

    files = sorted(STRUCTURED_DIR.glob("*.json"))
    if args.core:
        files = [f for f in files if f.stem in CORE_SUBJECTS]
    if args.only:
        files = [f for f in files if args.only.lower() in f.stem]
    if not files:
        print("[ERROR] no structured files matched - run isc_structure.py first")
        return 1

    print(f"\n=== ISC Ingestion ({len(files)} subjects) ===")

    if args.dry_run:
        total_u = total_s = 0
        for f in files:
            doc = json.loads(f.read_text(encoding="utf-8"))
            units, subs = build_nodes(doc, set())
            total_u += len(units)
            total_s += len(subs)
            print(f"  {doc['subject']:<20} units={len(units):>3} subtopics={len(subs):>4}")
        print(f"\n[DRY RUN] would insert {total_u} unit nodes + {total_s} subtopic nodes "
              f"= {total_u + total_s} rows, and {total_s} edges")
        return 0

    validate_config(require_embeddings=False)
    client = get_client()

    if args.fresh:
        print("[INFO] --fresh: deleting existing ISC edges, embeddings and nodes")
        n = delete_edges_for_curriculum(client, CURRICULUM_ISC)
        print(f"       edges cleared for {n} nodes")
        # The live curriculum_embeddings_node_id_fkey has no ON DELETE CASCADE,
        # despite the migration that created it declaring one, so embeddings
        # must go first or every node delete fails with a 23503.
        node_ids: list[str] = []
        offset = 0
        while True:
            page = (client.table("curriculum_nodes").select("id")
                    .eq("curriculum_system", CURRICULUM_ISC)
                    .range(offset, offset + 999).execute().data or [])
            node_ids += [row["id"] for row in page]
            if len(page) < 1000:
                break
            offset += len(page)
        for i in range(0, len(node_ids), 100):
            client.table("curriculum_embeddings").delete().in_("node_id", node_ids[i:i + 100]).execute()
        print(f"       embeddings cleared for {len(node_ids)} nodes")
        client.table("curriculum_nodes").delete().eq(
            "curriculum_system", CURRICULUM_ISC
        ).execute()

    existing = get_existing_source_ids(client, CURRICULUM_ISC)
    print(f"[INFO] {len(existing)} ISC source_ids already in DB")

    all_units: list[dict] = []
    all_subs: list[tuple[dict, str]] = []
    for f in files:
        doc = json.loads(f.read_text(encoding="utf-8"))
        units, subs = build_nodes(doc, existing)
        all_units.extend(units)
        all_subs.extend(subs)
        print(f"  {doc['subject']:<20} +{len(units):>3} units  +{len(subs):>4} subtopics")

    if not all_units and not all_subs:
        print("[INFO] nothing new to insert")
        return 0

    print(f"\n[INFO] inserting {len(all_units)} unit nodes...")
    inserted_units = batch_insert(client, "curriculum_nodes", all_units, INSERT_BATCH_SIZE)

    print(f"[INFO] inserting {len(all_subs)} subtopic nodes...")
    sub_records = [node for node, _ in all_subs]
    inserted_subs = batch_insert(client, "curriculum_nodes", sub_records, INSERT_BATCH_SIZE)

    # Map unit source_id -> db id, including units inserted on an earlier run.
    code_to_id = {
        r["metadata"]["source_id"]: r["id"]
        for r in inserted_units
        if r.get("metadata", {}).get("source_id")
    }
    missing = {parent for _, parent in all_subs if parent not in code_to_id}
    if missing:
        code_to_id.update(resolve_ids(client, sorted(missing)))

    sub_id_by_sid = {
        r["metadata"]["source_id"]: r["id"]
        for r in inserted_subs
        if r.get("metadata", {}).get("source_id")
    }

    edges = []
    for node, parent_sid in all_subs:
        sid = node["metadata"]["source_id"]
        target = sub_id_by_sid.get(sid)
        source = code_to_id.get(parent_sid)
        if source and target:
            edges.append(
                {
                    "source_node_id": source,
                    "target_node_id": target,
                    "relationship_type": "contains",
                    "weight": 1.0,
                    "metadata": {
                        "subject": node["metadata"]["subject"],
                        "unit": node["metadata"]["unit"],
                    },
                }
            )

    print(f"[INFO] inserting {len(edges)} edges...")
    inserted_edges = batch_insert(client, "curriculum_edges", edges, INSERT_BATCH_SIZE)
    refresh_subject_index(client)

    print("\n[DONE] ISC ingestion complete")
    print(f"       units={len(inserted_units)} subtopics={len(inserted_subs)} edges={len(inserted_edges)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
