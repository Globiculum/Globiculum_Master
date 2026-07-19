# AcademiAlign — RAG Backend

Python data ingestion pipeline for loading NCERT and US Common Core curriculum data into Supabase, then generating vector embeddings for semantic gap analysis.

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
3. Generate embeddings for all new nodes → `curriculum_embeddings`

### Partial runs

```powershell
# Only NCERT
python ingest/run_ingest.py --only ncert

# Only US Common Core
python ingest/run_ingest.py --only us_cc

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

### Embeddings

Stored in `curriculum_embeddings` table:
- 1536-dimensional vectors (matches `vector(1536)` column)
- Model: `text-embedding-3-small` by default
- NCERT chapters:  `"NCERT Class 6 — Mathematics — Chapter: Fractions — …"`
- NCERT subtopics: `"NCERT Class 6 — Mathematics — Chapter: Fractions — Topic: Unit fractions"`
- US CC standards: uses the pre-built `embedding_text` column from the dataset

---

## Expected counts (approximate)

| Curriculum | Chapters/Standards | Subtopics | Total nodes |
|---|---|---|---|
| NCERT (Classes 1–12) | ~600 | ~6,000 | ~6,600 |
| US Common Core (Math + ELA) | ~3,500 | — | ~3,500 |
| **Total** | | | **~10,100** |

Embedding cost (text-embedding-3-small): **< $0.05** for the full corpus.

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
