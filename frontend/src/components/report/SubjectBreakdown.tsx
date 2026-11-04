import { useMemo, useState } from "react";
import { ChevronDown, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  languageStartNote as resourceStartNote,
  levelledLanguage,
  type LanguageFamiliarity,
  type useLearningResources,
} from "@/hooks/useLearningResources";
import { displayGapReason, languageStartNote, subjectGapItems, topicOf, type GapItem } from "@/lib/subjectGaps";
import { getGapReason } from "@/lib/gapExplanations";
import { subjectPercent, type ReportSubject } from "@/lib/reportContent";
import { alignBadgeClass, SUBJECT_COVERAGE, SUBJECT_PACE, SUBJECT_STATUS } from "@/lib/reportDesign";
import { ExternalTextLink, ResourceRow } from "./ReportPrimitives";

type Learning = ReturnType<typeof useLearningResources>;

interface SubjectBreakdownProps {
  subjects: ReportSubject[];
  criticalGaps: GapItem[];
  /** The class the student enters; earlier-class topics are tagged as foundations. */
  entryGrade?: number;
  electives: string[];
  learning: Learning;
  /** formData.languageProficiencies: { Hindi: "fluent", ... } */
  languageProficiencies?: Record<string, string>;
}

const UNASSESSED = "Assessment unavailable";
const isUnassessed = (s: ReportSubject) => s.keyGaps.some((g) => typeof g !== "string" && g.topic === UNASSESSED);

/** Reasons that only restate "nothing related" are said once per group, not per topic. */
const GENERIC_NEW = /^(Nothing closely related|No closely related|.* has no (prior|comparable)|.* does not include)/i;

interface TopicRow {
  topic: string;
  url?: string;
  detail?: string;
  classTag?: string;
}

function TopicGroup({ title, caption, rows, startIndex, limit }: { title: string; caption: string; rows: TopicRow[]; startIndex: number; limit: number }) {
  if (rows.length === 0) return null;
  const hiddenFrom = Math.max(0, limit - startIndex);
  return (
    <div className={hiddenFrom === 0 ? "hidden print-show" : undefined}>
      <p className="font-heading text-sm font-semibold text-secondary-contrast">
        {title} <span className="font-medium text-muted-foreground">({rows.length})</span>
      </p>
      <p className="mt-0.5 font-body text-[14px] text-muted-foreground">{caption}</p>
      <ul className="mt-2 divide-y divide-border rounded-lg border border-border bg-background">
        {rows.map((r, i) => (
          <li key={`${r.topic}-${i}`} className={`flex items-start gap-3 px-3 py-2.5 ${i >= hiddenFrom ? "hidden print-show" : ""}`}>
            <div className="min-w-0 flex-1">
              <p className="font-heading text-sm font-medium text-foreground">
                {r.topic}
                {r.classTag && (
                  <span className="ml-2 whitespace-nowrap rounded-md bg-muted px-1.5 py-0.5 align-middle font-heading text-[11px] font-medium text-muted-foreground">
                    {r.classTag}
                  </span>
                )}
              </p>
              {r.detail && <p className="mt-0.5 font-body text-[14px] leading-snug text-muted-foreground">{r.detail}</p>}
            </div>
            {r.url && <ExternalTextLink href={r.url} className="mt-0.5 shrink-0">Open chapter</ExternalTextLink>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SubjectDetail({ subject, criticalGaps, entryGrade, learning, familiarity }: {
  subject: ReportSubject;
  criticalGaps: GapItem[];
  entryGrade?: number;
  learning: Learning;
  familiarity?: LanguageFamiliarity;
}) {
  const [showAll, setShowAll] = useState(false);
  const status = SUBJECT_STATUS[subject.alignmentLevel];
  const items = subjectGapItems(subject.subject, subject.keyGaps, criticalGaps).filter((g) => topicOf(g) !== UNASSESSED);
  const startNote = languageStartNote(subject.subject, criticalGaps);
  const unassessedReason = subject.keyGaps.find((g) => typeof g !== "string" && g.topic === UNASSESSED);

  const toRow = (g: GapItem, hideGeneric: boolean): TopicRow => {
    const grade = typeof g === "string" ? undefined : g.grade;
    const reason = typeof g !== "string" && g.reason ? displayGapReason(g.reason) : getGapReason(topicOf(g), subject.subject);
    return {
      topic: topicOf(g),
      url: typeof g === "string" ? undefined : g.resourceUrl,
      detail: hideGeneric && GENERIC_NEW.test(reason) ? undefined : reason,
      classTag: grade && entryGrade && grade < entryGrade ? `Class ${grade} foundation` : undefined,
    };
  };
  const graded = items.length > 0 && items.every((g) => typeof g !== "string" && g.severity);
  const fresh = graded ? items.filter((g) => typeof g !== "string" && g.severity === "CRITICAL").map((g) => toRow(g, true)) : [];
  const partial = graded ? items.filter((g) => typeof g !== "string" && g.severity !== "CRITICAL").map((g) => toRow(g, false)) : [];
  const ungraded = graded ? [] : items.map((g) => toRow(g, false));
  const total = items.length;
  const limit = showAll ? total : 6;

  const pct = subjectPercent(subject);
  const isLanguage = !!levelledLanguage(subject.subject) && !!entryGrade;
  const resources = isLanguage ? [] : learning.forSubject(subject.subject, 4, subject.textbooks);
  const languageGroups = isLanguage ? learning.forLanguage(subject.subject, familiarity, 3, subject.textbooks) : [];

  return (
    <div className="grid grid-cols-1 gap-6 border-t border-border px-4 pb-5 pt-4 sm:px-5 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-3">
        <div>
          <p className="font-heading text-sm font-semibold text-secondary-contrast">What&rsquo;s missing</p>
          {unassessedReason && typeof unassessedReason !== "string" ? (
            <p className="mt-1 font-body text-[15px] text-foreground/85">{unassessedReason.reason}</p>
          ) : (
            <p className="mt-1 font-body text-[15px] leading-relaxed text-foreground/85">
              {subject.topicsCovered} of {subject.totalTopics} topics are already covered. {status.meaning}
              {subject.totalTopics > 0 && pct >= 90 && " The topics match, but the Indian board may go deeper, so practise with past board papers."}
            </p>
          )}
        </div>

        {startNote && (
          <p className="rounded-lg border border-border bg-muted/40 px-3.5 py-2.5 font-body text-[15px] leading-snug text-foreground/85">
            <span className="font-heading text-sm font-semibold text-secondary-contrast">Where to start: </span>
            {startNote}
          </p>
        )}

        <TopicGroup title="New to your child" caption="Nothing related appears in their current coursework." rows={fresh} startIndex={0} limit={limit} />
        <TopicGroup title="Partly covered" caption="Your child has studied something related, shown under each topic; these topics go further." rows={partial} startIndex={fresh.length} limit={limit} />
        <TopicGroup title="Topics to cover" caption="Topics in the new curriculum that need attention." rows={ungraded} startIndex={0} limit={limit} />

        {total === 0 && !unassessedReason && <p className="font-body text-[15px] text-muted-foreground">No gaps found in this subject.</p>}
        {total > 6 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="font-heading text-sm font-medium text-secondary-contrast underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40"
          >
            {showAll ? "Show fewer topics" : `Show all ${total} topics`}
          </button>
        )}
      </div>

      <div className="lg:col-span-2">
        <p className="font-heading text-sm font-semibold text-secondary-contrast">Where to study</p>
        {isLanguage ? (
          <div className="mt-1 space-y-3">
            <p className="font-body text-[14px] leading-snug text-muted-foreground">{resourceStartNote(subject.subject, entryGrade!, familiarity)}</p>
            {languageGroups.map((g) => (
              <div key={g.heading}>
                <p className="px-2 font-heading text-xs font-medium uppercase tracking-wider text-muted-foreground">{g.heading}</p>
                <div className="mt-1">{g.items.map((r) => <ResourceRow key={r.url} resource={r} />)}</div>
              </div>
            ))}
          </div>
        ) : resources.length > 0 ? (
          <div className="mt-1 -mx-2">{resources.map((r) => <ResourceRow key={r.url} resource={r} />)}</div>
        ) : (
          <p className="mt-1 font-body text-[15px] text-muted-foreground">No study resources listed yet for this subject.</p>
        )}
      </div>
    </div>
  );
}

const isFamiliarity = (v: unknown): v is LanguageFamiliarity => v === "beginner" || v === "intermediate" || v === "fluent";

/**
 * One card per subject, in the earlier report's card style and order:
 * teal left edge, then "% Align", coverage and pace badges. Opening a card
 * shows the missing topics with links to the chapters, beside where to study.
 * Details stay in the page when closed (hidden), so the PDF always includes them.
 */
export function SubjectBreakdown({ subjects, criticalGaps, entryGrade, electives, learning, languageProficiencies }: SubjectBreakdownProps) {
  // Already in card order (orderSubjectsByNeed in lib/reportContent.ts).
  const ordered = useMemo(() => subjects.filter((s) => s.totalTopics > 0 || s.keyGaps.length > 0), [subjects]);
  // Every card starts closed.
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const allOpen = open.size === ordered.length;
  const toggle = (name: string, isOpen: boolean) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (isOpen) next.add(name);
      else next.delete(name);
      return next;
    });

  return (
    <div>
      <div className="mb-2 flex justify-end no-print">
        <button
          type="button"
          onClick={() => setOpen(allOpen ? new Set() : new Set(ordered.map((s) => s.subject)))}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-heading text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40"
        >
          {allOpen ? <ChevronsDownUp className="h-4 w-4" aria-hidden="true" /> : <ChevronsUpDown className="h-4 w-4" aria-hidden="true" />}
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>

      <div className="space-y-3">
        {ordered.map((subject) => {
          const isOpen = open.has(subject.subject);
          const pct = subjectPercent(subject);
          const unassessed = isUnassessed(subject);
          const coverage = SUBJECT_COVERAGE[subject.alignmentLevel];
          const pace = SUBJECT_PACE[subject.alignmentLevel];
          const picked = Object.entries(languageProficiencies ?? {}).find(([lang]) => lang.toLowerCase() === subject.subject.toLowerCase())?.[1];
          const pill = "whitespace-nowrap rounded-full px-2.5 py-0.5 font-heading text-xs font-semibold";
          return (
            <Collapsible
              key={subject.subject}
              open={isOpen}
              onOpenChange={(o) => toggle(subject.subject, o)}
              className="overflow-hidden rounded-lg border-l-4 border-secondary bg-muted/50"
            >
              <CollapsibleTrigger className="group flex w-full flex-col gap-2.5 p-4 text-left transition-colors hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:outline-none sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
                  <h3 className="font-heading text-base font-bold text-foreground">{subject.subject}</h3>
                  {electives.includes(subject.subject) && (
                    <span className="rounded-full bg-muted px-2 py-0.5 font-heading text-[11px] font-semibold text-muted-foreground">Elective</span>
                  )}
                </div>
                <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto">
                  {unassessed ? (
                    <span className={`${pill} bg-muted text-muted-foreground ring-1 ring-inset ring-border`}>Not assessed</span>
                  ) : (
                    <>
                      <span className={`${pill} ${alignBadgeClass(pct)}`}>{pct}% Align</span>
                      <span className={`${pill} ${coverage.badge}`}>{coverage.label}</span>
                      <span className={`${pill} hidden sm:inline-block ${pace.badge}`}>{pace.label}</span>
                    </>
                  )}
                  <ChevronDown
                    className="ml-auto h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180 sm:ml-1"
                    aria-hidden="true"
                  />
                </div>
              </CollapsibleTrigger>
              {/* Kept in the page when closed so it prints (see .report-collapsible in index.css). */}
              <CollapsibleContent forceMount className="report-collapsible data-[state=closed]:hidden">
                <SubjectDetail
                  subject={subject}
                  criticalGaps={criticalGaps}
                  entryGrade={entryGrade}
                  learning={learning}
                  familiarity={isFamiliarity(picked) ? picked : undefined}
                />
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
