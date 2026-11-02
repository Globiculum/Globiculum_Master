import { ArrowRight, Download, Loader2, Share2 } from "lucide-react";
import globiculumLogo from "@/assets/globiculum-logo.png";

interface Place {
  /** "United States" / "India" */
  country: string;
  /** "Colorado State Curriculum · Grade 8" */
  detail: string;
}

interface ReportHeroProps {
  studentName: string;
  from: Place;
  to: Place;
  details: { label: string; value: string }[];
  onDownload: () => void;
  onShare?: () => void;
  isSharing?: boolean;
}

function PlaceCard({ caption, place }: { caption: string; place: Place }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="font-heading text-xs font-medium uppercase tracking-wider text-white/60">{caption}</p>
      <p className="mt-0.5 font-heading text-base font-semibold">{place.country}</p>
      <p className="font-body text-[15px] text-white/80">{place.detail}</p>
    </div>
  );
}

/**
 * Report header on Deep Navy: whose report it is, the move it covers, and the
 * two things a parent does with it (share, download).
 */
export function ReportHero({ studentName, from, to, details, onDownload, onShare, isSharing }: ReportHeroProps) {
  return (
    <header className="relative overflow-hidden rounded-2xl bg-primary px-5 py-6 text-primary-foreground sm:px-8 sm:py-8">
      <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-secondary/25 blur-3xl no-print" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-violet/15 blur-3xl no-print" aria-hidden="true" />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <img src={globiculumLogo} alt="Globiculum" className="mb-4 h-7 w-auto brightness-0 invert" />
          <p className="font-heading text-sm font-medium text-mint">Curriculum Gap Analysis</p>
          <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight sm:text-3xl">{studentName}&rsquo;s transition report</h1>
        </div>
        <div className="flex gap-2 no-print">
          {onShare && (
            <button
              type="button"
              onClick={onShare}
              disabled={isSharing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-3.5 py-2 font-heading text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/60 disabled:opacity-60"
            >
              {isSharing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}
              Share
            </button>
          )}
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3.5 py-2 font-heading text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/60"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download PDF
          </button>
        </div>
      </div>

      {/* The move this report covers */}
      <div className="relative mt-6 grid grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <PlaceCard caption="Moving from" place={from} />
        <span className="flex h-9 w-9 items-center justify-center justify-self-center rounded-full bg-mint text-primary" aria-hidden="true">
          <ArrowRight className="h-4 w-4 rotate-90 sm:rotate-0" />
        </span>
        <PlaceCard caption="Moving to" place={to} />
      </div>

      {details.length > 0 && (
        <dl className="relative mt-5 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/10 pt-4">
          {details.map((d) => (
            <div key={d.label}>
              <dt className="font-heading text-xs font-medium text-white/60">{d.label}</dt>
              <dd className="font-body text-[15px] text-white">{d.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </header>
  );
}
