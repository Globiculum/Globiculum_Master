import { beforeEach, describe, expect, it } from "vitest";
import { ASSESSMENT_DRAFT_KEY, clearDraft, draftMatches, readDraft, saveDraft, type AssessmentDraft } from "./assessmentDraft";

const draft = (over: Partial<AssessmentDraft> = {}): AssessmentDraft => ({
  persona: "parent",
  ownerId: "user-a",
  prevReportId: null,
  step: 2,
  formData: { childName: "Zephyrine" },
  savedAt: 0,
  ...over,
});

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe("saveDraft / readDraft / clearDraft", () => {
  it("keeps the draft in sessionStorage only", () => {
    saveDraft({ persona: "parent", ownerId: "user-a", prevReportId: null, step: 1, formData: { childName: "Zephyrine" } });
    expect(readDraft()).toMatchObject({ persona: "parent", ownerId: "user-a", step: 1, formData: { childName: "Zephyrine" } });
    expect(localStorage.length).toBe(0);
    clearDraft();
    expect(sessionStorage.getItem(ASSESSMENT_DRAFT_KEY)).toBeNull();
  });

  it("ignores a broken or incomplete draft", () => {
    sessionStorage.setItem(ASSESSMENT_DRAFT_KEY, "{not json");
    expect(readDraft()).toBeNull();
    sessionStorage.setItem(ASSESSMENT_DRAFT_KEY, JSON.stringify({ persona: "teacher", step: 1, formData: {} }));
    expect(readDraft()).toBeNull();
    sessionStorage.setItem(ASSESSMENT_DRAFT_KEY, JSON.stringify({ persona: "parent", formData: {} }));
    expect(readDraft()).toBeNull();
  });
});

describe("draftMatches: a draft only comes back for whoever saved it", () => {
  it("restores the same person's draft for the same form", () => {
    expect(draftMatches(draft(), "parent", "user-a", undefined)).toBe(true);
  });

  it("never gives one account's draft to another account", () => {
    expect(draftMatches(draft(), "parent", "user-b", undefined)).toBe(false);
    expect(draftMatches(draft(), "parent", undefined, undefined)).toBe(false);
  });

  it("does not hand a signed-out draft to whoever signs in next", () => {
    expect(draftMatches(draft({ ownerId: null }), "parent", "user-a", undefined)).toBe(false);
    expect(draftMatches(draft({ ownerId: null }), "parent", undefined, undefined)).toBe(true);
  });

  it("keeps parent and student drafts apart", () => {
    expect(draftMatches(draft(), "student", "user-a", undefined)).toBe(false);
  });

  it("matches a retake draft only to the same report", () => {
    const retake = draft({ prevReportId: "report-1" });
    expect(draftMatches(retake, "parent", "user-a", "report-1")).toBe(true);
    expect(draftMatches(retake, "parent", "user-a", "report-2")).toBe(false);
    expect(draftMatches(retake, "parent", "user-a", undefined)).toBe(false);
    expect(draftMatches(draft(), "parent", "user-a", "report-1")).toBe(false);
  });

  it("returns false when there is no draft", () => {
    expect(draftMatches(null, "parent", "user-a", undefined)).toBe(false);
  });
});
