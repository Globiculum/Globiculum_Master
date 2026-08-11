"""
Embedding Generation — generates vector embeddings for all curriculum_nodes
that don't yet have an entry in curriculum_embeddings, then stores them.

Embedding text strategy per node_type:
  NCERT chapter   (topic)            -> "Class N - Subject - Chapter - Description - Learning Objectives"
  NCERT subtopic  (learning_outcome) -> "Class N - Subject - Parent Chapter - Subtopic text"
  US CC standard  (standard)         -> uses pre-built metadata.embedding_text if present,
                                        otherwise "Subject - Domain - Cluster - Description - Comments"
  NGSS standard   (standard)         -> "NGSS - Grade - Domain - Standard Code - Description - Clarification"

Model: nvidia/llama-nemotron-embed-vl-1b-v2:free via OpenRouter (2048 dims) - FREE tier.
Rate:  ~20 req/min, ~200 req/day on free tier. Script resumes from last checkpoint.
DB:    Requires migration 20260712000001_update_embedding_dims_2048.sql applied first.
"""

import hashlib
import sys
import time
from pathlib import Path

from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import (
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
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
        # Generic fallback
        return f"{name} {description}".strip()


def _content_hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()[:16]


# ── Fetch nodes without embeddings ────────────────────────────────────────────

def _fetch_nodes_without_embeddings(client, batch_size: int = 1000) -> list[dict]:
    """
    Returns all curriculum_nodes that have no corresponding curriculum_embeddings row.
    Uses a LEFT JOIN via RPC or manual client-side filter.
    """
    # Fetch all node IDs that already have embeddings
    existing_ids: set[str] = set()
    offset = 0
    while True:
        resp = (
            client.table("curriculum_embeddings")
            .select("node_id")
            .range(offset, offset + batch_size - 1)
            .execute()
        )
        rows = resp.data or []
        for row in rows:
            existing_ids.add(row["node_id"])
        if len(rows) < batch_size:
            break
        offset += batch_size

    print(f"  Nodes with existing embeddings: {len(existing_ids)}")

    # Fetch all curriculum_nodes
    all_nodes: list[dict] = []
    offset = 0
    while True:
        resp = (
            client.table("curriculum_nodes")
            .select("id, node_type, name, description, grade_level_min, grade_level_max, curriculum_system, metadata")
            .range(offset, offset + batch_size - 1)
            .execute()
        )
        rows = resp.data or []
        all_nodes.extend(rows)
        if len(rows) < batch_size:
            break
        offset += batch_size

    # Filter to nodes without embeddings
    pending = [n for n in all_nodes if n["id"] not in existing_ids]
    return pending


# ── OpenRouter embedding call ─────────────────────────────────────────────────

def _embed_texts(texts: list[str], model: str = EMBEDDING_MODEL) -> list[list[float]]:
    """
    Call OpenRouter embeddings API (OpenAI-compatible) for a batch of texts.
    Returns list of embedding vectors (each is list[float] of length 2048).
    Uses nvidia/llama-nemotron-embed-vl-1b-v2:free — free model on OpenRouter.
    Retries once on 429 rate-limit with a 60-second backoff.
    We use requests directly because OpenRouter responses have leading whitespace
    that the openai SDK parser cannot handle.
    """
    import json, requests
    url = f"{OPENROUTER_BASE_URL}/embeddings"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/academi-align",
        "X-Title": "AcademiAlign RAG Ingestion",
    }
    payload = {"input": texts, "model": model, "encoding_format": "float"}

    def _call() -> list[list[float]]:
        resp = requests.post(url, headers=headers, json=payload, timeout=120)
        resp.raise_for_status()
        # Strip leading whitespace that OpenRouter sometimes returns
        raw = resp.text.strip()
        data = json.loads(raw)
        vectors = [item["embedding"] for item in data["data"]]
        if vectors and len(vectors[0]) != EMBEDDING_DIMS:
            raise ValueError(
                f"Expected {EMBEDDING_DIMS}-dim vectors from OpenRouter, got {len(vectors[0])}. "
                f"Check EMBEDDING_DIMS in config.py matches the model output."
            )
        return vectors

    try:
        return _call()
    except requests.HTTPError as exc:
        if exc.response.status_code == 429:
            print("\n  [RATE LIMIT] Waiting 60s before retry...")
            time.sleep(60)
            return _call()
        raise


# ── Main generation function ───────────────────────────────────────────────────

def generate_embeddings(curricula: list[str] | None = None) -> None:
    """
    Generate and store embeddings for curriculum_nodes that don't have them yet.

    Args:
        curricula: Optional list of curriculum_system values to process
                   (e.g. ['ncert-cbse']). None = process all.
    """
    print("\n=== Embedding Generation ===")
    print(f"Model: {EMBEDDING_MODEL}  |  Dims: {EMBEDDING_DIMS}")

    client = get_client()

    print("Fetching nodes without embeddings...")
    pending_nodes = _fetch_nodes_without_embeddings(client)

    if curricula:
        pending_nodes = [
            n for n in pending_nodes if n["curriculum_system"] in curricula
        ]

    print(f"  Nodes to embed: {len(pending_nodes)}")
    if not pending_nodes:
        print("All nodes already have embeddings. Nothing to do.")
        return

    # ── Build embedding texts ─────────────────────────────────────────────────
    texts = [_build_embedding_text(n) for n in pending_nodes]

    # ── Process in batches ────────────────────────────────────────────────────
    embedding_records: list[dict] = []
    total_batches = (len(texts) + EMBEDDING_BATCH_SIZE - 1) // EMBEDDING_BATCH_SIZE

    for i in tqdm(range(0, len(texts), EMBEDDING_BATCH_SIZE),
                  total=total_batches, desc="Embedding batches"):
        batch_texts = texts[i : i + EMBEDDING_BATCH_SIZE]
        batch_nodes = pending_nodes[i : i + EMBEDDING_BATCH_SIZE]

        try:
            vectors = _embed_texts(batch_texts)
        except Exception as exc:
            print(f"\n[ERROR] Embedding batch {i//EMBEDDING_BATCH_SIZE} failed: {exc}")
            print("  Waiting 10s before continuing...")
            time.sleep(10)
            continue

        for node, vector, text in zip(batch_nodes, vectors, batch_texts):
            embedding_records.append({
                "node_id": node["id"],
                "embedding": vector,
                "embedding_model": EMBEDDING_MODEL,
                "content_hash": _content_hash(text),
            })

        # Throttle: free tier is ~20 req/min, so wait 3s between batches
        time.sleep(3.0)

    # ── Insert embedding records ──────────────────────────────────────────────
    if embedding_records:
        print(f"\nStoring {len(embedding_records)} embeddings in DB...")
        for i in tqdm(range(0, len(embedding_records), INSERT_BATCH_SIZE),
                      desc="Inserting embeddings"):
            batch = embedding_records[i : i + INSERT_BATCH_SIZE]
            client.table("curriculum_embeddings").upsert(
                batch, on_conflict="node_id"
            ).execute()

    print(f"\n[OK] Embedding generation complete. {len(embedding_records)} embeddings stored.")
