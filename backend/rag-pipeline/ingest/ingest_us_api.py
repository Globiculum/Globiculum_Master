"""
US Standards API Ingestion — fetches directly from the Common Standards Project
API and inserts into curriculum_nodes + curriculum_edges.

Eliminates the Excel intermediate step. Supports:
  - Common Core State Standards (default)
  - Individual state standards (e.g., Texas, California)
  - NGSS (Next Generation Science Standards)
  - Any jurisdiction in the Common Standards Project database

API docs: https://commonstandardsproject.com/api

Data flow:
  API /jurisdictions            →  list of states/orgs
  API /jurisdictions/:id        →  list of standard sets (by subject + grade)
  API /standard_sets/:id        →  individual standards with descriptions
  normalize_standard()          →  curriculum_nodes schema
  batch_insert()                →  Supabase DB
  (then generate_embeddings.py handles embedding generation separately)

Deduplication:
  metadata.source_id = standard GUID from API
  Skip any node whose source_id already exists in DB.

Usage:
  # Default: ingest Common Core
  python ingest/run_ingest.py --only us_api

  # Ingest a specific state by name
  python ingest/run_ingest.py --only us_api --jurisdiction "Texas"

  # Ingest multiple jurisdictions
  python ingest/run_ingest.py --only us_api --jurisdiction "Common Core" --jurisdiction "California"

  # List all available jurisdictions
  python ingest/run_ingest.py --only us_api --list-jurisdictions

  # Filter by grade range
  python ingest/run_ingest.py --only us_api --grades 6-8

  # Fresh re-ingest (deletes existing API-sourced nodes first)
  python ingest/run_ingest.py --only us_api --fresh
"""

import json
import sys
import time
from pathlib import Path
from typing import Optional

import requests
from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import (
    CSP_API_KEY,
    CSP_BASE_URL,
    CSP_DEFAULT_JURISDICTIONS,
    CURRICULUM_US_CC,
    INSERT_BATCH_SIZE,
)
from db.supabase_client import get_client, batch_insert, get_existing_source_ids, delete_edges_for_curriculum


# ── Constants ─────────────────────────────────────────────────────────────────

RATE_LIMIT_DELAY = 0.35       # seconds between API requests (~3 req/sec)
MAX_RETRIES = 3
RETRY_BACKOFF = [2, 10, 30]   # seconds for each retry attempt

# Standards at depth 0 are usually broad domain headers (e.g. "Number and
# Operations").  They add noise to gap matching because their descriptions are
# too generic. We ingest depth >= MIN_DEPTH only; depth-0 context is still
# captured via ancestorDescriptions on deeper standards.
MIN_DEPTH = 1

# Checkpoint file — saves progress so interrupted runs can resume
_CHECKPOINT_DIR = Path(__file__).parent.parent / "data" / "checkpoints"
_CHECKPOINT_FILE = _CHECKPOINT_DIR / "us_api_progress.json"


# ── API Client ────────────────────────────────────────────────────────────────

class CSPClient:
    """Thin wrapper around the Common Standards Project API with rate limiting."""

    def __init__(self, api_key: str, base_url: str = CSP_BASE_URL):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.session.params = {"api-key": self.api_key}
        self.session.headers.update({
            "Accept": "application/json",
            "User-Agent": "AcademiAlign-RAG-Pipeline/1.0",
        })

    def _get(self, path: str) -> dict:
        """GET with retries and rate limiting."""
        url = f"{self.base_url}{path}"
        for attempt in range(MAX_RETRIES):
            try:
                time.sleep(RATE_LIMIT_DELAY)
                resp = self.session.get(url, timeout=30)
                resp.raise_for_status()
                return resp.json()
            except requests.HTTPError as exc:
                status = exc.response.status_code if exc.response else 0
                if status == 429 and attempt < MAX_RETRIES - 1:
                    wait = RETRY_BACKOFF[attempt]
                    print(f"  [RATE LIMIT] Waiting {wait}s before retry...")
                    time.sleep(wait)
                    continue
                raise
            except (requests.ConnectionError, requests.Timeout) as exc:
                if attempt < MAX_RETRIES - 1:
                    wait = RETRY_BACKOFF[attempt]
                    print(f"  [NETWORK ERROR] {exc}. Retrying in {wait}s...")
                    time.sleep(wait)
                    continue
                raise

    def get_jurisdictions(self) -> list[dict]:
        """Fetch all jurisdictions (states + organizations)."""
        data = self._get("/api/v1/jurisdictions")
        return data.get("data", [])

    def get_jurisdiction(self, jurisdiction_id: str) -> dict:
        """Fetch a single jurisdiction with its standard sets."""
        data = self._get(f"/api/v1/jurisdictions/{jurisdiction_id}")
        return data.get("data", {})

    def get_standard_set(self, standard_set_id: str) -> dict:
        """Fetch all standards within a standard set."""
        data = self._get(f"/api/v1/standard_sets/{standard_set_id}")
        return data.get("data", {})


# ── Grade Parsing ─────────────────────────────────────────────────────────────

def _parse_grade(val: str) -> int:
    """Convert education level strings to integer grade levels."""
    s = str(val).strip().upper()
    if s in ("K", "KG", "PK", "PRE-K", "KINDERGARTEN"):
        return 0
    try:
        return int(s.lstrip("0") or "0")
    except ValueError:
        return 0


def _parse_grade_range(levels: list[str]) -> tuple[int, int]:
    """Parse educationLevels array to (min_grade, max_grade)."""
    if not levels:
        return (0, 12)
    grades = [_parse_grade(lv) for lv in levels]
    return (min(grades), max(grades))


# ── Curriculum System Mapping ─────────────────────────────────────────────────

# Well-known jurisdiction titles → curriculum_system identifiers
# NOTE: these must match the CSP API's exact jurisdiction titles (verified live —
# the API does NOT use "Common Core State Standards Initiative", just "...Standards").
_KNOWN_SYSTEMS = {
    "common core state standards": CURRICULUM_US_CC,
    "next generation science standards": "ngss",
}


def _get_curriculum_system(jurisdiction_title: str) -> str:
    """
    Map a jurisdiction title to a curriculum_system identifier.
    Known national standards get their canonical names.
    State-specific standards get 'us-state-<slug>' format.
    """
    key = jurisdiction_title.strip().lower()
    if key in _KNOWN_SYSTEMS:
        return _KNOWN_SYSTEMS[key]
    # State / org — generate a slug
    slug = key.replace(" ", "-").replace(".", "")
    return f"us-state-{slug}"


# ── Embedding Text Builder ───────────────────────────────────────────────────

def _build_embedding_text(standard: dict, standard_set: dict) -> str:
    """
    Build rich semantic text for embedding generation.
    Includes subject, grade, standard code, ancestor context, and description.
    """
    parts = []

    subject = standard_set.get("subject") or ""
    if subject:
        parts.append(subject)

    title = standard_set.get("title") or ""
    if title:
        parts.append(title)

    notation = standard.get("statementNotation") or ""
    if notation:
        parts.append(notation)

    # Ancestor descriptions provide domain/cluster context
    ancestors = standard.get("ancestorDescriptions") or []
    for anc in ancestors:
        if anc:
            parts.append(str(anc))

    description = standard.get("description") or ""
    if description:
        parts.append(description)

    return " - ".join(parts) if parts else ""


# ── Standard Normalization ────────────────────────────────────────────────────

def normalize_standard(
    standard: dict,
    standard_set: dict,
    curriculum_system: str,
) -> dict:
    """
    Convert a single API standard to a curriculum_nodes row dict.
    Works for ALL jurisdictions — handles optional fields gracefully.
    """
    description = (standard.get("description") or "").strip()
    if not description:
        return {}  # skip standards with no description

    name = description[:500] if len(description) > 500 else description

    edu_levels = standard.get("educationLevels") or standard_set.get("educationLevels") or []
    grade_min, grade_max = _parse_grade_range(edu_levels)

    return {
        "node_type": "standard",
        "name": name,
        "description": description,
        "grade_level_min": grade_min,
        "grade_level_max": grade_max,
        "curriculum_system": curriculum_system,
        "metadata": {
            "source_id": standard["id"],
            "source_type": "standard",
            "subject": standard_set.get("subject") or None,
            "standard_code": standard.get("statementNotation") or None,
            "statement_label": standard.get("statementLabel") or None,
            "list_id": standard.get("listId") or None,
            "depth_level": str(standard.get("depth", 0)),
            "position": standard.get("position"),
            "ancestor_descriptions": standard.get("ancestorDescriptions") or [],
            "jurisdiction": (standard_set.get("jurisdiction") or {}).get("title") or None,
            "standard_set_id": standard_set.get("id") or None,
            "standard_set_title": standard_set.get("title") or None,
            "document_title": (standard_set.get("document") or {}).get("title") or None,
            "document_year": (standard_set.get("document") or {}).get("valid") or None,
            "asn_identifier": standard.get("asnIdentifier") or None,
            # Pre-built embedding text for reuse during embedding generation
            "embedding_text": _build_embedding_text(standard, standard_set),
        },
    }


# ── Checkpoint Management ────────────────────────────────────────────────────

def _load_checkpoint() -> set[str]:
    """Load set of already-processed standard_set IDs from checkpoint."""
    if _CHECKPOINT_FILE.exists():
        try:
            data = json.loads(_CHECKPOINT_FILE.read_text())
            return set(data.get("completed_sets", []))
        except (json.JSONDecodeError, KeyError):
            pass
    return set()


def _save_checkpoint(completed_sets: set[str]) -> None:
    """Persist completed standard_set IDs to checkpoint file."""
    _CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)
    _CHECKPOINT_FILE.write_text(json.dumps({
        "completed_sets": list(completed_sets),
        "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }, indent=2))


def _clear_checkpoint() -> None:
    """Remove checkpoint file (used with --fresh)."""
    if _CHECKPOINT_FILE.exists():
        _CHECKPOINT_FILE.unlink()


# ── Jurisdiction Discovery ───────────────────────────────────────────────────

def _find_jurisdictions(
    client: CSPClient,
    names: list[str],
) -> list[dict]:
    """
    Fetch all jurisdictions and filter by name.
    Strategy: exact match first; only fall back to substring match for
    names that returned no exact hit.  This prevents 'California' from
    matching 'California Cadet Corps', while still letting 'Common Core'
    match 'Common Core State Standards Initiative'.
    """
    all_jurisdictions = client.get_jurisdictions()
    if not names:
        return all_jurisdictions

    names_lower = [n.strip().lower() for n in names]
    matched = []
    matched_ids: set[str] = set()
    exact_hit: set[int] = set()   # indices of names that got an exact match

    # Pass 1: exact matches
    for j in all_jurisdictions:
        title_lower = j.get("title", "").lower()
        for i, name in enumerate(names_lower):
            if title_lower == name:
                if j["id"] not in matched_ids:
                    matched.append(j)
                    matched_ids.add(j["id"])
                exact_hit.add(i)
                break

    # Pass 2: partial match only for search terms that had no exact hit
    fuzzy_names = [names_lower[i] for i in range(len(names_lower)) if i not in exact_hit]
    if fuzzy_names:
        for j in all_jurisdictions:
            if j["id"] in matched_ids:
                continue
            title_lower = j.get("title", "").lower()
            for name in fuzzy_names:
                if name in title_lower or title_lower in name:
                    matched.append(j)
                    matched_ids.add(j["id"])
                    break

    return matched


def list_all_jurisdictions(client: CSPClient) -> None:
    """Print all available jurisdictions and their IDs."""
    jurisdictions = client.get_jurisdictions()
    print(f"\nAvailable jurisdictions ({len(jurisdictions)}):\n")
    for j in sorted(jurisdictions, key=lambda x: x.get("title", "")):
        print(f"  {j['title']:<55} ID: {j['id']}")
    print()


# ── Core Processing ──────────────────────────────────────────────────────────

def _process_standard_set(
    api_client: CSPClient,
    set_info: dict,
    curriculum_system: str,
    existing_ids: set[str],
    grade_filter: Optional[tuple[int, int]],
) -> list[dict]:
    """
    Fetch and normalize all standards in a single standard set.
    Returns list of curriculum_nodes dicts ready for insertion.
    """
    set_id = set_info["id"]
    set_title = set_info.get("title", "")
    set_subject = set_info.get("subject", "")

    # Grade filter: skip standard sets outside the requested grade range
    if grade_filter:
        set_levels = set_info.get("educationLevels", [])
        if set_levels:
            set_min, set_max = _parse_grade_range(set_levels)
            filt_min, filt_max = grade_filter
            if set_max < filt_min or set_min > filt_max:
                return []  # no grade overlap

    try:
        data = api_client.get_standard_set(set_id)
    except Exception as exc:
        print(f"  [ERROR] Failed to fetch standard set {set_id} ({set_title}): {exc}")
        return []

    # The API returns standards as a dict keyed by GUID, or sometimes as a list
    standards_raw = data.get("standards", {})
    if isinstance(standards_raw, dict):
        standards = list(standards_raw.values())
    elif isinstance(standards_raw, list):
        standards = standards_raw
    else:
        return []

    # Build standard_set context (reused by normalize_standard)
    standard_set_ctx = {
        "id": set_id,
        "title": set_title,
        "subject": set_subject,
        "educationLevels": set_info.get("educationLevels", []),
        "jurisdiction": data.get("jurisdiction", {}),
        "document": data.get("document", {}),
    }

    nodes = []
    for std in standards:
        if not std.get("id"):
            continue

        # Skip depth-0 domain headers (too generic for gap matching)
        depth = std.get("depth", 0)
        if isinstance(depth, (int, float)) and depth < MIN_DEPTH:
            continue

        # Dedup: skip if already in DB
        if std["id"] in existing_ids:
            continue

        node = normalize_standard(std, standard_set_ctx, curriculum_system)
        if node:
            nodes.append(node)

    return nodes


def _build_depth_edges(inserted_nodes: list[dict]) -> list[dict]:
    """
    Build parent-child edges based on the standard set hierarchy.
    Standards with lower depth are parents of standards with higher depth
    within the same standard_set_id, ordered by position.
    """
    # Group nodes by standard_set_id
    by_set: dict[str, list[dict]] = {}
    for node in inserted_nodes:
        meta = node.get("metadata") or {}
        ss_id = meta.get("standard_set_id")
        if ss_id:
            by_set.setdefault(ss_id, []).append(node)

    edges = []
    for ss_id, nodes in by_set.items():
        # Sort by position
        nodes.sort(key=lambda n: (n.get("metadata") or {}).get("position") or 0)

        # Use a stack to track parents at each depth level
        # stack[depth] = node_id of the most recent node at that depth
        stack: dict[int, str] = {}

        for node in nodes:
            meta = node.get("metadata") or {}
            depth = int(meta.get("depth_level", 0))
            node_id = node["id"]

            # Find parent: the most recent node at depth - 1
            parent_depth = depth - 1
            if parent_depth >= 0 and parent_depth in stack:
                parent_id = stack[parent_depth]
                if parent_id != node_id:
                    edges.append({
                        "source_node_id": parent_id,
                        "target_node_id": node_id,
                        "relationship_type": "contains",
                        "weight": 1.0,
                        "metadata": {
                            "subject": meta.get("subject"),
                            "standard_set_id": ss_id,
                        },
                    })

            # Update stack at this depth
            stack[depth] = node_id
            # Clear deeper levels (new branch)
            for d in list(stack.keys()):
                if d > depth:
                    del stack[d]

    return edges


# ── Batched Delete ───────────────────────────────────────────────────────────

def _delete_nodes_batched(db_client, curriculum_system: str, batch_size: int = 500) -> None:
    """
    Delete curriculum_nodes for a curriculum_system in batches.
    Uses larger batches (500) and pauses between them to avoid Supabase
    HTTP/2 connection resets (WinError 10054) from rapid sequential requests.
    """
    # Clear referencing edges first — the curriculum_edges FK is not guaranteed
    # to cascade on delete on the live DB (schema drift observed vs. local
    # migrations), so deleting nodes first can fail with a FK violation.
    delete_edges_for_curriculum(db_client, curriculum_system)

    total = 0
    while True:
        # Fetch a batch of IDs — retry on transient connection errors
        for attempt in range(3):
            try:
                resp = (
                    db_client.table("curriculum_nodes")
                    .select("id")
                    .eq("curriculum_system", curriculum_system)
                    .limit(batch_size)
                    .execute()
                )
                break
            except Exception as exc:
                if attempt == 2:
                    raise
                print(f"  [WARN] Fetch error (attempt {attempt + 1}), retrying in 3s: {exc}")
                time.sleep(3)
                db_client = get_client()  # reconnect

        rows = resp.data or []
        if not rows:
            break

        ids = [r["id"] for r in rows]

        # Delete — retry on transient connection errors
        for attempt in range(3):
            try:
                db_client.table("curriculum_nodes").delete().in_("id", ids).execute()
                break
            except Exception as exc:
                if attempt == 2:
                    raise
                print(f"  [WARN] Delete error (attempt {attempt + 1}), retrying in 3s: {exc}")
                time.sleep(3)
                db_client = get_client()  # reconnect

        total += len(ids)
        print(f"  Deleted {total} nodes...")
        time.sleep(0.5)  # brief pause to avoid overwhelming the connection pool

    print(f"  Done — {total} nodes deleted for '{curriculum_system}'.")


# ── Main Ingest Function ─────────────────────────────────────────────────────

def ingest_us_api(
    fresh: bool = False,
    jurisdictions: Optional[list[str]] = None,
    grade_range: Optional[str] = None,
    list_only: bool = False,
) -> None:
    """
    Fetch US standards from Common Standards Project API and ingest into DB.

    Args:
        fresh: Delete existing nodes for the target curriculum(s) before inserting.
        jurisdictions: List of jurisdiction names to fetch (partial match).
                       Defaults to CSP_DEFAULT_JURISDICTIONS from config.
        grade_range: Optional grade filter like "6-8" or "K-5".
        list_only: If True, just print available jurisdictions and exit.
    """
    print("\n" + "=" * 60)
    print("  US Standards API Ingestion (Common Standards Project)")
    print("=" * 60)

    if not CSP_API_KEY:
        print("[ERROR] CSP_API_KEY not set. Add it to your .env file.")
        print("  Get your API key at: https://commonstandardsproject.com")
        return

    api = CSPClient(CSP_API_KEY)

    # ── List mode ──────────────────────────────────────────────────────────
    if list_only:
        list_all_jurisdictions(api)
        return

    # ── Parse grade filter ─────────────────────────────────────────────────
    grade_filter = None
    if grade_range:
        parts = grade_range.replace(" ", "").split("-")
        if len(parts) == 2:
            grade_filter = (_parse_grade(parts[0]), _parse_grade(parts[1]))
            print(f"Grade filter: {grade_filter[0]} to {grade_filter[1]}")
        else:
            print(f"[WARN] Invalid grade range '{grade_range}', ignoring. Use format: 6-8")

    # ── Find target jurisdictions ──────────────────────────────────────────
    # jurisdictions=None  → use CSP_DEFAULT_JURISDICTIONS
    # jurisdictions=[]    → fetch ALL jurisdictions from API
    # jurisdictions=[...] → fetch only those listed
    if jurisdictions is None:
        target_names = CSP_DEFAULT_JURISDICTIONS
    else:
        target_names = jurisdictions  # [] means all

    if target_names:
        print(f"\nSearching for jurisdictions: {target_names}")
    else:
        print("\nFetching ALL jurisdictions from CSP API...")

    matched = _find_jurisdictions(api, target_names)
    if not matched:
        print("[ERROR] No matching jurisdictions found.")
        print("  Run with --list-jurisdictions to see all available options.")
        return

    print(f"  Found {len(matched)} jurisdiction(s):")
    for j in matched:
        print(f"    - {j['title']} ({j['id'][:12]}...)")

    db_client = get_client()

    # ── Fresh mode ─────────────────────────────────────────────────────────
    if fresh:
        for j in matched:
            sys_id = _get_curriculum_system(j["title"])
            print(f"\n[FRESH MODE] Deleting existing nodes for '{sys_id}'...")
            _delete_nodes_batched(db_client, sys_id)
        _clear_checkpoint()

    # ── Load checkpoint ────────────────────────────────────────────────────
    completed_sets = _load_checkpoint() if not fresh else set()
    if completed_sets:
        print(f"\n  Resuming from checkpoint ({len(completed_sets)} sets already done)")

    # ── Process each jurisdiction ──────────────────────────────────────────
    total_inserted = 0
    total_edges = 0
    total_skipped = 0

    for j_info in matched:
        j_id = j_info["id"]
        j_title = j_info["title"]
        curriculum_system = _get_curriculum_system(j_title)

        print(f"\n{'─' * 50}")
        print(f"Jurisdiction: {j_title}")
        print(f"  curriculum_system: {curriculum_system}")

        # Fetch jurisdiction details (list of standard sets)
        try:
            j_data = api.get_jurisdiction(j_id)
        except Exception as exc:
            print(f"  [ERROR] Failed to fetch jurisdiction: {exc}")
            continue

        # CSP API returns standardSets as a dict keyed by set ID, not a list
        standard_sets_raw = j_data.get("standardSets", {})
        if isinstance(standard_sets_raw, dict):
            standard_sets = list(standard_sets_raw.values())
        elif isinstance(standard_sets_raw, list):
            standard_sets = standard_sets_raw
        else:
            standard_sets = []
        print(f"  Standard sets found: {len(standard_sets)}")

        # Fetch existing source_ids for dedup
        print(f"  Fetching existing source IDs for '{curriculum_system}'...")
        existing = get_existing_source_ids(db_client, curriculum_system)
        print(f"  Found {len(existing)} existing nodes — will skip these.")

        # Process each standard set
        sets_to_process = [
            s for s in standard_sets
            if s.get("id") and s["id"] not in completed_sets
        ]
        print(f"  Standard sets to process: {len(sets_to_process)} (skipping {len(standard_sets) - len(sets_to_process)} already done)")

        for ss_info in tqdm(sets_to_process, desc=f"  {j_title[:30]}"):
            ss_id = ss_info["id"]

            nodes = _process_standard_set(
                api, ss_info, curriculum_system, existing, grade_filter,
            )

            if nodes:
                inserted = batch_insert(db_client, "curriculum_nodes", nodes, INSERT_BATCH_SIZE)
                total_inserted += len(inserted)

                # Add newly inserted IDs to existing set to prevent duplicates
                # across standard sets within the same jurisdiction
                for rec in inserted:
                    sid = (rec.get("metadata") or {}).get("source_id")
                    if sid:
                        existing.add(sid)

                # Build and insert edges for this batch of new nodes
                edges = _build_depth_edges(inserted)
                if edges:
                    try:
                        batch_insert(db_client, "curriculum_edges", edges, INSERT_BATCH_SIZE)
                        total_edges += len(edges)
                    except Exception as exc:
                        print(f"\n  [WARN] Some edges failed: {exc}")
            else:
                total_skipped += 1

            # Save checkpoint after each successful standard set
            completed_sets.add(ss_id)
            _save_checkpoint(completed_sets)

    # ── Summary ────────────────────────────────────────────────────────────
    _clear_checkpoint()  # all done — remove checkpoint

    print(f"\n{'=' * 60}")
    print(f"  US Standards API Ingestion Complete")
    print(f"{'=' * 60}")
    print(f"  Jurisdictions processed: {len(matched)}")
    print(f"  Standard nodes inserted: {total_inserted}")
    print(f"  Edges created:           {total_edges}")
    print(f"  Sets skipped (empty):    {total_skipped}")
    print(f"\n  Run embedding generation next:")
    print(f"    python ingest/run_ingest.py --only embeddings")
