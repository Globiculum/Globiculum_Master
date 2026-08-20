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

# ── OpenAI (embeddings) ───────────────────────────────────────────────────────
# text-embedding-3-small: $0.02/1M tokens, 1536-dim vectors.
# DB schema uses vector(1536) after migration 20260819000000_update_embedding_dims_1536.sql
OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
EMBEDDING_DIMS: int = 1536  # Must match vector(1536) in curriculum_embeddings table

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

# ── Common Standards Project API ──────────────────────────────────────────────
# Free API for US state and national standards.
# Register at https://commonstandardsproject.com to get an API key.
CSP_API_KEY: str = os.getenv("CSP_API_KEY", "")
CSP_BASE_URL: str = os.getenv(
    "CSP_BASE_URL", "https://api.commonstandardsproject.com"
)
# Default jurisdictions to ingest when --jurisdiction is not specified.
# Use partial name matches (case-insensitive).
CSP_DEFAULT_JURISDICTIONS: list[str] = [
    "Common Core State Standards",
]

# ── Batch sizes ───────────────────────────────────────────────────────────────
INSERT_BATCH_SIZE: int = int(os.getenv("INSERT_BATCH_SIZE", "50"))
# OpenAI paid tier supports up to 2048 inputs per request; 100 is a safe batch size
EMBEDDING_BATCH_SIZE: int = int(os.getenv("EMBEDDING_BATCH_SIZE", "100"))

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
    if require_embeddings and not OPENAI_API_KEY:
        missing.append("OPENAI_API_KEY")
    if missing:
        raise EnvironmentError(
            f"Missing required environment variables: {', '.join(missing)}\n"
            f"Add them to the main academi-align/.env file."
        )
