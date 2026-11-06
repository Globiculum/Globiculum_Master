import { motion } from "framer-motion";
import { ArrowUpRight, BookOpen, FileQuestion, Info, Library, PlayCircle, type LucideIcon } from "lucide-react";
import type { LearningResource } from "@/hooks/useLearningResources";
import { SUBJECT_STATUS, type AlignmentLevel } from "@/lib/reportDesign";

/**
 * Building blocks of the Report Preview page. Every section is made of these,
 * so spacing, type and interaction states stay the same across the report.
 */

export function SectionHeader({ id, title, description, aside }: { id: string; title: string; description?: string; aside?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="max-w-2xl">
        <h2 id={`${id}-title`} className="font-heading text-xl font-semibold tracking-tight text-primary">
          {title}
        </h2>
        <BrandRule className="mt-1.5" />
        {description && <p className="mt-2 font-body text-[15px] leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {aside}
    </div>
  );
}

/** Teal bar and mint dot under a heading (from the earlier report design). */
export function BrandRule({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`} aria-hidden="true">
      <div className="h-0.5 w-10 rounded-full bg-secondary" />
      <div className="h-1.5 w-1.5 rounded-full bg-mint" />
    </div>
  );
}

/** A report section: scroll target for the section nav, labelled by its header. */
export function ReportSection({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="report-section scroll-mt-32">
      {children}
    </section>
  );
}

export function Panel({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-xl border border-border bg-card shadow-soft ${className}`}>{children}</div>;
}

export function StatusBadge({ level }: { level: AlignmentLevel }) {
  const s = SUBJECT_STATUS[level];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 font-heading text-xs font-medium ring-1 ring-inset ${s.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
      {s.label}
    </span>
  );
}

/** Horizontal progress bar that fills in on first render. */
export function ProgressBar({ value, barClass, label, height = "h-1.5" }: { value: number; barClass: string; label: string; height?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={`${height} w-full overflow-hidden rounded-full bg-muted`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <motion.div
        className={`h-full rounded-full ${barClass}`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(pct, 2)}%` }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

/** Link to an outside page: teal text, arrow on the right; underline on hover. */
export function ExternalTextLink({ href, children, className = "", title }: { href: string; children: React.ReactNode; className?: string; title?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className={`group inline-flex items-center gap-0.5 whitespace-nowrap font-heading text-xs font-medium text-secondary-contrast underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 ${className}`}
    >
      {children}
      <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-px group-hover:translate-x-px" aria-hidden="true" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

const RESOURCE_ICON: Record<LearningResource["resource_type"], LucideIcon> = {
  textbook: BookOpen,
  reference: Library,
  video: PlayCircle,
  practice: FileQuestion,
};
const RESOURCE_KIND: Record<LearningResource["resource_type"], string> = {
  textbook: "Textbook",
  reference: "Reference book",
  video: "Video lessons",
  practice: "Practice",
};

/**
 * A study resource as a whole-row link: type icon, title, provider and kind.
 * A book in parts links each part from the meta line instead.
 */
export function ResourceRow({ resource }: { resource: LearningResource }) {
  const Icon = RESOURCE_ICON[resource.resource_type];
  const title = resource.title.replace(/\s*\(free PDF\)\s*$/i, "");
  // A reference book links to its publisher's page, said so to set expectations (not a free copy).
  const provider = resource.resource_type === "reference" ? `${resource.provider} (publisher)` : resource.provider;
  const meta = `${RESOURCE_KIND[resource.resource_type]} · ${provider}${/free PDF/i.test(resource.title) ? " · Free PDF" : ""}`;
  const icon = (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-secondary/10 group-hover:text-secondary">
      <Icon className="h-4 w-4" aria-hidden="true" />
    </span>
  );

  if (resource.parts && resource.parts.length > 0) {
    return (
      <div className="flex items-start gap-3 rounded-lg px-2 py-2">
        {icon}
        <div className="min-w-0 flex-1">
          <p className="font-heading text-sm font-medium text-foreground">{title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{meta}</span>
            {resource.parts.map((part) => (
              <ExternalTextLink key={part.url} href={part.url}>{part.label}</ExternalTextLink>
            ))}
          </p>
        </div>
      </div>
    );
  }

  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40"
    >
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block font-heading text-sm font-medium text-foreground group-hover:text-secondary-contrast">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{meta}</span>
      </span>
      <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:-translate-y-px group-hover:translate-x-px group-hover:text-secondary" aria-hidden="true" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-2.5 rounded-lg border border-border bg-muted/40 px-3.5 py-2.5 font-body text-[14px] leading-snug text-foreground/80">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
