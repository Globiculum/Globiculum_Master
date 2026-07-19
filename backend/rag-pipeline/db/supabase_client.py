"""
Supabase client with service-role key (bypasses RLS for ingestion).
"""

from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY


def get_client() -> Client:
    """Return a Supabase client using the service role key."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise EnvironmentError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env"
        )
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def batch_insert(client: Client, table: str, records: list[dict], batch_size: int = 50) -> list[dict]:
    """
    Insert records in batches. Returns all inserted records (with IDs).
    Supabase's service role bypasses RLS so admin-level inserts work.
    """
    all_inserted: list[dict] = []
    total = len(records)
    for i in range(0, total, batch_size):
        batch = records[i : i + batch_size]
        response = client.table(table).insert(batch).execute()
        if response.data:
            all_inserted.extend(response.data)
    return all_inserted


def get_existing_source_ids(client: Client, curriculum_system: str) -> set[str]:
    """
    Fetch all metadata.source_id values already in curriculum_nodes
    for the given curriculum_system. Used to skip already-ingested rows.
    """
    existing: set[str] = set()
    page_size = 1000
    offset = 0
    while True:
        response = (
            client.table("curriculum_nodes")
            .select("metadata")
            .eq("curriculum_system", curriculum_system)
            .range(offset, offset + page_size - 1)
            .execute()
        )
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
