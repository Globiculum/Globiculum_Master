"""Master ingestion runner.

Usage:
    # NCERT only (from Excel — Indian curriculum):
    python ingest/run_ingest.py --only ncert

    # ALL US jurisdictions from CSP API (all 50 states + CCSS + NGSS):
    python ingest/run_ingest.py --only us_api --all-jurisdictions --fresh

    # Specific jurisdictions only:
    python ingest/run_ingest.py --only us_api --jurisdiction "Texas" --jurisdiction "California"

    # Common Core + NGSS from API (not Excel):
    python ingest/run_ingest.py --only us_api --jurisdiction "Common Core State Standards Initiative" --jurisdiction "Next Generation Science Standards"

    # List all available jurisdictions:
    python ingest/run_ingest.py --only us_api --list-jurisdictions

    # Generate embeddings only (after nodes are already inserted):
    python ingest/run_ingest.py --only embeddings

    # Fresh re-ingest (WARNING: deletes existing data for that curriculum first):
    python ingest/run_ingest.py --only ncert --fresh

    # Skip embedding generation (just insert nodes):
    python ingest/run_ingest.py --no-embed
"""

import argparse
import sys
import time
from pathlib import Path

# Force UTF-8 stdout/stderr. On Windows, redirecting output to a file (e.g.
# `> log.txt` for a long background run) makes Python fall back to the
# console codepage (cp1252), which can't encode box-drawing characters like
# '─' used in progress separators elsewhere in this pipeline — crashing the
# whole run before it does any work. errors='replace' keeps it non-fatal even
# if some other unencodable character shows up later.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import validate_config


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Ingest NCERT and US standards data into Supabase."
    )
    parser.add_argument(
        "--only",
        choices=["ncert", "us_cc", "ngss", "us_api", "embeddings"],
        help="Run only one step instead of all.",
    )
    parser.add_argument(
        "--fresh",
        action="store_true",
        help="Delete existing nodes for the target curriculum(s) before inserting.",
    )
    parser.add_argument(
        "--no-embed",
        action="store_true",
        help="Skip embedding generation after node insertion.",
    )
    parser.add_argument(
        "--embed-curricula",
        action="append",
        metavar="SYSTEM",
        help="When generating embeddings, restrict to this curriculum_system. "
             "Can be repeated. E.g. --embed-curricula us-state-california "
             "--embed-curricula us-state-texas",
    )
    parser.add_argument(
        "--jurisdiction",
        action="append",
        help="(us_api only) Jurisdiction name to fetch. Can be repeated.",
    )
    parser.add_argument(
        "--grades",
        type=str,
        help="(us_api only) Grade range filter, e.g. '6-8' or 'K-5'.",
    )
    parser.add_argument(
        "--list-jurisdictions",
        action="store_true",
        help="(us_api only) List all available jurisdictions and exit.",
    )
    parser.add_argument(
        "--all-jurisdictions",
        action="store_true",
        help="(us_api only) Fetch ALL jurisdictions from the CSP API (all 50 states + CCSS + NGSS).",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("  AcademiAlign - RAG Data Ingestion Pipeline")
    print("=" * 60)

    # Validate config before doing anything
    will_run_embeddings = args.only in (None, "embeddings") and not args.no_embed
    try:
        validate_config(require_embeddings=will_run_embeddings)
    except EnvironmentError as e:
        print(f"\n[ERROR] {e}")
        sys.exit(1)

    start = time.time()

    run_ncert     = args.only in (None, "ncert")
    run_us_cc     = args.only in (None, "us_cc")
    run_ngss      = args.only in (None, "ngss")
    run_us_api    = args.only == "us_api"
    run_embeddings = args.only in (None, "embeddings") and not args.no_embed

    # ── Step 1: NCERT ─────────────────────────────────────────────────────────
    if run_ncert:
        from ingest_ncert import ingest_ncert
        ingest_ncert(fresh=args.fresh)

    # ── Step 2: US Common Core ────────────────────────────────────────────────
    if run_us_cc:
        from ingest_us_cc import ingest_us_cc
        ingest_us_cc(fresh=args.fresh)

    # ── Step 3: NGSS (US Science) ──────────────────────────────────────────────
    if run_ngss:
        from ingest_ngss import ingest_ngss
        ingest_ngss(fresh=args.fresh)

    # ── Step 3b: US Standards via API (replaces Excel for US data) ────────────
    if run_us_api:
        from ingest_us_api import ingest_us_api
        # --all-jurisdictions passes empty list [] → fetches every jurisdiction from API
        jurisdictions_arg = [] if args.all_jurisdictions else args.jurisdiction
        ingest_us_api(
            fresh=args.fresh,
            jurisdictions=jurisdictions_arg,
            grade_range=args.grades,
            list_only=args.list_jurisdictions,
        )

    # ── Step 4: Generate embeddings ───────────────────────────────────────────
    if run_embeddings:
        from generate_embeddings import generate_embeddings
        generate_embeddings(curricula=args.embed_curricula or None)

    elapsed = time.time() - start
    print(f"\n{'=' * 60}")
    print(f"  Pipeline finished in {elapsed:.1f}s")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
