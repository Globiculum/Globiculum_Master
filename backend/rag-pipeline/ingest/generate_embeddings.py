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

=============================================================================
RELIABILITY NOTE (post-incident rewrite)
=============================================================================
An earlier version of this script ran 6 curriculum systems concurrently,
fetched 300 nodes per page, sent 300 texts per OpenAI call, and reconnected
the DB client on every single retry attempt. Under sustained combined load
(this script + a concurrent ingestion job), that reconnect-on-every-retry
pattern created a connection storm on a Nano-tier Supabase instance that
escalated into a full production outage (Postgres stopped responding to
ALL queries, including the live app's, until compute was manually resolved).

This version is deliberately conservative. Priority order, in this order:
  1. Never lose/skip embedding work silently.
  2. Protect Supabase/OpenAI from connection/request overload.
  3. Preserve already-created embeddings (never delete/regenerate).
  4. Be safely restartable (Ctrl+C anytime; re-run picks up from DB state).
  5. Only then, maximize throughput.

Processing is sequential (one curriculum_system at a time, one OpenAI batch
at a time) by default. See the EMBED_* environment variables below.
=============================================================================
"""

import hashlib
import os
import random
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import (
    OPENAI_API_KEY,
    EMBEDDING_MODEL,
    EMBEDDING_DIMS,
    CURRICULUM_NCERT,
    CURRICULUM_US_CC,
    CURRICULUM_NGSS,
)
from db.supabase_client import get_client, _should_reconnect


# ── Tunables — all overridable via environment variables, conservative defaults ─
#
# These control database and OpenAI request pressure directly. If you ever
# want to trade some stability for speed again (e.g. once compute is
# confirmed to handle it), raise these via env vars rather than editing code.

NODE_PAGE_SIZE = int(os.getenv("EMBED_NODE_PAGE_SIZE", "100"))
# Nodes fetched from Supabase per page/round-trip.

OPENAI_EMBED_BATCH_SIZE = int(os.getenv("EMBED_OPENAI_BATCH_SIZE", "50"))
# Texts sent to OpenAI in a single embeddings.create() call. Deliberately
# separate from NODE_PAGE_SIZE — a page of pending nodes is split into
# OpenAI-sized sub-batches (e.g. 100 fetched, 73 pending -> batches of 50 + 23).

EMBED_INSERT_BATCH = int(os.getenv("EMBED_INSERT_BATCH", "50"))
# Rows per curriculum_embeddings upsert call. Kept equal to the OpenAI batch
# size by default so every OpenAI batch is stored in exactly one upsert —
# simplest possible mapping between "embedded" and "persisted".

SYSTEM_CONCURRENCY = int(os.getenv("EMBED_SYSTEM_CONCURRENCY", "1"))
# Curriculum systems processed in parallel. Default 1 = fully sequential, no
# thread pool at all — the safest option and the one that should stay
# default. Concurrent multi-system processing (with a per-worker connection
# pool, and — critically — the old reconnect-per-retry pattern) was the
# direct cause of a production connection-storm outage previously. That
# specific root cause (uncapped, per-retry reconnects — see
# db/supabase_client.py's get_client()/_should_reconnect()) is now fixed, so
# bounded concurrency has been reintroduced, but ONLY change this above 1
# deliberately, after Stage 1 has run stably, and validate with a small
# controlled test before a full run — see generate_embeddings() for the
# hard MAX_SYSTEM_CONCURRENCY safety ceiling regardless of this value.

EMBED_BATCH_DELAY = float(os.getenv("EMBED_BATCH_DELAY", "0.5"))
# Pause after each successfully stored embedding batch, purely to avoid
# hammering Supabase with back-to-back requests. Small and deliberate, not
# a rate-limit workaround (retries handle those separately).

EMBED_MAX_RETRIES = int(os.getenv("EMBED_MAX_RETRIES", "5"))
# Max retries (on top of the first attempt) for any single OpenAI call, DB
# fetch, or DB upsert before that batch is treated as a permanent failure.


# ── Embedding text builders (unchanged — do not alter embedding quality) ───────

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


_print_lock = threading.Lock()


def _log(msg: str) -> None:
    """Print via tqdm.write (never clobbers an active progress bar), guarded
    by a lock so concurrent system workers (EMBED_SYSTEM_CONCURRENCY > 1)
    can't interleave partial lines."""
    with _print_lock:
        tqdm.write(msg)


# ── Backoff helper (shared by DB and OpenAI retries) ────────────────────────────

def _backoff_delay(attempt: int) -> float:
    """
    Exponential backoff with jitter: ~5s, 10s, 20s, 40s, capped at 60s
    thereafter, plus up to 30% random jitter to avoid retry synchronization.
    """
    base = min(5 * (2 ** attempt), 60)
    return base + random.uniform(0, base * 0.3)


def _retry_after_seconds(exc: Exception) -> float | None:
    """Extract a Retry-After header from an OpenAI SDK exception, if present."""
    resp = getattr(exc, "response", None)
    headers = getattr(resp, "headers", None)
    if headers:
        val = headers.get("retry-after")
        if val:
            try:
                return float(val)
            except (TypeError, ValueError):
                pass
    return None


# ── Database retry wrapper ───────────────────────────────────────────────────
#
# A single bounded-retry helper used for every Supabase/PostgREST call in this
# script (fetch nodes, check existing embeddings, upsert embeddings). It does
# NOT reconnect on every failure — only when _should_reconnect() judges the
# error to actually be connection-level, and even then only occasionally.
# Connection churn from reconnecting on every attempt is exactly what caused
# the previous outage, so this is deliberately conservative about it.
#
# On exhausting all retries, this RAISES — callers must not catch this and
# silently continue. A batch that cannot be read/written after retries is a
# hard stop for the current curriculum_system, not a skip.

# Postgrest/Postgres error signatures that are permanent, not transient —
# retrying these accomplishes nothing (a bad column name or revoked key
# doesn't fix itself on attempt 2). Matched as substrings against the
# exception's string form, since postgrest-py errors don't expose a clean
# typed hierarchy the way the OpenAI SDK does. Deliberately narrow: DB
# timeouts/disconnects are the dominant REAL failure mode we've observed all
# session, so anything not clearly one of these stays in the retryable path.
_DB_NON_RETRYABLE_SIGNATURES = (
    "42703",   # undefined_column
    "42501",   # insufficient_privilege
    "3f000",   # invalid_schema_name
    "pgrst202",  # RPC function not found
    "invalid api key",
    "jwt expired",
    "invalid jwt",
)


def _is_db_non_retryable(exc: Exception) -> bool:
    msg = str(exc).lower()
    return any(sig in msg for sig in _DB_NON_RETRYABLE_SIGNATURES)


# Stale-pooled-connection signatures — genuinely different from server
# overload (statement timeouts, 503s). Observed in practice: the underlying
# httpx connection pool discards the dead connection and opens a fresh one
# automatically, so the very next attempt succeeds almost every time
# regardless of backoff length. Waiting the full 5-40s exponential schedule
# for these is pure wasted time, not caution — it was the dominant cause of
# perceived slowness (on one run, ~86% of upserts hit this and each ate a
# 5-6s wait for a retry that would have succeeded in under a second).
# Deliberately narrow and distinct from _DB_NON_RETRYABLE_SIGNATURES: this
# set still retries (nothing here is a permanent failure), it just retries
# fast instead of slow.
_DB_STALE_CONNECTION_SIGNATURES = (
    "forcibly closed",       # Windows: [WinError 10054]
    "connection reset",
    "connection aborted",
    "broken pipe",
    "remoteprotocolerror",
    "server disconnected",
)


def _is_stale_connection_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return any(sig in msg for sig in _DB_STALE_CONNECTION_SIGNATURES)


_FAST_RETRY_DELAY_BASE = 0.4  # seconds — plus jitter, see below


def _db_call(client, fn, label: str):
    """
    Call fn(client) -> result with bounded retries — but the wait between
    attempts depends on WHAT failed:
      - Non-retryable (bad column, revoked key, etc.): fail immediately, no wait.
      - Stale pooled connection (reset/forcibly closed/etc.): fast retry
        (~0.4-0.7s) — these overwhelmingly succeed on the very next attempt.
      - Everything else (statement timeouts, 503s, genuine overload signals):
        the full exponential backoff — these DO mean the DB needs breathing
        room, so slowing down here is the right call.
    Returns (result, possibly-reconnected client).
    Raises RuntimeError (chained from the original exception) if every
    attempt is exhausted, or immediately for a non-retryable error.
    """
    last_exc: Exception | None = None
    for attempt in range(EMBED_MAX_RETRIES + 1):
        try:
            return fn(client), client
        except Exception as exc:
            last_exc = exc
            if _is_db_non_retryable(exc):
                _log(f"  [ERROR] {label} failed with a NON-retryable error: {exc} — failing immediately, no retry.")
                raise RuntimeError(f"{label} failed permanently (non-retryable database error)") from exc
            if attempt == EMBED_MAX_RETRIES:
                break
            if _should_reconnect(exc, attempt):
                client = get_client()
            if _is_stale_connection_error(exc):
                wait = _FAST_RETRY_DELAY_BASE + random.uniform(0, _FAST_RETRY_DELAY_BASE)
                _log(f"  [WARN] {label} failed (attempt {attempt + 1}/{EMBED_MAX_RETRIES + 1}, stale connection): {exc} — fast retry in {wait:.1f}s")
            else:
                wait = _backoff_delay(attempt)
                _log(f"  [WARN] {label} failed (attempt {attempt + 1}/{EMBED_MAX_RETRIES + 1}, transient): {exc} — retrying in {wait:.1f}s")
            time.sleep(wait)
    raise RuntimeError(f"{label} failed permanently after {EMBED_MAX_RETRIES + 1} attempts (transient errors exhausted retry budget)") from last_exc


def _get_curriculum_systems(client) -> list[str]:
    """
    Return sorted list of distinct curriculum_system values via RPC, retrying
    on transient failures before falling back.

    IMPORTANT: the fallback paginates the ENTIRE table rather than sampling
    the first page — curriculum_nodes is effectively insertion-ordered, and a
    naive "first N rows" sample would silently under-report systems ingested
    later (this was a real bug here previously).
    """
    def _rpc(c):
        resp = c.rpc("get_distinct_curriculum_systems").execute()
        systems = sorted(r["curriculum_system"] for r in (resp.data or []))
        if not systems:
            raise RuntimeError("RPC returned no systems")
        return systems

    try:
        systems, _ = _db_call(client, _rpc, "get_distinct_curriculum_systems RPC")
        return systems
    except RuntimeError:
        pass

    _log("  [WARN] RPC unavailable after retries — falling back to a full table scan for system names (slower, but correct).")
    found: set[str] = set()
    offset = 0
    page = 1000  # PostgREST enforces its own max-rows cap (commonly 1000)
                 # regardless of what's requested, so pagination advances by
                 # the ACTUAL returned row count, not this constant.
    while True:
        def _fetch(c, offset=offset):
            return (
                c.table("curriculum_nodes")
                .select("curriculum_system")
                .range(offset, offset + page - 1)
                .execute()
            )
        resp, client = _db_call(client, _fetch, "system-scan fetch")
        rows = resp.data or []
        found.update(r["curriculum_system"] for r in rows)
        if not rows:
            break
        offset += len(rows)
    return sorted(found)


def _count_nodes_for_system(client, curriculum_system: str) -> tuple[int, object]:
    """Return total node count for a curriculum_system, with retry."""
    def _fetch(c):
        return (
            c.table("curriculum_nodes")
            .select("id", count="exact", head=True)
            .eq("curriculum_system", curriculum_system)
            .execute()
        )
    resp, client = _db_call(client, _fetch, f"count nodes for {curriculum_system}")
    return resp.count or 0, client


def _already_embedded_ids(client, node_ids: list[str]) -> tuple[set[str], object]:
    """Return the subset of node_ids that already have an embedding row."""
    if not node_ids:
        return set(), client

    def _fetch(c):
        return (
            c.table("curriculum_embeddings")
            .select("node_id")
            .in_("node_id", node_ids)
            .execute()
        )
    resp, client = _db_call(client, _fetch, "check existing embeddings")
    return {r["node_id"] for r in (resp.data or [])}, client


# ── OpenAI embedding call ────────────────────────────────────────────────────

_openai_client = None
_openai_client_lock = threading.Lock()


def _get_openai_client():
    """Single shared OpenAI client, created once (its HTTP client manages its
    own small connection pool — no reason to recreate it per call). Lock
    guards first-time creation under concurrency (EMBED_SYSTEM_CONCURRENCY >
    1) — without it, two worker threads racing on startup could both see
    `None` and construct duplicate clients. Benign either way (no data
    corruption), but the lock makes it deterministic."""
    global _openai_client
    if _openai_client is None:
        with _openai_client_lock:
            if _openai_client is None:
                from openai import OpenAI
                _openai_client = OpenAI(api_key=OPENAI_API_KEY)
    return _openai_client


def _embed_texts(texts: list[str], model: str = EMBEDDING_MODEL) -> list[list[float]]:
    """
    Call OpenAI embeddings API for a batch of texts, with bounded retries and
    exponential backoff + jitter — but ONLY for errors that are actually
    transient. Handles rate limits (429), connection errors, timeouts, and
    5xx server errors explicitly; respects a Retry-After header when OpenAI
    provides one instead of blind backoff.

    Non-retryable errors (bad API key, malformed request, unknown model,
    permission denied, or our own dim-mismatch check) fail IMMEDIATELY on the
    first occurrence — no backoff, no wasted attempts. Retrying a 401
    Authentication error 5 times with up to a minute of backoff between each
    attempt accomplishes nothing except delaying the failure by several
    minutes; these are deterministic and will never succeed on retry.

    Raises RuntimeError (chained) in both cases — the caller must treat this
    as a hard failure for the current batch, never silently continue past it.
    """
    from openai import (
        RateLimitError,
        APIConnectionError,
        APITimeoutError,
        InternalServerError,
        AuthenticationError,
        BadRequestError,
        PermissionDeniedError,
        NotFoundError,
        UnprocessableEntityError,
        ConflictError,
    )

    NON_RETRYABLE = (
        AuthenticationError, BadRequestError, PermissionDeniedError,
        NotFoundError, UnprocessableEntityError, ConflictError,
    )

    client = _get_openai_client()
    last_exc: Exception | None = None

    for attempt in range(EMBED_MAX_RETRIES + 1):
        try:
            resp = client.embeddings.create(model=model, input=texts)
            vectors = [item.embedding for item in resp.data]
            if vectors and len(vectors[0]) != EMBEDDING_DIMS:
                # Config/model mismatch, not a transient failure — retrying
                # changes nothing, so this is raised as non-retryable below.
                raise ValueError(
                    f"Expected {EMBEDDING_DIMS}-dim vectors, got {len(vectors[0])}. "
                    f"Check EMBEDDING_DIMS in config.py matches the model output."
                )
            return vectors
        except (RateLimitError, APIConnectionError, APITimeoutError, InternalServerError) as exc:
            # Transient — worth retrying with backoff.
            last_exc = exc
            if attempt == EMBED_MAX_RETRIES:
                break
            wait = _retry_after_seconds(exc) or _backoff_delay(attempt)
            _log(f"  [WARN] OpenAI embed failed (attempt {attempt + 1}/{EMBED_MAX_RETRIES + 1}, transient): "
                 f"{type(exc).__name__}: {exc} — retrying in {wait:.1f}s")
            time.sleep(wait)
        except NON_RETRYABLE as exc:
            _log(f"  [ERROR] OpenAI embed failed with a NON-retryable error ({type(exc).__name__}): {exc} — failing immediately, no retry.")
            raise RuntimeError(f"OpenAI embedding failed permanently (non-retryable: {type(exc).__name__})") from exc
        except ValueError as exc:
            # Our own dim-mismatch check — a config bug, not transient.
            _log(f"  [ERROR] OpenAI embed failed with a NON-retryable error (config mismatch): {exc} — failing immediately, no retry.")
            raise RuntimeError("OpenAI embedding failed permanently (dimension mismatch — check EMBEDDING_DIMS/model config)") from exc

    raise RuntimeError(f"OpenAI embedding failed permanently after {EMBED_MAX_RETRIES + 1} attempts (transient errors exhausted retry budget)") from last_exc


# ── Per-system processing ────────────────────────────────────────────────────

class SystemEmbeddingError(Exception):
    """Raised when a curriculum_system's embedding run hits a permanent,
    unrecoverable failure (OpenAI or DB). Stops that system only — see
    generate_embeddings(), which catches this per system and continues."""


def _process_system(system: str, position: int = 0) -> int:
    """
    Embed every node in one curriculum_system that doesn't have an embedding
    yet. WITHIN a system, processing is always strictly sequential — one page
    of nodes, one OpenAI batch, one upsert, at a time, regardless of
    EMBED_SYSTEM_CONCURRENCY. Each successful batch is stored immediately
    (never accumulated in memory), and the page offset only advances after
    every batch on that page has been durably stored — a failed batch never
    silently advances past itself. This function itself has no knowledge of
    concurrency; generate_embeddings() decides whether multiple systems (i.e.
    multiple calls to this function) run at once. `position` only affects
    which row a system's progress bar renders on when several run in parallel.

    Restart safety: there is no separate checkpoint file. On every run this
    starts each system again from offset 0, but curriculum_embeddings.node_id
    is checked per page, so already-embedded nodes are cheaply skipped. This
    is intentionally simple over maximally efficient — see requirement to
    restart from DB state, not a fragile checkpoint file.
    """
    client = get_client()
    try:
        total_nodes, client = _count_nodes_for_system(client, system)
    except RuntimeError as exc:
        raise SystemEmbeddingError(f"[{system}] Could not get node count: {exc}") from exc
    _log(f"\n[{system}]")
    _log(f"  {total_nodes:,} nodes total")

    system_new = 0
    system_skipped = 0
    offset = 0

    with tqdm(total=total_nodes, desc=f"  {system[:28]:<28}", unit="nodes", position=position, leave=False) as pbar:
        while True:
            def _fetch_page(c, offset=offset):
                return (
                    c.table("curriculum_nodes")
                    .select(
                        "id, node_type, name, description, "
                        "grade_level_min, grade_level_max, "
                        "curriculum_system, metadata"
                    )
                    .eq("curriculum_system", system)
                    .range(offset, offset + NODE_PAGE_SIZE - 1)
                    .execute()
                )

            try:
                resp, client = _db_call(client, _fetch_page, f"[{system}] fetch node page @ offset {offset}")
            except RuntimeError as exc:
                raise SystemEmbeddingError(f"[{system}] Node page fetch permanently failed at offset {offset}: {exc}") from exc
            nodes = resp.data or []
            if not nodes:
                break

            pbar.update(len(nodes))

            node_ids = [n["id"] for n in nodes]
            try:
                done_ids, client = _already_embedded_ids(client, node_ids)
            except RuntimeError as exc:
                raise SystemEmbeddingError(f"[{system}] Existing-embeddings check permanently failed at offset {offset}: {exc}") from exc
            pending = [n for n in nodes if n["id"] not in done_ids]
            system_skipped += len(nodes) - len(pending)

            _log(f"  Fetched {len(nodes)} nodes | Already embedded: {len(nodes) - len(pending)} | Pending: {len(pending)}")

            if pending:
                num_batches = (len(pending) + OPENAI_EMBED_BATCH_SIZE - 1) // OPENAI_EMBED_BATCH_SIZE
                for batch_idx in range(num_batches):
                    start = batch_idx * OPENAI_EMBED_BATCH_SIZE
                    chunk = pending[start : start + OPENAI_EMBED_BATCH_SIZE]
                    texts = [_build_embedding_text(n) for n in chunk]

                    _log(f"  Embedding batch {batch_idx + 1}/{num_batches}: {len(chunk)}")

                    try:
                        vectors = _embed_texts(texts)
                    except RuntimeError as exc:
                        raise SystemEmbeddingError(
                            f"[{system}] OpenAI embedding permanently failed at page offset {offset}, "
                            f"batch {batch_idx + 1}/{num_batches}: {exc}"
                        ) from exc

                    records = [
                        {
                            "node_id": node["id"],
                            "embedding": vector,
                            "embedding_model": EMBEDDING_MODEL,
                            "content_hash": _content_hash(text),
                        }
                        for node, vector, text in zip(chunk, vectors, texts)
                    ]

                    # Store immediately, in EMBED_INSERT_BATCH-sized pieces —
                    # a failed upsert here raises (via _db_call) rather than
                    # being logged-and-ignored, so an embedding is never
                    # silently lost after being computed.
                    for i in range(0, len(records), EMBED_INSERT_BATCH):
                        insert_batch = records[i : i + EMBED_INSERT_BATCH]

                        def _upsert(c, insert_batch=insert_batch):
                            return c.table("curriculum_embeddings").upsert(
                                insert_batch, on_conflict="node_id",
                            ).execute()

                        try:
                            _, client = _db_call(client, _upsert, f"[{system}] upsert {len(insert_batch)} embeddings")
                        except RuntimeError as exc:
                            raise SystemEmbeddingError(
                                f"[{system}] Upsert permanently failed at page offset {offset}, "
                                f"batch {batch_idx + 1}/{num_batches}: {exc}"
                            ) from exc

                    _log(f"  Stored: {len(chunk)}")
                    system_new += len(chunk)
                    time.sleep(EMBED_BATCH_DELAY)

            # Only advance past this page once every pending batch on it has
            # been durably stored (or there was nothing pending to store).
            if len(nodes) < NODE_PAGE_SIZE:
                break
            offset += len(nodes)

    _log(f"  Progress: {system_new:,} new embeddings ({system_skipped:,} already existed)")
    return system_new


MAX_SYSTEM_CONCURRENCY = 6
# Hard safety ceiling regardless of what EMBED_SYSTEM_CONCURRENCY is set to.
# The production outage happened at concurrency=6 with the OLD (uncapped
# connection pool, reconnect-per-retry) code; those root causes are fixed
# now, but this ceiling exists so a typo/env-var mistake (e.g. "20") can't
# silently create far more concurrent DB connections than ever validated.


def _record_system_failure(system: str, exc: Exception, failed_systems: list[tuple[str, str]]) -> None:
    """Shared failure handling for both the sequential and concurrent paths —
    every system failure is reported the same way regardless of which path
    produced it, and appending to failed_systems (not raising further) is
    exactly what lets one system's failure NOT affect any other system."""
    _log(f"  [ERROR] {exc}")
    _log(f"  [ERROR] Stopping [{system}] — other systems are unaffected and continue "
         f"independently. Re-run later to retry; already-stored embeddings for "
         f"[{system}] are preserved and will be skipped.")
    failed_systems.append((system, str(exc)))


def generate_embeddings(curricula: list[str] | None = None) -> None:
    """
    Generate and store embeddings for curriculum_nodes that don't have them
    yet.

    Concurrency model: EMBED_SYSTEM_CONCURRENCY controls how many curriculum
    systems are processed AT ONCE (each one internally still strictly
    sequential — see _process_system). Default 1 = fully sequential, no
    thread pool involved at all. When set above 1, a ThreadPoolExecutor runs
    multiple systems in parallel; each system's failure is caught
    independently (via _record_system_failure) so one system stopping never
    skips or cancels another system's work — they are fully isolated.
    Capped at MAX_SYSTEM_CONCURRENCY regardless of the env var value.

    Args:
        curricula: Optional list of curriculum_system values to process.
                   None = process all systems discovered in DB.
    """
    print("\n=== Embedding Generation ===")
    print(f"Model: {EMBEDDING_MODEL}  |  Dims: {EMBEDDING_DIMS}")
    print(f"NODE_PAGE_SIZE={NODE_PAGE_SIZE}  OPENAI_EMBED_BATCH_SIZE={OPENAI_EMBED_BATCH_SIZE}  "
          f"EMBED_INSERT_BATCH={EMBED_INSERT_BATCH}  EMBED_BATCH_DELAY={EMBED_BATCH_DELAY}s  "
          f"EMBED_MAX_RETRIES={EMBED_MAX_RETRIES}")

    concurrency = max(1, min(SYSTEM_CONCURRENCY, MAX_SYSTEM_CONCURRENCY))
    if SYSTEM_CONCURRENCY > MAX_SYSTEM_CONCURRENCY:
        print(f"  [WARN] EMBED_SYSTEM_CONCURRENCY={SYSTEM_CONCURRENCY} exceeds the safety ceiling "
              f"({MAX_SYSTEM_CONCURRENCY}) — capping to {MAX_SYSTEM_CONCURRENCY}.")
    print(f"  Concurrency: {concurrency} system(s) at a time"
          + (" (sequential, no thread pool)" if concurrency == 1 else " (ThreadPoolExecutor)"))

    client = get_client()

    # Discover which systems to process — skip the discovery query entirely
    # when an explicit list is given, since it's an extra round-trip
    # (RPC, or a full table scan on fallback) the caller doesn't need to pay
    # for when they already know exactly which systems they want.
    if curricula:
        systems = curricula
    else:
        systems = _get_curriculum_systems(client)

    if not systems:
        print("No curriculum systems found. Nothing to do.")
        return

    print(f"  Systems to process ({len(systems)}): {', '.join(systems)}")

    grand_total = 0
    failed_systems: list[tuple[str, str]] = []

    if concurrency == 1:
        # Default path — identical behavior to before, no thread pool at all.
        for system in systems:
            try:
                grand_total += _process_system(system)
            except SystemEmbeddingError as exc:
                _record_system_failure(system, exc, failed_systems)
    else:
        with ThreadPoolExecutor(max_workers=concurrency) as pool:
            futures = {
                pool.submit(_process_system, system, i % concurrency): system
                for i, system in enumerate(systems)
            }
            for future in as_completed(futures):
                system = futures[future]
                try:
                    grand_total += future.result()
                except SystemEmbeddingError as exc:
                    _record_system_failure(system, exc, failed_systems)
                except Exception as exc:
                    # Any other unexpected exception from a worker thread —
                    # still reported explicitly per system, never swallowed,
                    # and still doesn't affect any other system's future.
                    _record_system_failure(system, RuntimeError(f"unexpected error: {exc}"), failed_systems)

    print(f"\n[OK] Embedding generation pass complete. {grand_total:,} new embeddings stored.")
    if failed_systems:
        print(f"\n[ATTENTION] {len(failed_systems)} system(s) hit a permanent failure and stopped early:")
        for system, reason in failed_systems:
            print(f"  - {system}: {reason}")
        print("  Re-run `python ingest/run_ingest.py --only embeddings` to retry — already-stored")
        print("  embeddings are untouched and will be skipped automatically.")
