"""
Embedding Generation — generates vector embeddings for all curriculum_nodes
that don't yet have an entry in curriculum_embeddings, then stores them.

Embedding text strategy per node_type:
  NCERT chapter   (topic)            -> "Class N - Subject - Chapter - Description - Learning Objectives"
  NCERT subtopic  (learning_outcome) -> "Class N - Subject - Parent Chapter - Subtopic text"
  US CC / state   (standard)         -> uses pre-built metadata.embedding_text if present
  NGSS standard   (standard)         -> "NGSS - Grade - Domain - Standard Code - Description - Clarification"

Model: text-embedding-3-small via OpenAI ($0.02/1M tokens, 1536-dim vectors).
DB:    Requires migration 20260819000000_update_embedding_dims_1536.sql applied first.
"""

import hashlib
import sys
import time
from pathlib import Path

from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import (
    OPENAI_API_KEY,
    EMBEDDING_MODEL,
    EMBEDDING_DIMS,
    EMBEDDING_BATCH_SIZE,
    INSERT_BATCH_SIZE,
    CURRICULUM_NCERT,
    CURRICULUM_US_CC,
    CURRICULUM_NGSS,
)
from db.supabase_client import get_client


# ── Embedding text builders ────────────────────────────────────────────────────

def _build_embedding_text(node: dict) -> str:
    """
    Build a rich, semantically meaningful text string for embedding.
    """
    meta = node.get("metadata") or {}
    node_type = node.get("node_type", "")
    name = node.get("name", "")
    description = node.get("description", "") or ""
    curriculum = node.get("curriculum_system", "")

    if curriculum == CURRICULUM_US_CC:
        # Prefer the pre-computed embedding_text from the dataset
        prebuilt = meta.get("embedding_text") or ""
        if prebuilt:
            return prebuilt.strip()
        # Fallback: build from fields
        parts = [
            meta.get("subject") or "",
            meta.get("domain") or "",
            meta.get("cluster") or "",
            name,
            description,
        ]
        return " - ".join(p for p in parts if p).strip()

    elif curriculum == CURRICULUM_NCERT:
        subject = meta.get("subject") or ""
        book = meta.get("book") or ""
        chapter = meta.get("chapter") or name  # for subtopics, chapter field holds parent name
        stream = meta.get("stream") or ""
        grade_min = node.get("grade_level_min", "")

        if node_type == "topic":
            # Chapter node — include learning objectives for rich semantic signal
            learning_objs = meta.get("learning_objectives") or []
            if isinstance(learning_objs, list):
                objs_text = "; ".join(learning_objs[:6])  # up to 6 objectives
            else:
                objs_text = str(learning_objs)[:300]
            parts = [
                f"NCERT Class {grade_min}",
                stream,
                subject,
                book,
                f"Chapter: {name}",
                description[:200] if description else "",
                objs_text,
            ]
        else:
            # Subtopic / learning_outcome node
            parts = [
                f"NCERT Class {grade_min}",
                stream,
                subject,
                f"Chapter: {chapter}",
                f"Topic: {name}",
            ]

        return " - ".join(p for p in parts if p).strip()

    elif curriculum == CURRICULUM_NGSS:
        grade = meta.get("grade") or ""
        domain = meta.get("domain") or ""
        standard_code = meta.get("standard_code") or ""
        clarification = meta.get("comments_examples") or ""
        parts = [
            "NGSS",
            grade,
            domain,
            f"Standard: {standard_code}" if standard_code else "",
            description,
            clarification[:200] if clarification else "",
        ]
        return " - ".join(p for p in parts if p).strip()

    else:
        # Generic fallback — prefer pre-built embedding_text (set by API ingest)
        prebuilt = meta.get("embedding_text") or ""
        if prebuilt:
            return prebuilt.strip()
        return f"{name} {description}".strip()


def _content_hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()[:16]


# ── System discovery & per-page helpers ───────────────────────────────────────

def _get_curriculum_systems(client) -> list[str]:
    """
    Return sorted list of distinct curriculum_system values via RPC.
    Falls back to a limited client-side scan if the RPC doesn't exist yet.
    """
    try:
        resp = client.rpc("get_distinct_curriculum_systems").execute()
        return sorted(r["curriculum_system"] for r in (resp.data or []))
    except Exception:
        # Fallback: fetch first 1000 rows for system names (covers up to ~15 systems)
        resp = (
            client.table("curriculum_nodes")
            .select("curriculum_system")
            .limit(1000)
            .execute()
        )
        return sorted({r["curriculum_system"] for r in (resp.data or [])})


def _count_nodes_for_system(client, curriculum_system: str) -> int:
    """Return total node count for a curriculum_system."""
    resp = (
        client.table("curriculum_nodes")
        .select("id", count="exact", head=True)
        .eq("curriculum_system", curriculum_system)
        .execute()
    )
    return resp.count or 0


def _already_embedded_ids(client, node_ids: list[str]) -> set[str]:
    """Return the subset of node_ids that already have an embedding row."""
    if not node_ids:
        return set()
    resp = (
        client.table("curriculum_embeddings")
        .select("node_id")
        .in_("node_id", node_ids)
        .execute()
    )
    return {r["node_id"] for r in (resp.data or [])}


# ── OpenAI embedding call ───────────────────────────────────────────────────────

def _embed_texts(texts: list[str], model: str = EMBEDDING_MODEL) -> list[list[float]]:
    """
    Call OpenAI embeddings API for a batch of texts.
    Returns list of 1536-dim float vectors using text-embedding-3-small.
    Retries once on 429 with a 60-second backoff.
    """
    from openai import OpenAI, RateLimitError

    client = OpenAI(api_key=OPENAI_API_KEY)

    def _call() -> list[list[float]]:
        resp = client.embeddings.create(model=model, input=texts)
        vectors = [item.embedding for item in resp.data]
        if vectors and len(vectors[0]) != EMBEDDING_DIMS:
            raise ValueError(
                f"Expected {EMBEDDING_DIMS}-dim vectors, got {len(vectors[0])}. "
                f"Check EMBEDDING_DIMS in config.py matches the model output."
            )
        return vectors

    try:
        return _call()
    except RateLimitError:
        print("\n  [RATE LIMIT] Waiting 60s before retry...")
        time.sleep(60)
        return _call()


# ── Main generation function ───────────────────────────────────────────────────

NODE_PAGE_SIZE = 100    # nodes fetched + embedded per round-trip
EMBED_INSERT_BATCH = 50  # embedding upsert batch (50 × 1536 floats ≈ 300KB per request)


def generate_embeddings(curricula: list[str] | None = None) -> None:
    """
    Generate and store embeddings for curriculum_nodes that don't have them yet.
    Streams one curriculum_system at a time, embeds and stores each page
    immediately to avoid timeouts and OOM on large datasets (190K+ nodes).

    Args:
        curricula: Optional list of curriculum_system values to process.
                   None = process all systems discovered in DB.
    """
    print("\n=== Embedding Generation ===")
    print(f"Model: {EMBEDDING_MODEL}  |  Dims: {EMBEDDING_DIMS}")

    client = get_client()

    # Discover which systems to process
    systems = _get_curriculum_systems(client)
    if curricula:
        systems = [s for s in systems if s in curricula]

    if not systems:
        print("No curriculum systems found. Nothing to do.")
        return

    print(f"  Systems to process ({len(systems)}): {', '.join(systems)}\n")

    grand_total = 0

    for system in systems:
        total_nodes = _count_nodes_for_system(client, system)
        print(f"[{system}]  {total_nodes:,} nodes total")

        system_count = 0
        offset = 0

        with tqdm(total=total_nodes, desc=f"  {system[:30]}", unit="nodes") as pbar:
            while True:
                # ── Fetch page of nodes ──────────────────────────────────────
                for attempt in range(3):
                    try:
                        resp = (
                            client.table("curriculum_nodes")
                            .select(
                                "id, node_type, name, description, "
                                "grade_level_min, grade_level_max, "
                                "curriculum_system, metadata"
                            )
                            .eq("curriculum_system", system)
                            .range(offset, offset + NODE_PAGE_SIZE - 1)
                            .execute()
                        )
                        break
                    except Exception as exc:
                        if attempt == 2:
                            raise
                        print(f"\n  [WARN] Fetch error (attempt {attempt+1}): {exc}")
                        time.sleep(5)
                        client = get_client()

                nodes = resp.data or []
                if not nodes:
                    break

                pbar.update(len(nodes))

                # ── Skip nodes that already have embeddings ──────────────────
                node_ids = [n["id"] for n in nodes]
                for attempt in range(3):
                    try:
                        done_ids = _already_embedded_ids(client, node_ids)
                        break
                    except Exception as exc:
                        if attempt == 2:
                            done_ids = set()
                            print(f"\n  [WARN] Could not check existing embeddings: {exc}")
                        else:
                            time.sleep(3)
                            client = get_client()
                pending = [n for n in nodes if n["id"] not in done_ids]

                if pending:
                    texts = [_build_embedding_text(n) for n in pending]

                    try:
                        vectors = _embed_texts(texts)
                    except Exception as exc:
                        print(f"\n  [WARN] Embed failed at offset {offset}: {exc}")
                        print("  Waiting 30s before continuing...")
                        time.sleep(30)
                        offset += NODE_PAGE_SIZE
                        continue

                    records = [
                        {
                            "node_id": node["id"],
                            "embedding": vector,
                            "embedding_model": EMBEDDING_MODEL,
                            "content_hash": _content_hash(text),
                        }
                        for node, vector, text in zip(pending, vectors, texts)
                    ]

                    # ── Store immediately (small batches for large vectors) ──
                    for i in range(0, len(records), EMBED_INSERT_BATCH):
                        batch = records[i : i + EMBED_INSERT_BATCH]
                        for attempt in range(3):
                            try:
                                client.table("curriculum_embeddings").upsert(
                                    batch, on_conflict="node_id",
                                ).execute()
                                break
                            except Exception as exc:
                                if attempt == 2:
                                    print(f"\n  [WARN] Upsert failed after 3 tries: {exc}")
                                else:
                                    time.sleep(5)
                                    client = get_client()

                    system_count += len(records)
                    grand_total += len(records)

                if len(nodes) < NODE_PAGE_SIZE:
                    break

                offset += NODE_PAGE_SIZE
                time.sleep(0.1)   # light pause; OpenAI paid has high TPM limit

        print(f"  → {system_count:,} new embeddings stored for [{system}]\n")

    print(f"[OK] Embedding generation complete. {grand_total:,} total embeddings stored.")
