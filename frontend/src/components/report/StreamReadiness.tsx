import type { ReportSubject } from "@/lib/reportContent";
import type { AlignmentLevel } from "@/lib/reportDesign";
import { Panel, StatusBadge } from "./ReportPrimitives";

type Readiness = "strong" | "moderate" | "preparation";
const LEVEL: Record<Readiness, AlignmentLevel> = { strong: "strong", moderate: "moderate", preparation: "high_gap" };

function SubjectGrid({ items }: { items: { name: string; readiness: Readiness }[] }) {
  return (
    <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
      {items.map((s) => (
        <li key={s.name} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2.5">
          <span className="font-heading text-sm font-medium text-foreground">{s.name}</span>
          <StatusBadge level={LEVEL[s.readiness]} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Classes XI-XII with no stream chosen (reports saved before the form asked
 * for one): which streams the current coursework suits.
 */
export function StreamReadiness({ subjects, academicPath }: { subjects: ReportSubject[]; academicPath: string[] }) {
  const levelOf = (level?: string): Readiness => (level === "strong" ? "strong" : level === "moderate" ? "moderate" : "preparation");

  const getReadiness = (keywords: RegExp): Readiness => levelOf(subjects.find((s) => keywords.test(s.subject))?.alignmentLevel);
  const has = (keywords: RegExp) => academicPath.some((s) => keywords.test(s));
  const streamSubjects = [
    { name: "Mathematics", check: /math|algebra|calculus|geometry|pre-calculus/i, readiness: getReadiness(/math/i) },
    { name: "Physics", check: /physics/i, readiness: has(/physics/i) ? getReadiness(/physics/i) : ("preparation" as Readiness) },
    { name: "Chemistry", check: /chemistry/i, readiness: has(/chemistry/i) ? getReadiness(/chemistry/i) : ("preparation" as Readiness) },
    { name: "Biology", check: /biology/i, readiness: has(/biology/i) ? getReadiness(/biology/i) : ("preparation" as Readiness) },
    { name: "Economics / Commerce", check: /economics|commerce|business/i, readiness: has(/economics|commerce/i) ? getReadiness(/economics/i) : ("preparation" as Readiness) },
    { name: "Computer Science", check: /computer|cs|coding/i, readiness: has(/computer|cs|coding/i) ? getReadiness(/computer/i) : ("preparation" as Readiness) },
  ].filter((s) => has(s.check) || s.name === "Mathematics");
  const pcmReady = streamSubjects.filter((s) => /math|physics|chemistry/i.test(s.name)).every((s) => s.readiness !== "preparation");
  const pcbReady = streamSubjects.some((s) => /biology/i.test(s.name) && s.readiness !== "preparation");
  const suggestions = [
    pcmReady && "PCM (Science with Maths)",
    pcbReady && "PCB (Science with Biology)",
    has(/economics|commerce|business/i) && "Commerce",
  ].filter((x): x is string => !!x);

  return (
    <Panel className="mt-4 p-4 sm:p-5">
      <p className="font-heading text-sm font-semibold text-secondary-contrast">Which Class 11–12 stream fits</p>
      <p className="mt-0.5 font-body text-[15px] text-muted-foreground">How current coursework lines up with Indian streams. AP courses count as signs of rigour.</p>
      <SubjectGrid items={streamSubjects} />
      <p className="mt-3 font-body text-[15px] text-foreground/85">
        <span className="font-heading text-sm font-semibold text-primary">Suggested: </span>
        {suggestions.length > 0 ? suggestions.join(", ") : "Needs further assessment"}
      </p>
    </Panel>
  );
}
