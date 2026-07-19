# Academi-Align

AI-powered curriculum transition readiness platform.
Helps students moving between education systems (US Common Core ? CBSE/NCERT, IB, IGCSE) understand exactly what gaps to bridge.

---

## Repository Structure

```
academi-align/
+-- frontend/      React + Vite + TypeScript UI
¦                  ? see frontend/README.md
¦
+-- backend/
¦   +-- supabase/  Supabase Edge Functions (Deno) + DB migrations
¦   +-- rag-pipeline/  Python RAG ingestion scripts
¦   +-- data/      Raw curriculum source files
¦                  ? see backend/README.md
¦
+-- package.json   Root convenience scripts (delegates to frontend/)
+-- .gitignore
```

---

## Quick Start

### Run the frontend (UI team)
```sh
npm run dev        # runs from root — delegates to frontend/
# OR
cd frontend && npm install && npm run dev
```

### Deploy backend (backend team)
```sh
cd backend
supabase functions deploy
supabase secrets set GEMINI_API_KEY=your_key
```

### Ingest curriculum data (RAG pipeline)
```sh
cd backend/rag-pipeline
pip install -r requirements.txt
python ingest/ingest_ncert.py
```

---

## How It Works

1. User fills in the assessment form (grade, curriculum, target goal)
2. Frontend calls the `analyze-curriculum` Supabase Edge Function directly
3. Edge function runs a RAG search against curriculum embeddings in pgvector
4. Gemini 2.5 Flash generates the Transition Readiness Report using RAG context
5. Report is displayed and can be downloaded as PDF

> **No FastAPI / REST server.** The entire backend is serverless (Supabase Edge Functions + PostgreSQL).
