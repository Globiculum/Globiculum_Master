import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { REPORT_SECTIONS } from "@/lib/reportDesign";

/**
 * Sticky in-page navigation under the site header (h-16). Highlights the
 * section being read and scrolls to a section on click; on phones the links
 * scroll sideways. Download stays one tap away on long reports.
 */
export function ReportSectionNav({ onDownload, sections = REPORT_SECTIONS, className = "" }: { onDownload: () => void; sections?: readonly { id: string; label: string }[]; className?: string }) {
  const [active, setActive] = useState<string>(sections[0]?.id ?? "");

  useEffect(() => {
    const targets = sections.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => !!el);
    if (targets.length === 0) return;
    // A section counts as current once its top passes just below the nav.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-140px 0px -55% 0px" }
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [sections]);

  const go = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    setActive(id);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav aria-label="Report sections" className={`no-print sticky top-16 z-40 -mx-4 border-b border-border bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/75 ${className}`}>
      <div className="flex items-center gap-3">
        <ul className="-mb-px flex flex-1 gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {sections.map((s) => {
            const isActive = active === s.id;
            return (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    go(s.id);
                  }}
                  aria-current={isActive ? "true" : undefined}
                  className={`relative block whitespace-nowrap px-3 py-3 font-heading text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary/40 ${
                    isActive ? "font-semibold text-primary" : "font-medium text-muted-foreground hover:text-primary"
                  }`}
                >
                  {s.label}
                  <span
                    className={`absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-secondary transition-opacity duration-200 ${isActive ? "opacity-100" : "opacity-0"}`}
                    aria-hidden="true"
                  />
                </a>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={onDownload}
          className="hidden shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 font-heading text-sm font-medium text-primary transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 sm:inline-flex"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Download PDF
        </button>
      </div>
    </nav>
  );
}
