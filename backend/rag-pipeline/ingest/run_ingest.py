"""
Master ingestion runner.

Usage:
    # Full ingestion (NCERT + US CC + embeddings):
    python ingest/run_ingest.py

    # Only NCERT:
    python ingest/run_ingest.py --only ncert

    # Only US Common Core:
    python ingest/run_ingest.py --only us_cc

    # Only generate embeddings (after nodes are already inserted):
    python ingest/run_ingest.py --only embeddings

    # Fresh re-ingest (WARNING: deletes existing data for that curriculum first):
    python ingest/run_ingest.py --fresh

    # Fresh for one curriculum only:
    python ingest/run_ingest.py --only ncert --fresh

    # Skip embedding generation (just insert nodes):
    python ingest/run_ingest.py --no-embed
"""

import argparse
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import validate_config


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Ingest NCERT and US Common Core data into Supabase."
    )
    parser.add_argument(
        "--only",
        choices=["ncert", "us_cc", "embeddings"],
        help="Run only one step instead of all three.",
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
        "--embed-only-curriculum",
        choices=["ncert-cbse", "us-common-core"],
        help="When generating embeddings, restrict to this curriculum only.",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("  AcademiAlign - RAG Data Ingestion Pipeline")
    print("=" * 60)

    # Validate config before doing anything
    try:
        validate_config()
    except EnvironmentError as e:
        print(f"\n[ERROR] {e}")
        sys.exit(1)

    start = time.time()

    run_ncert     = args.only in (None, "ncert")
    run_us_cc     = args.only in (None, "us_cc")
    run_embeddings = args.only in (None, "embeddings") and not args.no_embed

    # ── Step 1: NCERT ─────────────────────────────────────────────────────────
    if run_ncert:
        from ingest_ncert import ingest_ncert
        ingest_ncert(fresh=args.fresh)

    # ── Step 2: US Common Core ────────────────────────────────────────────────
    if run_us_cc:
        from ingest_us_cc import ingest_us_cc
        ingest_us_cc(fresh=args.fresh)

    # ── Step 3: Generate embeddings ───────────────────────────────────────────
    if run_embeddings:
        from generate_embeddings import generate_embeddings
        curricula = None
        if args.embed_only_curriculum:
            curricula = [args.embed_only_curriculum]
        generate_embeddings(curricula=curricula)

    elapsed = time.time() - start
    print(f"\n{'=' * 60}")
    print(f"  Pipeline finished in {elapsed:.1f}s")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
