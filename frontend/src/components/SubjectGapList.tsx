import { useState } from "react";
import { getGapReason } from "@/lib/gapExplanations";
import { type GapItem, languageStartNote, subjectGapItems, topicOf } from "@/lib/subjectGaps";

/**
 * A subject's complete list of missing topics, for the subject cards in
 * ReportPreview and ReportView. It replaced the separate "Critical Gaps
 * Prioritised" section (T06), which repeated the same topics and reasons.
 *
 * analyze-curriculum sends every gap of a subject in keyGaps, each with a
 * severity: CRITICAL = nothing related in the student's coursework (new
 * content), MAJOR/MODERATE = partly covered. Reports saved before that only
 * have each subject's first 6 gaps there; their remaining CRITICAL gaps are
 * merged in from criticalGaps.
 */

interface Row {
  topic: string;
  url?: string;
  reason: string;
  classTag?: string;
}

// The backend's new-content reasons differ per topic only by the quoted topic
// name ("... — "Amines" will be new content."); with that removed, a group
// whose reasons all match shows the sentence once instead of on every row.
const sharedReason = (rows: Row[]): string | undefined => {
  if (rows.length < 2) return undefined;
  const generic = rows.map((r) => r.reason.replace(/"[^"]*"/, "each of these"));
  return generic.every((r) => r === generic[0]) && generic[0] !== rows[0].reason ? generic[0] : undefined;
};

interface SubjectGapListProps {
  subject: string;
  keyGaps: GapItem[];
  criticalGaps: GapItem[];
  /** The class the student enters; earlier-class topics are tagged as foundations. */
  entryGrade?: number;
  initialCount?: number;
}

export function SubjectGapList({ subject, keyGaps, criticalGaps, entryGrade, initialCount = 5 }: SubjectGapListProps) {
  const [showAll, setShowAll] = useState(false);
  const items = subjectGapItems(subject, keyGaps, criticalGaps);
  const startNote = languageStartNote(subject, criticalGaps);

  const toRow = (g: GapItem): Row => {
    const grade = typeof g === "string" ? undefined : g.grade;
    return {
      topic: topicOf(g),
      url: typeof g === "string" ? undefined : g.resourceUrl,
      reason: typeof g !== "string" && g.reason ? g.reason : getGapReason(topicOf(g), subject),
      classTag: grade && entryGrade && grade < entryGrade ? `Class ${grade} foundation` : undefined,
    };
  };

  // Group only when every gap carries a severity (reports from before it did
  // are shown as one list, as they always were).
  const graded = items.length > 0 && items.every((g) => typeof g !== "string" && g.severity);
  const groups = graded
    ? [
        { title: "New content", note: "Nothing related in the student's current coursework.", rows: items.filter((g) => typeof g !== "string" && g.severity === "CRITICAL").map(toRow) },
        { title: "Partly covered", note: "Something related was studied; the closest match is shown.", rows: items.filter((g) => typeof g !== "string" && g.severity !== "CRITICAL").map(toRow) },
      ].filter((group) => group.rows.length > 0)
    : items.length > 0
      ? [{ title: "", note: "", rows: items.map(toRow) }]
      : []; // no gaps: just the "none flagged" line, not an empty table

  const total = items.length;
  const limit = showAll ? total : initialCount;
  let shown = 0;

  return (
    <div className="space-y-2">
      {startNote && (
        <p className="rounded-md border border-secondary/25 bg-secondary/5 px-2 py-1.5 text-[11px] text-foreground/90">
          <span className="font-semibold">Where to start: </span>
          {startNote}
        </p>
      )}

      {total === 0 && !startNote && <p className="text-xs text-muted-foreground">No specific gap topics flagged for this subject.</p>}

      {groups.map((group) => {
        // Partly covered rows each name their own closest match; collapsing two
        // that happen to share a % hid it ("each of these (54% related)").
        const common = group.title === "Partly covered" ? undefined : sharedReason(group.rows);
        const firstHidden = Math.max(0, limit - shown);
        shown += group.rows.length;
        // Rows past the limit stay in the page, hidden on screen and shown in
        // the PDF (print-show), so a printed report always lists every topic.
        const hiddenClass = (i: number) => (i >= firstHidden ? "hidden print-show" : "");
        return (
          <div key={group.title || "all"} className={firstHidden === 0 ? "hidden print-show" : undefined}>
            {group.title && (
              <p className="mb-0.5 text-[11px] font-semibold text-foreground">
                {group.title} <span className="font-normal text-muted-foreground">({group.rows.length}) · {common ?? group.note}</span>
              </p>
            )}
            <div className="overflow-x-auto rounded-md border border-border bg-background">
              <table className="w-full border-collapse text-[11px]">
                <tbody>
                  {group.rows.map((r, i) => (
                    <tr
                      key={`${r.topic}-${i}`}
                      className={`${i > 0 ? "[&>td]:border-t" : ""} ${i % 2 === 1 ? "bg-muted/40" : ""} ${hiddenClass(i)}`}
                    >
                      <td className="border-border px-2 py-1 align-top font-medium">
                        {r.url ? (
                          <a href={r.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-secondary">
                            {r.topic}
                          </a>
                        ) : (
                          r.topic
                        )}
                        {r.classTag && (
                          <span className="ml-1 whitespace-nowrap rounded bg-muted px-1 py-0.5 text-[9px] font-semibold text-muted-foreground">{r.classTag}</span>
                        )}
                      </td>
                      {!common && <td className="border-border px-2 py-1 align-top text-muted-foreground">{r.reason}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {total > initialCount && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="text-[11px] font-semibold text-secondary hover:underline"
        >
          {showAll ? "Show fewer" : `Show all ${total} topics`}
        </button>
      )}
    </div>
  );
}
