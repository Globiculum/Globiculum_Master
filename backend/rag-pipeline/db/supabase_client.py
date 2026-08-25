"""
Supabase client with service-role key (bypasses RLS for ingestion).
"""

import time

import httpx
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

# Shared retry budget for transient DB errors (statement timeouts, dropped
# connections) — used consistently across every DB helper in this module so
# none of them under-retries relative to the others. Sized for long
# unattended runs against a heavily-loaded DB (concurrent ingestion +
# multi-worker embedding generation have been observed to produce both
# Postgres 'statement timeout' (57014) and httpx 'Server disconnected'
# errors under sustained combined load).
_RETRY_BACKOFFS = [5, 15, 30, 60, 90, 120]

# CONNECTION-STORM FIX (post-incident):
# Every retry loop in this module used to call get_client() on EVERY failed
# attempt — "reconnect in case the connection itself is broken". Under
# cascading failures (6 concurrent embedding workers + the ingestion process,
# all retrying independently), this created a feedback loop: each failure
# spawned a BRAND NEW httpx client (uncapped connection pool, default up to
# 100 connections), which added more load to an already-struggling Nano-tier
# instance, which caused more failures, which spawned more new clients. This
# is the most likely actual cause of the production outage that followed —
# not just "too much data", but unbounded connection churn from our own retry
# logic. Two fixes below: (1) get_client() now caps its pool tightly since
# each caller only ever needs 1-2 connections at a time, (2) retry loops only
# reconnect after several consecutive failures, and reuse the same client
# otherwise — a Postgres statement timeout doesn't mean the connection itself
# is broken, so reconnecting on every single attempt was never necessary.
_RECONNECT_AFTER_N_FAILURES = 3


def get_client() -> Client:
    """Return a Supabase client using the service role key.

    Sets a 120-second PostgREST timeout (default is 5s) to handle bulk
    deletes, large vector-payload upserts, and wide table scans. Also caps
    the underlying httpx connection pool tightly (4 connections, 2 keepalive)
    — a single script/thread only ever needs 1-2 connections at a time, and
    httpx's uncapped default (100) is exactly what let retry-driven
    reconnects balloon into a connection storm under sustained failures.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise EnvironmentError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env"
        )
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    try:
        # path 1: supabase-py 2.x keeps a postgrest client with an httpx session
        postgrest = getattr(client, "postgrest", None) or getattr(client, "rest", None)
        if postgrest:
            session = getattr(postgrest, "session", None)
            if session is not None:
                session.timeout = httpx.Timeout(120.0)
                # Rebuild the transport with a tight, explicit connection pool
                # cap instead of httpx's uncapped default.
                session._transport = httpx.HTTPTransport(
                    limits=httpx.Limits(max_connections=4, max_keepalive_connections=2)
                )
    except Exception:
        pass

    return client


def _should_reconnect(exc: Exception, attempt: int) -> bool:
    """
    Decide whether a retry should spin up a fresh client, or just retry on
    the existing one. Statement timeouts (57014) don't mean the connection
    itself is broken — retrying on the same client is fine and doesn't add
    to connection churn. Only reconnect for errors that look connection-level
    (dropped/reset/disconnected), and even then, not on every attempt.
    """
    msg = str(exc).lower()
    looks_connection_level = any(
        s in msg for s in ("disconnected", "connection", "reset", "broken pipe")
    ) and "statement timeout" not in msg
    return looks_connection_level and attempt > 0 and attempt % _RECONNECT_AFTER_N_FAILURES == 0


def _insert_with_retry(client: Client, table: str, batch: list[dict], depth: int = 0) -> tuple[list[dict], Client]:
    """
    Insert one batch with retries + backoff. On repeated 'statement timeout'
    errors (Postgres code 57014) — observed under sustained heavy write load
    as curriculum_nodes' several indexes (including a GIN index on metadata)
    get progressively more expensive to maintain per-insert as the table
    grows past hundreds of thousands of rows — halve the batch and retry each
    half. Smaller batches mean shorter individual statements, which buys
    headroom against the timeout ceiling even if the underlying index-bloat
    issue isn't otherwise addressed. Recursion bottoms out at batch size 1.

    Reconnects sparingly — see _should_reconnect — to avoid the connection
    storm that repeated per-attempt reconnects caused previously.
    Returns (inserted_records, possibly-reconnected client).
    """
    last_exc: Exception | None = None
    for attempt, wait in enumerate([0] + _RETRY_BACKOFFS):
        if wait:
            time.sleep(wait)
        try:
            response = client.table(table).insert(batch).execute()
            return (response.data or []), client
        except Exception as exc:
            last_exc = exc
            if _should_reconnect(exc, attempt):
                client = get_client()
            is_timeout = "57014" in str(exc) or "statement timeout" in str(exc).lower()
            if is_timeout and len(batch) > 1 and depth < 6:
                mid = len(batch) // 2
                print(f"  [WARN] batch_insert into {table} timed out on {len(batch)} rows — splitting into {mid} + {len(batch) - mid} and retrying")
                left, client = _insert_with_retry(client, table, batch[:mid], depth + 1)
                right, client = _insert_with_retry(client, table, batch[mid:], depth + 1)
                return left + right, client
            print(f"  [WARN] batch_insert into {table} failed (attempt {attempt + 1}/{len(_RETRY_BACKOFFS) + 1}): {exc}")
    raise last_exc


def batch_insert(client: Client, table: str, records: list[dict], batch_size: int = 50) -> list[dict]:
    """
    Insert records in batches. Returns all inserted records (with IDs).
    Supabase's service role bypasses RLS so admin-level inserts work.

    Each batch retries on transient errors (statement timeouts, dropped
    connections) with backoff, and adaptively splits into smaller batches on
    repeated statement timeouts (see _insert_with_retry). Long unattended
    ingestion runs (multi-hour, hundreds of thousands of rows) have been
    observed to hit Postgres 'statement timeout' errors under sustained write
    load — without this, a single failure kills the run.
    """
    all_inserted: list[dict] = []
    total = len(records)
    for i in range(0, total, batch_size):
        batch = records[i : i + batch_size]
        inserted, client = _insert_with_retry(client, table, batch)
        all_inserted.extend(inserted)
    return all_inserted


def delete_edges_for_curriculum(client: Client, curriculum_system: str, page_size: int = 500) -> int:
    """
    Delete all curriculum_edges rows that reference a node belonging to
    curriculum_system (as source OR target), so the nodes can then be deleted
    without violating the curriculum_edges_source/target_node_id FK.

    Must be called BEFORE deleting curriculum_nodes for that system — the FK
    on curriculum_edges is not guaranteed to cascade on delete (schema drift
    between the live DB and local migrations has been observed).
    Returns the number of node ids the edge-delete was scoped to.
    """
    node_ids: list[str] = []
    offset = 0
    while True:
        for attempt, wait in enumerate([0] + _RETRY_BACKOFFS):
            if wait:
                time.sleep(wait)
            try:
                resp = (
                    client.table("curriculum_nodes")
                    .select("id")
                    .eq("curriculum_system", curriculum_system)
                    .range(offset, offset + 999)
                    .execute()
                )
                break
            except Exception as exc:
                if attempt == len(_RETRY_BACKOFFS):
                    raise
                if _should_reconnect(exc, attempt):
                    client = get_client()
                print(f"  [WARN] delete_edges_for_curriculum fetch failed (attempt {attempt + 1}): {exc}")
        rows = resp.data or []
        node_ids.extend(r["id"] for r in rows)
        if len(rows) < 1000:
            break
        offset += len(rows)

    for i in range(0, len(node_ids), page_size):
        batch = node_ids[i : i + page_size]
        for attempt, wait in enumerate([0] + _RETRY_BACKOFFS):
            if wait:
                time.sleep(wait)
            try:
                client.table("curriculum_edges").delete().in_("source_node_id", batch).execute()
                client.table("curriculum_edges").delete().in_("target_node_id", batch).execute()
                break
            except Exception as exc:
                if attempt == len(_RETRY_BACKOFFS):
                    raise
                if _should_reconnect(exc, attempt):
                    client = get_client()
                print(f"  [WARN] delete_edges_for_curriculum delete failed (attempt {attempt + 1}): {exc}")

    return len(node_ids)


def get_existing_source_ids(client: Client, curriculum_system: str) -> set[str]:
    """
    Fetch all metadata.source_id values already in curriculum_nodes
    for the given curriculum_system. Used to skip already-ingested rows.

    Selects only metadata->>source_id via a JSONB path expression rather than
    the whole metadata column — measured ~15x faster (0.57s vs 8.39s per 1000
    rows) since node metadata carries large fields (embedding_text,
    ancestor_descriptions, etc.) this function never needs.
    """
    existing: set[str] = set()
    page_size = 1000
    offset = 0
    while True:
        for attempt, wait in enumerate([0] + _RETRY_BACKOFFS):
            if wait:
                time.sleep(wait)
            try:
                response = (
                    client.table("curriculum_nodes")
                    .select("metadata->>source_id")
                    .eq("curriculum_system", curriculum_system)
                    .range(offset, offset + page_size - 1)
                    .execute()
                )
                break
            except Exception as exc:
                if attempt == len(_RETRY_BACKOFFS):
                    raise
                if _should_reconnect(exc, attempt):
                    client = get_client()
                print(f"  [WARN] get_existing_source_ids failed (attempt {attempt + 1}): {exc}")
        rows = response.data or []
        for row in rows:
            sid = row.get("source_id")
            if sid:
                existing.add(sid)
        if len(rows) < page_size:
            break
        offset += len(rows)
    return existing
