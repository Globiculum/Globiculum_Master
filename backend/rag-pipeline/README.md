# AcademiAlign — RAG Backend

Python data ingestion pipeline for loading NCERT, US Common Core, and NGSS curriculum data into Supabase, then generating vector embeddings for semantic gap analysis.

---

## Folder structure

```
rag-backend/
├── requirements.txt          ← Python dependencies
├── .env.example              ← Copy to .env and fill in secrets
├── config.py                 ← Paths + settings loaded from .env
├── README.md                 ← This file
├── db/
│   └── supabase_client.py    ← Supabase connection + batch insert helpers
└── ingest/
    ├── ingest_ncert.py       ← NCERT Excel → curriculum_nodes + edges
    ├── ingest_us_cc.py       ← US Common Core Excel → curriculum_nodes + edges
    ├── ingest_ngss.py        ← NGSS Excel → curriculum_nodes (no edges — flat standards)
    ├── generate_embeddings.py← OpenAI embeddings → curriculum_embeddings
    └── run_ingest.py         ← Master runner (use this to run everything)
```

---

## Setup

### 1. Prerequisites

- Python 3.10 or higher
- Supabase project with migrations applied (pgvector extension enabled)
- OpenAI API key (for embeddings)

### 2. Create virtual environment

```powershell
cd "d:\Sushma\Arna Intelligence\academi-align\rag-backend"
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure environment

```powershell
copy .env.example .env
```

Edit `.env` and fill in:

| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Supabase dashboard → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Project Settings → API → service_role key |
| `OPENAI_API_KEY` | platform.openai.com → API Keys |

---

## Running the ingestion

Run from inside the `rag-backend/` folder with the venv active.

### Full pipeline (recommended first run)

```powershell
python ingest/run_ingest.py
```

This runs in order:
1. Ingest all NCERT files → `curriculum_nodes` + `curriculum_edges`
2. Ingest US Common Core file → `curriculum_nodes` + `curriculum_edges`
3. Ingest NGSS file → `curriculum_nodes` (no edges — flat standards, no hierarchy in source data)
4. Generate embeddings for all new nodes → `curriculum_embeddings`

### Partial runs

```powershell
# Only NCERT
python ingest/run_ingest.py --only ncert

# Only US Common Core
python ingest/run_ingest.py --only us_cc

# Only NGSS
python ingest/run_ingest.py --only ngss

# Only generate embeddings (after nodes are already inserted)
python ingest/run_ingest.py --only embeddings

# Skip embedding generation (just insert nodes)
python ingest/run_ingest.py --no-embed
```

### Re-ingesting (fresh run)

> ⚠️ This DELETES existing nodes for the target curriculum before re-inserting.

```powershell
# Re-ingest everything
python ingest/run_ingest.py --fresh

# Re-ingest only NCERT
python ingest/run_ingest.py --only ncert --fresh
```

---

## Data model

### How NCERT maps to `curriculum_nodes`

Each NCERT Excel row = 1 **chapter**  
Each subtopic line (newline-separated) = 1 **subtopic**

```
Chapter row  →  node_type='topic',            curriculum_system='ncert-cbse'
Subtopic     →  node_type='learning_outcome',  curriculum_system='ncert-cbse'
Edge         →  relationship_type='contains'   (chapter → subtopic)
```

`metadata.source_id` format:
- Chapter:  `NCERT-MATH-5-CH1`
- Subtopic: `NCERT-MATH-5-CH1-sub-0`, `NCERT-MATH-5-CH1-sub-1`, …

### How US Common Core maps to `curriculum_nodes`

Each CC Excel row = 1 **standard**

```
Standard row  →  node_type='standard',  curriculum_system='us-common-core'
Edge          →  relationship_type='contains'  (parent_standard → child)
```

`metadata.source_id` = `concept_id` column (e.g. `CC-ebfed4de`)

### How NGSS maps to `curriculum_nodes`

Each NGSS Excel row = 1 **performance expectation** (standard)

```
Standard row  →  node_type='standard',  curriculum_system='ngss'
No edges — the source file has no parent/cluster hierarchy column
(unlike US CC's "Parent Standard"), so NGSS nodes are flat.
```

`metadata.source_id` = `"NGSS-" + Standard Code` (e.g. `NGSS-K-2-ETS1-1`)

Kept as a **separate `curriculum_system`** from `us-common-core` (not merged into
it) because NGSS is a distinct standards framework covering Science only, while
US Common Core covers Math + ELA. A student's "target: US" curriculum may need
gap analysis against either or both depending on subject.

Field gaps vs US Common Core (see full comparison in project memory / PR notes):
- No `concept_id`, `embedding_text`, `Parent Standard`, `Cluster`, or
  `Alt Standard Code` columns in the source file — `source_id` and
  `embedding_text` are generated during ingestion/embedding instead.
- `Sub-Topic`, `Depth Level`, `Difficulty Score`, `Estimated Hours`,
  `Prerequisites`, `Has Prerequisites` columns exist in the sheet but are
  100% empty for all 208 rows — read defensively but store as `None`/`False`.
- `Domain Code` + `Domain Name` are actually richer than US CC's single
  `Domain` column (split into a short code and full name).
- No DB schema changes were needed — `curriculum_nodes.metadata` is `jsonb`,
  so all NGSS-specific fields fit in the existing table.

### Embeddings

Stored in `curriculum_embeddings` table:
- 2048-dimensional vectors (matches `vector(2048)` column, see
  `20260712000001_update_embedding_dims_2048.sql`)
- Model: `nvidia/llama-nemotron-embed-vl-1b-v2:free` via OpenRouter (free tier)
- NCERT chapters:  `"NCERT Class 6 — Mathematics — Chapter: Fractions — …"`
- NCERT subtopics: `"NCERT Class 6 — Mathematics — Chapter: Fractions — Topic: Unit fractions"`
- US CC standards: uses the pre-built `embedding_text` column from the dataset
- NGSS standards:  `"NGSS - Grade - Domain - Standard: <code> - Description - Clarification"`

---

## Expected counts (approximate, as of last ingestion run)

| Curriculum | Node count | Notes |
|---|---|---|
| NCERT (Classes 1–12) | 9,244 | 1,245 chapters (`topic`) + 7,999 subtopics (`learning_outcome`) |
| US Common Core (Math + ELA) | 1,385 | all `standard` nodes |
| NGSS (Science, K–12) | 208 | all `standard` nodes, flat (no edges) |
| **Total** | **10,837** | |

Embedding cost: free tier (OpenRouter Nemotron embeddings), rate-limited to
~20 req/min — see `EMBEDDING_BATCH_SIZE` in `config.py`.

---

## Troubleshooting

**`EnvironmentError: Missing required environment variables`**  
→ Check `.env` file exists and has correct values.

**`Could not read <file>: ...`**  
→ Ensure Excel files are not open in Excel. Close them and retry.

**`Embedding batch failed`**  
→ OpenAI rate limit hit. The script auto-waits 10s and continues. If it keeps failing, reduce `EMBEDDING_BATCH_SIZE` in `.env`.

**Insert errors (`duplicate key`)**  
→ The deduplication logic uses `metadata.source_id`. If you see duplicates, run with `--fresh` for that curriculum.
