# Frontend

React + Vite + TypeScript web application.

```
frontend/
├── src/
│   ├── pages/               Route-level page components
│   │   ├── Assessment.tsx   Multi-step form (student info → curriculum → goals)
│   │   ├── ReportPreview.tsx  Renders the AI-generated Transition Readiness Report
│   │   └── ...
│   ├── components/
│   │   ├── ui/              shadcn/ui component library
│   │   ├── assessment/      Assessment form step components
│   │   └── dashboard/       Dashboard components
│   ├── hooks/               Custom React hooks
│   ├── lib/                 Utility functions
│   │   ├── generateReportPDF.ts   html2canvas → jsPDF export
│   │   ├── gapExplanations.ts     Parent-friendly gap reason text
│   │   └── gradeBaselineTopics.ts  Grade baseline helpers
│   └── integrations/supabase/     Supabase JS client + type definitions
│
├── public/                  Static assets (favicon, OG image)
├── index.html               Vite HTML entry
├── vite.config.ts           Vite config (path alias @/ → src/)
├── tailwind.config.ts       Tailwind CSS config
├── tsconfig.json            TypeScript config
└── package.json             Dependencies and scripts
```

## Getting Started

```sh
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
```

> You can also run `npm run dev` from the **project root** — the root `package.json`
> delegates to `frontend/` automatically.

## Environment Variables

Create `frontend/.env`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
```

## Adding New Form Fields

1. Add the field to the form component in `src/pages/Assessment.tsx` (or the relevant step component in `src/components/assessment/`)
2. The field is included in `formData` which is sent as-is to the `analyze-curriculum` edge function
3. If the field should influence the AI analysis, add it to the prompt builder in `backend/supabase/functions/analyze-curriculum/index.ts`
4. **Optional fields require zero backend changes** — they flow through to the AI automatically

## Tech Stack

- React 18 + TypeScript
- Vite (bundler)
- Tailwind CSS + shadcn/ui (components)
- TanStack Query (data fetching)
- Supabase JS client (auth + edge function calls)
- html2canvas + jsPDF (PDF export)
- Recharts / D3-force (charts)
