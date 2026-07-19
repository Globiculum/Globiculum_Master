# Backend

All server-side code lives here.

```
backend/
├── supabase/           ← Supabase Edge Functions (Deno/TypeScript) + DB migrations
│   ├── functions/
│   │   ├── analyze-curriculum/   Main AI analysis endpoint
│   │   ├── alignment-engine/     Curriculum alignment logic
│   │   └── _shared/              Shared modules (validation, security, jobs)
│   ├── migrations/               PostgreSQL schema migrations
│   └── config.toml               Supabase project config
│
├── rag-pipeline/       ← Python scripts to ingest curriculum data into pgvector
│   ├── ingest/         Scripts: ingest_ncert.py, ingest_us_cc.py
│   ├── db/             Supabase DB helpers
│   ├── config.py       Reads environment variables
│   └── requirements.txt
│
└── data/               ← Raw curriculum source files (NCERT PDFs, US CC Excel)
```

## Supabase Edge Functions

```sh
# Run from this directory (backend/)
supabase functions deploy analyze-curriculum
supabase functions deploy alignment-engine

# Set secrets
supabase secrets set GEMINI_API_KEY=your_key
```

> The Supabase CLI looks for `supabase/` in the **current working directory**.
> Always run `supabase` commands from `backend/`.

## RAG Pipeline (Python)

```sh
cd rag-pipeline
pip install -r requirements.txt
cp .env.example .env        # fill in SUPABASE_URL, SERVICE_ROLE_KEY, OPENROUTER_API_KEY
python test_connection.py   # verify connectivity first
python ingest/ingest_ncert.py
python ingest/ingest_us_cc.py
```

## How the frontend calls the backend

There is **no FastAPI / REST server**. The frontend calls Supabase Edge Functions directly:

```typescript
// In frontend/src/ — how analyze-curriculum is called
const { data } = await supabase.functions.invoke("analyze-curriculum", {
  body: formData,
});
```

The Edge Function receives `formData` as a JSON body, validates it, runs RAG + Gemini AI, and returns the analysis JSON.
