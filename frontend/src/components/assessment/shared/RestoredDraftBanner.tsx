import { History } from "lucide-react";

interface RestoredDraftBannerProps {
  onStartOver: () => void;
}

// Shown above the form when its answers were restored after a refresh (see
// lib/assessmentDraft.ts), until the user moves to another step.
const RestoredDraftBanner = ({ onStartOver }: RestoredDraftBannerProps) => (
  <div
    role="status"
    className="mb-4 flex flex-col gap-2 rounded-xl border border-secondary/25 bg-secondary/5 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between"
  >
    <div className="flex items-center gap-2 text-sm">
      <History className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
      <span className="text-muted-foreground">
        <span className="font-semibold text-foreground">Welcome back.</span> We kept your answers from before.
      </span>
    </div>
    <button
      type="button"
      onClick={onStartOver}
      className="shrink-0 self-start text-sm font-semibold text-secondary transition-colors hover:text-secondary/80 sm:ml-4 sm:self-auto"
    >
      Start over
    </button>
  </div>
);

export default RestoredDraftBanner;
