import { describe, expect, it } from "vitest";
import {
  formatLanguageSkills,
  forgetLanguage,
  languageSkillsForAnalysis,
  levelFromSkills,
  markNewToLanguage,
  skillsLabel,
  toggleSkill,
  withLanguageSkills,
} from "./languageSkills";

describe("levelFromSkills", () => {
  it("works the single level out from the ticks", () => {
    expect(levelFromSkills([])).toBe("");
    expect(levelFromSkills(["understand", "speak"])).toBe("beginner"); // can't read yet: script first
    expect(levelFromSkills(["read", "write"])).toBe("intermediate");
    expect(levelFromSkills(["understand", "speak", "read"])).toBe("intermediate");
    expect(levelFromSkills(["understand", "speak", "read", "write"])).toBe("fluent");
  });
});

describe("toggleSkill / markNewToLanguage / forgetLanguage", () => {
  const empty = { languageSkills: {}, languageProficiencies: {} };

  it("keeps the ticks in order and the level in step", () => {
    let a = toggleSkill(empty, "Hindi", "speak");
    a = toggleSkill(a, "Hindi", "understand");
    expect(a.languageSkills.Hindi).toEqual(["understand", "speak"]);
    expect(a.languageProficiencies.Hindi).toBe("beginner");
    a = toggleSkill(toggleSkill(a, "Hindi", "read"), "Hindi", "write");
    expect(a.languageProficiencies.Hindi).toBe("fluent");
  });

  it("unticking everything leaves the language unanswered", () => {
    const a = toggleSkill(toggleSkill(empty, "Telugu", "speak"), "Telugu", "speak");
    expect(a.languageSkills.Telugu).toEqual([]);
    expect(a.languageProficiencies).not.toHaveProperty("Telugu");
  });

  it("New to it clears the ticks; forgetting drops both", () => {
    const ticked = toggleSkill(empty, "Sanskrit", "read");
    const fresh = markNewToLanguage(ticked, "Sanskrit");
    expect(fresh.languageSkills.Sanskrit).toEqual([]);
    expect(fresh.languageProficiencies.Sanskrit).toBe("new");
    const gone = forgetLanguage(fresh, "Sanskrit");
    expect(gone.languageSkills).not.toHaveProperty("Sanskrit");
    expect(gone.languageProficiencies).not.toHaveProperty("Sanskrit");
  });
});

describe("withLanguageSkills (answers saved before the tick-boxes)", () => {
  it("Fluent becomes all four, New to it stays, other levels are asked again", () => {
    const out = withLanguageSkills({
      languageProficiencies: { Hindi: "fluent", Sanskrit: "new", Telugu: "beginner", Tamil: "intermediate" },
      languageSkills: {},
    });
    expect(out.languageSkills).toEqual({ Hindi: ["understand", "speak", "read", "write"], Sanskrit: [] });
    expect(out.languageProficiencies).toEqual({ Hindi: "fluent", Sanskrit: "new" });
  });

  it("keeps ticks already saved and works the level out from them", () => {
    const out = withLanguageSkills({
      languageProficiencies: { Hindi: "beginner" },
      languageSkills: { Hindi: ["speak", "bogus", "understand"] },
    });
    expect(out.languageSkills).toEqual({ Hindi: ["understand", "speak"] });
    expect(out.languageProficiencies).toEqual({ Hindi: "beginner" });
  });
});

describe("labels and the AI payload", () => {
  it("labels what was ticked", () => {
    expect(skillsLabel(["understand", "speak"])).toBe("Understands, speaks");
    expect(skillsLabel([], "new")).toBe("New to it");
    expect(formatLanguageSkills(["Hindi", "Sanskrit"], { Hindi: ["read", "write"], Sanskrit: [] }, { Hindi: "intermediate", Sanskrit: "new" }))
      .toBe("Hindi: reads, writes; Sanskrit: new to it");
  });

  it("sends the known languages' ticks plus New to it as an empty list", () => {
    expect(
      languageSkillsForAnalysis(["Hindi"], { Hindi: ["understand", "speak"] }, { Hindi: "beginner", Sanskrit: "new" })
    ).toEqual({ Hindi: ["understand", "speak"], Sanskrit: [] });
    expect(languageSkillsForAnalysis([], {}, {})).toBeUndefined();
  });
});
