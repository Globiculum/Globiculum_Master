import { describe, expect, it, vi } from "vitest";

// Only the pure helpers are tested here, so no Supabase project is needed.
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { notesForAnalysis, worriesForAnalysis } from "./submitAssessment";

describe("worriesForAnalysis (T72)", () => {
  it("sends the student's worries, in the order ticked", () => {
    expect(worriesForAnalysis({ nervousness: ["Making friends", "New subjects"] })).toEqual(["Making friends", "New subjects"]);
  });

  it("sends nothing for 'Not really nervous', no ticks, or the parent form", () => {
    expect(worriesForAnalysis({ nervousness: ["Not really nervous"] })).toBeUndefined();
    expect(worriesForAnalysis({ nervousness: [] })).toBeUndefined();
    expect(worriesForAnalysis({ childName: "Asha" })).toBeUndefined();
    expect(worriesForAnalysis(null)).toBeUndefined();
  });

  it("ignores anything that isn't text", () => {
    expect(worriesForAnalysis({ nervousness: [3, null, "New language"] })).toEqual(["New language"]);
  });
});

describe("notesForAnalysis", () => {
  it("replaces the child's names with 'the child', whole words only", () => {
    expect(notesForAnalysis({ additionalNotes: " Asha Rao loves maths. Banana. ", childName: "Asha", childLastName: "Rao" })).toBe(
      "the child the child loves maths. Banana."
    );
  });
});
