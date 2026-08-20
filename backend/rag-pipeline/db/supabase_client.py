"""
Supabase client with service-role key (bypasses RLS for ingestion).
"""

import time

from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY


def get_client() -> Client:
    """Return a Supabase client using the service role key.

    Sets a 120-second PostgREST timeout (default is 5s) to handle
    bulk deletes, large vector-payload upserts, and wide table scans.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise EnvironmentError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env"
        )
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    # Try to set a 120s timeout on the underlying PostgREST/httpx client.
    # The default 5s timeout is too short for bulk deletes and embedding upserts.
    try:
        import httpx
        # path 1: supabase-py 2.x keeps a postgrest client with an httpx session
        postgrest = getattr(client, "postgrest", None) or getattr(client, "rest", None)
        if postgrest:
            session = getattr(postgrest, "session", None)
            if session:
                session.timeout = httpx.Timeout(120.0)
    except Exception:
        pass

    return client


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
    Returns (inserted_records, possibly-reconnected client).
    """
    backoffs = [5, 15, 30, 60]
    last_exc: Exception | None = None
    for attempt, wait in enumerate([0] + backoffs):
        if wait:
            time.sleep(wait)
            client = get_client()  # reconnect in case the connection itself is broken
        try:
            response = client.table(table).insert(batch).execute()
            return (response.data or []), client
        except Exception as exc:
            last_exc = exc
            is_timeout = "57014" in str(exc) or "statement timeout" in str(exc).lower()
            if is_timeout and len(batch) > 1 and depth < 6:
                mid = len(batch) // 2
                print(f"  [WARN] batch_insert into {table} timed out on {len(batch)} rows — splitting into {mid} + {len(batch) - mid} and retrying")
                left, client = _insert_with_retry(client, table, batch[:mid], depth + 1)
                right, client = _insert_with_retry(client, table, batch[mid:], depth + 1)
                return left + right, client
            print(f"  [WARN] batch_insert into {table} failed (attempt {attempt + 1}/{len(backoffs) + 1}): {exc}")
    raise last_exc


def batch_insert(client: Client, table: str, records: list[dict], batch_size: int = 50) -> list[dict]:
    """
    Insert records in batches. Returns all inserted records (with IDs).
    Supabase's service role bypasses RLS so admin-level inserts work.

    Each batch retries on transient errors (statement timeouts, dropped
    connections) with backoff + reconnect, and adaptively splits into smaller
    batches on repeated statement timeouts (see _insert_with_retry). Long
    unattended ingestion runs (multi-hour, hundreds of thousands of rows)
    have been observed to hit Postgres 'statement timeout' errors under
    sustained write load — without this, a single failure kills the run.
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
        for attempt in range(3):
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
                if attempt == 2:
                    raise
                time.sleep([3, 10][attempt])
                client = get_client()
        rows = resp.data or []
        node_ids.extend(r["id"] for r in rows)
        if len(rows) < 1000:
            break
        offset += 1000

    for i in range(0, len(node_ids), page_size):
        batch = node_ids[i : i + page_size]
        for attempt in range(3):
            try:
                client.table("curriculum_edges").delete().in_("source_node_id", batch).execute()
                client.table("curriculum_edges").delete().in_("target_node_id", batch).execute()
                break
            except Exception as exc:
                if attempt == 2:
                    raise
                time.sleep([3, 10][attempt])
                client = get_client()

    return len(node_ids)


def get_existing_source_ids(client: Client, curriculum_system: str) -> set[str]:
    """
    Fetch all metadata.source_id values already in curriculum_nodes
    for the given curriculum_system. Used to skip already-ingested rows.
    """
    existing: set[str] = set()
    page_size = 1000
    offset = 0
    while True:
        for attempt in range(3):
            try:
                response = (
                    client.table("curriculum_nodes")
                    .select("metadata")
                    .eq("curriculum_system", curriculum_system)
                    .range(offset, offset + page_size - 1)
                    .execute()
                )
                break
            except Exception as exc:
                if attempt == 2:
                    raise
                time.sleep([3, 10][attempt])
                client = get_client()
        rows = response.data or []
        for row in rows:
            meta = row.get("metadata") or {}
            sid = meta.get("source_id")
            if sid:
                existing.add(sid)
        if len(rows) < page_size:
            break
        offset += page_size
    return existing
