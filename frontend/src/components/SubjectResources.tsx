import {
  languageStartNote,
  levelledLanguage,
  type LanguageFamiliarity,
  type LearningResource,
  type useLearningResources,
} from "@/hooks/useLearningResources";

// The "Resources" block of a subject card, shared by the report page and the
// shared report. Hindi and Sanskrit get a where-to-start note and resources
// grouped by level, chosen from the familiarity picked on the form; every
// other subject gets its class material.

const RESOURCE_TYPE_LABEL: Record<LearningResource["resource_type"], string> = {
  textbook: "Textbook",
  video: "Video",
  practice: "Practice",
};

interface Props {
  subject: string;
  grade: number | undefined;
  learning: ReturnType<typeof useLearningResources>;
  /** formData.languageProficiencies: { Hindi: "fluent", ... } */
  languageProficiencies?: Record<string, string>;
  /** Extra class on links (the report page hides them when printing). */
  linkClassName?: string;
}

const isFamiliarity = (v: unknown): v is LanguageFamiliarity =>
  v === "beginner" || v === "intermediate" || v === "fluent";

function ResourceList({ items, linkClassName }: { items: LearningResource[]; linkClassName: string }) {
  return (
    <ul className="space-y-1 text-xs text-foreground/90">
      {items.map((r) => (
        <li key={r.url} className="flex gap-1.5">
          <span className="text-secondary" aria-hidden="true">•</span>
          <span>
            <a href={r.url} target="_blank" rel="noopener noreferrer" className={`underline hover:text-secondary ${linkClassName}`}>
              {r.title}
            </a>
            <span className="ml-1 text-[10px] text-muted-foreground">{RESOURCE_TYPE_LABEL[r.resource_type]}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function SubjectResources({ subject, grade, learning, languageProficiencies, linkClassName = "" }: Props) {
  if (levelledLanguage(subject) && grade) {
    const picked = Object.entries(languageProficiencies ?? {}).find(([lang]) => lang.toLowerCase() === subject.toLowerCase())?.[1];
    const familiarity = isFamiliarity(picked) ? picked : undefined;
    const groups = learning.forLanguage(subject, familiarity);
    return (
      <div className="space-y-2">
        <p className="text-xs text-foreground/90">{languageStartNote(subject, grade, familiarity)}</p>
        {groups.map((g) => (
          <div key={g.heading}>
            <p className="mb-0.5 text-[10px] font-semibold text-muted-foreground">{g.heading}</p>
            <ResourceList items={g.items} linkClassName={linkClassName} />
          </div>
        ))}
      </div>
    );
  }

  const resources = learning.forSubject(subject);
  return resources.length > 0 ? (
    <ResourceList items={resources} linkClassName={linkClassName} />
  ) : (
    <p className="text-xs text-muted-foreground">No resources available yet for this subject.</p>
  );
}
