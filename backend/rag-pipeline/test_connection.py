"""
Quick connectivity test — run this BEFORE the full ingestion.
Checks: Supabase connection, service role key, OpenRouter embedding API.

Usage:
    cd rag-backend
    python test_connection.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from config import (
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    EMBEDDING_MODEL,
    EMBEDDING_DIMS,
)

PASS = "  [PASS]"
FAIL = "  [FAIL]"


def test_supabase() -> bool:
    print("\n-- Test 1: Supabase connection ------------------------------------")
    if not SUPABASE_URL:
        print(f"{FAIL} SUPABASE_URL is empty. Add VITE_SUPABASE_URL to .env")
        return False
    if not SUPABASE_SERVICE_ROLE_KEY or "your-service-role" in SUPABASE_SERVICE_ROLE_KEY:
        print(f"{FAIL} SUPABASE_SERVICE_ROLE_KEY is not set.")
        print("       Get it: Supabase Dashboard → Project Settings → API → service_role")
        return False

    try:
        from supabase import create_client
        client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        # Simple query — counts rows in curriculum_nodes (0 is fine, just tests auth)
        resp = client.table("curriculum_nodes").select("id", count="exact").limit(1).execute()
        count = resp.count if resp.count is not None else len(resp.data or [])
        print(f"{PASS} Connected to Supabase. curriculum_nodes rows: {count}")
        return True
    except Exception as e:
        print(f"{FAIL} Supabase error: {e}")
        return False


def test_openrouter() -> bool:
    print("\n-- Test 2: OpenRouter embedding API ------------------------------")
    if not OPENROUTER_API_KEY or "your-openrouter" in OPENROUTER_API_KEY:
        print(f"{FAIL} OPENROUTER_API_KEY is not set. Get it: https://openrouter.ai/keys")
        return False

    try:
        import json, requests
        test_text = "NCERT Class 8 Mathematics - Rational Numbers - understanding number line"
        resp = requests.post(
            f"{OPENROUTER_BASE_URL}/embeddings",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://github.com/academi-align",
                "X-Title": "AcademiAlign RAG Ingestion",
            },
            json={"model": EMBEDDING_MODEL, "input": [test_text], "encoding_format": "float"},
            timeout=60,
        )
        resp.raise_for_status()
        data = json.loads(resp.text.strip())
        vec = data["data"][0]["embedding"]
        dims = len(vec)
        if dims != EMBEDDING_DIMS:
            print(f"{FAIL} Wrong dimensions: got {dims}, expected {EMBEDDING_DIMS}")
            print(f"       Make sure EMBEDDING_MODEL={EMBEDDING_MODEL} in config")
            return False
        print(f"{PASS} OpenRouter embedding OK. Model: {EMBEDDING_MODEL}, Dims: {dims}")
        return True
    except Exception as e:
        print(f"{FAIL} OpenRouter error: {e}")
        return False


def test_migration() -> bool:
    print("\n-- Test 3: DB migration check -------------------------------------")
    try:
        from supabase import create_client
        client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        # Check that curriculum_embeddings table exists and has the right column
        resp = client.table("curriculum_embeddings").select("id").limit(1).execute()
        print(f"{PASS} curriculum_embeddings table exists.")

        # Check if the enhanced search function exists
        resp2 = client.rpc("search_curriculum_semantic", {
            "query_embedding": [0.0] * EMBEDDING_DIMS,
            "match_threshold": 0.99,
            "match_count": 1
        }).execute()
        print(f"{PASS} search_curriculum_semantic function is deployed.")
        return True
    except Exception as e:
        err = str(e)
        if "search_curriculum_semantic" in err or "Could not find" in err:
            print(f"{FAIL} Migration not applied yet.")
            print("       Apply it: Supabase Dashboard → SQL Editor → paste migration file")
        else:
            print(f"{FAIL} DB check error: {e}")
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("  AcademiAlign RAG Backend — Connection Tests")
    print("=" * 60)

    results = {
        "supabase":   test_supabase(),
        "openrouter": test_openrouter(),
        "migration":  test_migration() if SUPABASE_SERVICE_ROLE_KEY and "your-service-role" not in SUPABASE_SERVICE_ROLE_KEY else False,
    }

    print("\n" + "=" * 60)
    all_pass = all(results.values())
    if all_pass:
        print("  All tests passed. Ready to run ingestion.")
        print("  Next: python ingest/run_ingest.py --no-embed")
    else:
        failed = [k for k, v in results.items() if not v]
        print(f"  Failed: {', '.join(failed)}")
        print("  Fix the issues above before running ingestion.")
    print("=" * 60)
    sys.exit(0 if all_pass else 1)
