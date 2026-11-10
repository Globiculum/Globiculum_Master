import { describe, expect, it } from "vitest";
import { skillChapters, topicLinks, type TopicResource } from "./topicLinks";

const r = (over: Partial<TopicResource>): TopicResource => ({
  board: "cbse",
  grade: 6,
  subject: "English",
  topic: "Grammar",
  resource_type: "textbook",
  provider: "NCERT Poorvi",
  title: "Ch 1: A Bottle of Dew (nouns)",
  url: "https://ncert.nic.in/textbook/pdf/fepr101.pdf",
  ...over,
});

const rows: TopicResource[] = [
  r({ title: "Ch 3: Rama to the Rescue (adjectives)", url: "https://x/ch3.pdf" }),
  r({ title: "Ch 1: A Bottle of Dew (nouns)", url: "https://x/ch1.pdf" }),
  r({ topic: "Reading comprehension", title: "Every chapter: Ch 1: A Bottle of Dew", url: "https://x/ch1.pdf" }),
  // Same skill name in another language, same class.
  r({ subject: "Hindi", topic: "Listening and speaking", provider: "NCERT Malhar", title: "Every chapter: Ch 1: Matribhumi", url: "https://x/h1.pdf" }),
  // An ordinary chapter topic row.
  r({ topic: "A Bottle of Dew", provider: "NCERT", title: "NCERT Class 6 Poorvi: Chapter 1", url: "https://x/unit1.pdf" }),
];

describe("skillChapters", () => {
  it("lists the chapters that practise a skill, in chapter order", () => {
    const [group] = skillChapters(rows, { topic: "Grammar", subject: "English", grade: 6 });
    expect(group.lead).toBe("Practise in Poorvi:");
    expect(group.links.map((l) => l.label)).toEqual(["Ch 1: A Bottle of Dew (nouns)", "Ch 3: Rama to the Rescue (adjectives)"]);
  });

  it("orders units too (Poorvi's and Kaveri's chapter files are units)", () => {
    const units = [
      r({ title: "Unit 10: Ten", url: "https://x/u10.pdf" }),
      r({ title: "Unit 2: Friendship (past tenses)", url: "https://x/u2.pdf" }),
      r({ title: "Unit 1: Fables (adverbs)", url: "https://x/u1.pdf" }),
    ];
    const [group] = skillChapters(units, { topic: "Grammar", subject: "English", grade: 6 });
    expect(group.links.map((l) => l.url)).toEqual(["https://x/u1.pdf", "https://x/u2.pdf", "https://x/u10.pdf"]);
  });

  it("says when every chapter practises the skill", () => {
    const [group] = skillChapters(rows, { topic: "reading comprehension", subject: "English", grade: 6 });
    expect(group.lead).toBe("Every chapter of Poorvi practises this. Start with:");
    expect(group.links).toEqual([{ label: "Ch 1: A Bottle of Dew", url: "https://x/ch1.pdf", title: "Poorvi, Ch 1: A Bottle of Dew (NCERT chapter PDF)" }]);
  });

  it("never gives one language's chapters to another language's skill", () => {
    expect(skillChapters(rows, { topic: "Listening and speaking", subject: "English", grade: 6 })).toEqual([]);
    expect(skillChapters(rows, { topic: "Listening and speaking", subject: "Hindi", grade: 6 })).toHaveLength(1);
  });

  it("matches English Core to English and keeps classes apart", () => {
    expect(skillChapters(rows, { topic: "Grammar", subject: "English Core", grade: 6 })).toHaveLength(1);
    expect(skillChapters(rows, { topic: "Grammar", subject: "English", grade: 7 })).toEqual([]);
  });

  it("returns nothing for an ordinary topic", () => {
    expect(skillChapters(rows, { topic: "A Bottle of Dew", subject: "English", grade: 6 })).toEqual([]);
  });
});

describe("topicLinks", () => {
  it("does not use skill rows as a topic's chapter link", () => {
    const links = topicLinks(rows, { board: "cbse", topic: "Grammar", subject: "English", grade: 6 });
    expect(links.map((l) => l.label)).toEqual(["YouTube videos"]);
  });

  it("still links an ordinary chapter topic", () => {
    const links = topicLinks(rows, { board: "cbse", topic: "A Bottle of Dew", subject: "English", grade: 6 });
    expect(links[0]).toMatchObject({ label: "NCERT chapter (PDF)", url: "https://x/unit1.pdf" });
  });
});
