"""
Central configuration for the RAG backend.
Reads from the main project .env (one level up) so you only maintain one file.
Add SUPABASE_SERVICE_ROLE_KEY and OPENROUTER_API_KEY to that file.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

_base = Path(__file__).parent          # backend/rag-pipeline/
_project_root = _base.parent.parent    # academi-align/ (backend/rag-pipeline -> backend -> academi-align)

# Load main project .env first (has VITE_SUPABASE_URL, new service-role + openrouter keys)
load_dotenv(_project_root / ".env", override=False)
# Allow a local rag-backend/.env to override specific vars (optional)
load_dotenv(_base / ".env", override=True)

# ── Supabase ──────────────────────────────────────────────────────────────────
# SUPABASE_URL falls back to VITE_SUPABASE_URL already in your .env
SUPABASE_URL: str = (
    os.getenv("SUPABASE_URL")
    or os.getenv("VITE_SUPABASE_URL", "")
)
SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# ── OpenRouter (embeddings) ───────────────────────────────────────────────────
# Free model: nvidia/llama-nemotron-embed-vl-1b-v2:free — outputs 2048 dims.
# DB schema uses vector(2048) after migration 20260712000001_update_embedding_dims_2048.sql
OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "nvidia/llama-nemotron-embed-vl-1b-v2:free")
EMBEDDING_DIMS: int = 2048  # Must match vector(2048) in curriculum_embeddings table

# ── Data paths ────────────────────────────────────────────────────────────────

NCERT_DATA_PATH: Path = Path(os.getenv(
    "NCERT_DATA_PATH",
    str(_base.parent / "data" / "Ncret")
))

US_CC_DATA_PATH: Path = Path(os.getenv(
    "US_CC_DATA_PATH",
    str(_base.parent / "data" / "Us" / "us_common_core_concepts_CLEAN.xlsx")
))

NGSS_DATA_PATH: Path = Path(os.getenv(
    "NGSS_DATA_PATH",
    str(_base.parent / "data" / "Us" / "ngss.xlsx")
))

# ── Batch sizes ───────────────────────────────────────────────────────────────
INSERT_BATCH_SIZE: int = int(os.getenv("INSERT_BATCH_SIZE", "50"))
# Free-tier OpenRouter rate limit is ~20 req/min — keep batch small to avoid 429s
EMBEDDING_BATCH_SIZE: int = int(os.getenv("EMBEDDING_BATCH_SIZE", "20"))

# ── Curriculum system identifiers (must be consistent across DB queries) ──────
CURRICULUM_NCERT = "ncert-cbse"
CURRICULUM_US_CC = "us-common-core"
CURRICULUM_NGSS = "ngss"

# ── Valid stream names for Class 11-12 ────────────────────────────────────────
NCERT_STREAMS = {"Arts", "Commerce", "Medical", "Non Medical"}


def validate_config(require_embeddings: bool = True) -> None:
    """Raise early if required env vars are missing.

    Args:
        require_embeddings: Set False for node-only ingestion runs (--no-embed)
                             so OPENROUTER_API_KEY isn't required just to insert rows.
    """
    missing = []
    if not SUPABASE_URL:
        missing.append("SUPABASE_URL (or VITE_SUPABASE_URL)")
    if not SUPABASE_SERVICE_ROLE_KEY:
        missing.append("SUPABASE_SERVICE_ROLE_KEY")
    if require_embeddings and not OPENROUTER_API_KEY:
        missing.append("OPENROUTER_API_KEY")
    if missing:
        raise EnvironmentError(
            f"Missing required environment variables: {', '.join(missing)}\n"
            f"Add them to the main academi-align/.env file."
        )
