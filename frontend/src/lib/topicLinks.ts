/**
 * Study links for one gap topic in a subject card ("New to your child",
 * "Partly covered"): its chapter, a lesson, free solutions and videos.
 *
 * Rows come from the topic_resources table (backend/rag-pipeline/ingest/
 * topic_resources.py), matched by board, class and topic name. The link saved
 * in the report (the curriculum node's own link) is the fallback: NCERT's
 * chapter viewer page is swapped for the chapter PDF it frames (the viewer
 * shows a blank frame on phones), and its front-pages link ("=ps-") is
 * dropped, since it never opened the topic.
 */

export type TopicResourceType = "textbook" | "video" | "practice";

export interface TopicResource {
  board: string;
  grade: number;
  subject: string;
  topic: string;
  resource_type: TopicResourceType;
  provider: string;
  title: string;
  url: string;
}

export interface TopicLink {
  label: string;
  url: string;
  /** Full name of what opens, for the tooltip. */
  title: string;
}

const BOARD_NAME: Record<string, string> = { cbse: "CBSE", icse: "ICSE", isc: "ISC" };

/** NCERT "textbook.php?hegp1=3-7" -> its chapter PDF; front pages ("=ps-7") -> undefined; a whole book ("=0-7") stays. */
export function ncertChapterUrl(url: string): string | undefined {
  const m = /^https?:\/\/ncert\.nic\.in\/textbook\.php\?([a-z]{4}\d)=(\w+)-\d+$/i.exec(url);
  if (!m) return url;
  if (m[2] === "ps") return undefined;
  if (m[2] === "0") return url;
  const n = Number(m[2]);
  return Number.isInteger(n) && n > 0 ? `https://ncert.nic.in/textbook/pdf/${m[1].toLowerCase()}${String(n).padStart(2, "0")}.pdf` : undefined;
}

/** The topic as a search phrase: no "(Unit: ...)" or "History:" prefixes. */
const searchTopic = (topic: string) =>
  topic
    .replace(/\([^)]*\)/g, " ")
    .replace(/^\s*(history|civics)\s*:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

export function youtubeSearchUrl(board: string | null, grade: number | undefined, subject: string, topic: string): string {
  const q = [BOARD_NAME[board ?? ""], grade ? `Class ${grade}` : "", subject, searchTopic(topic)].filter(Boolean).join(" ");
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}

const LABEL: Record<TopicResourceType, string> = {
  textbook: "NCERT chapter (PDF)",
  video: "Khan Academy lesson",
  practice: "Solved exercises",
};

/** The saved link as a fallback "read" link, labelled by what it is. */
function savedLink(url: string | undefined, board: string | null): TopicLink | undefined {
  if (!url || !/^https?:\/\//i.test(url)) return undefined; // older nodes hold notes like "N/A - not an NCERT publication"
  const fixed = ncertChapterUrl(url);
  if (!fixed) return undefined;
  if (/ncert\.nic\.in\/textbook\/pdf\//i.test(fixed)) return { label: LABEL.textbook, url: fixed, title: "NCERT chapter (PDF)" };
  if (/ncert\.nic\.in\/textbook\.php/i.test(fixed)) return { label: "NCERT book", url: fixed, title: "NCERT book" };
  if (/cisce\.org/i.test(fixed)) {
    const name = board === "isc" ? "ISC" : "ICSE";
    return { label: `${name} syllabus (PDF)`, url: fixed, title: `Official ${name} syllabus for this subject (CISCE)` };
  }
  return { label: "Open", url: fixed, title: fixed };
}

/**
 * Language skills (English, Hindi, Sanskrit gaps are skills, not chapters) are
 * pointed at the textbook chapters that practise them by rows whose provider
 * names the book: "NCERT Poorvi" (topic_resources.py --skills). Their title is
 * the link text, "Ch 3: Rama to the Rescue (adjectives)"; a skill every chapter
 * practises has one row titled "Every chapter: Ch 1: A Bottle of Dew".
 */
const SKILL_PROVIDER = /^NCERT (.+)$/;
const EVERY_CHAPTER = /^Every chapter:\s*/;
const isSkillRow = (r: TopicResource) => SKILL_PROVIDER.test(r.provider);
/** "English Core" -> "english": skill names repeat across languages ("Listening and speaking"). */
const language = (subject: string) => subject.toLowerCase().trim().split(/\s+/)[0];
/** "Ch 3: ...", "Unit 2: ...", "Appendix 1: ...", "Writing Skills 1: ..." -> 3, 2, 1, 1; anything else last. */
const chapterNo = (title: string) =>
  Number(/^(?:Ch|Unit|Appendix|Writing Skills) (\d+)/.exec(title.replace(EVERY_CHAPTER, ""))?.[1] ?? 999);

export interface SkillChapters {
  /** "Practise in Poorvi:" or "Every chapter of Poorvi practises this. Start with:" */
  lead: string;
  links: TopicLink[];
}

/** The textbook chapters that practise a language skill, one group per book; empty for any other topic. */
export function skillChapters(rows: TopicResource[], opts: { topic: string; subject: string; grade?: number }): SkillChapters[] {
  const key = opts.topic.toLowerCase().trim();
  const mine = rows.filter(
    (r) =>
      isSkillRow(r) &&
      r.topic.toLowerCase().trim() === key &&
      language(r.subject) === language(opts.subject) &&
      (opts.grade === undefined || r.grade === opts.grade)
  );
  const books = [...new Set(mine.map((r) => r.provider))];
  return books.map((provider) => {
    const book = SKILL_PROVIDER.exec(provider)![1];
    const own = mine.filter((r) => r.provider === provider).sort((a, b) => chapterNo(a.title) - chapterNo(b.title));
    const every = own.length === 1 && EVERY_CHAPTER.test(own[0].title);
    return {
      lead: every ? `Every chapter of ${book} practises this. Start with:` : `Practise in ${book}:`,
      links: own.map((r) => {
        const label = r.title.replace(EVERY_CHAPTER, "");
        return { label, url: r.url, title: `${book}, ${label} (NCERT chapter PDF)` };
      }),
    };
  });
}

/**
 * Links for one topic, in reading order: chapter, lesson, solved exercises,
 * videos. For ICSE/ISC, which have no textbook of their own, the syllabus
 * comes last instead of first.
 */
export function topicLinks(
  rows: TopicResource[],
  opts: { board: string | null; topic: string; subject: string; grade?: number; savedUrl?: string }
): TopicLink[] {
  const key = opts.topic.toLowerCase().trim();
  const mine = rows.filter(
    (r) => !isSkillRow(r) && r.topic.toLowerCase().trim() === key && (opts.grade === undefined || r.grade === opts.grade)
  );
  const first = (type: TopicResourceType) => mine.find((r) => r.resource_type === type);
  const asLink = (r: TopicResource | undefined): TopicLink | undefined => (r ? { label: LABEL[r.resource_type], url: r.url, title: r.title } : undefined);

  const saved = savedLink(opts.savedUrl, opts.board);
  const isSyllabus = !!saved && /syllabus/i.test(saved.label);
  // Once the table is loaded every CBSE chapter that opens has a row, so a
  // CBSE topic without one keeps no chapter link (its saved one is a chapter
  // NCERT has since removed). Other boards' reports can still hold NCERT
  // topics (ICSE reports made before 3 Nov), so they keep the saved link.
  const trustTable = rows.length > 0 && opts.board === "cbse";
  const read = asLink(first("textbook")) ?? (isSyllabus || (trustTable && saved?.label === LABEL.textbook) ? undefined : saved);
  const videos: TopicLink = {
    label: "YouTube videos",
    url: youtubeSearchUrl(opts.board, opts.grade, opts.subject, opts.topic),
    title: `YouTube search: ${searchTopic(opts.topic)}`,
  };
  return [read, asLink(first("video")), asLink(first("practice")), videos, isSyllabus ? saved : undefined].filter(
    (l): l is TopicLink => !!l
  );
}
