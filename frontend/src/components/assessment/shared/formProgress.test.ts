import { describe, expect, it } from "vitest";
import { percentAnswered, stepShare } from "./formProgress";
import { priorGradeOptions } from "./priorGrades";
import { parentStepShares } from "../parent/parentValidation";
import type { ParentFormData } from "../parent/parentMapper";

const emptyParent = (): ParentFormData =>
  ({
    childName: "", childLastName: "", schoolStage: "", snapshotGrade: "", snapshotLocation: "", snapshotLocationOther: "",
    usState: "", usStateOther: "", snapshotAge: "", currentCurriculum: [], currentCurriculumOther: "", curriculumType: "",
    reportCard: null, previousLocation: "", previousLocationOther: "", previouslyStudiedInIndia: "", targetGoal: "",
    targetGoalOther: "", targetGrade: "", targetStream: "", targetElectives: [], targetLanguage: "", timeline: "",
    educationHistory: [], academicPath: [], selectedLanguages: [], languageProficiencies: {}, extracurriculars: [],
    languagesAtHome: [], foreignLanguageName: "", foreignLanguageNameOther: "", foreignLanguageLevel: "", mathCourse: "",
    mathProgramLevel: "", learningStyles: [], studyTime: "", previousGrades: "", overallPerformance: "", strongestSubjects: [],
    challengingSubjects: [], strengthenGoals: [], subjectConfidences: {}, transitionConcerns: [], supportNeeds: [], additionalNotes: "",
  }) as ParentFormData;

// A finished School step: Grade 4, US (California), regular curriculum, CBSE, same grade.
const schoolDone = (): ParentFormData => ({
  ...emptyParent(),
  childName: "Asha", childLastName: "Rao", schoolStage: "elementary", snapshotGrade: "4", snapshotLocation: "us",
  usState: "CA", currentCurriculum: ["regular-us"], targetGoal: "cbse", targetGrade: "same", timeline: "3-6-months",
});

describe("stepShare / percentAnswered", () => {
  it("counts answered questions, and groups by their share", () => {
    expect(stepShare([true, false, 0.5, 1])).toBe(0.625);
  });

  it("weighs each step the same and only reaches 100 when everything is answered", () => {
    expect(percentAnswered([0, 0, 0])).toBe(0);
    expect(percentAnswered([1, 0.5, 0])).toBe(50);
    expect(percentAnswered([1, 1, 0.999])).toBe(99);
    expect(percentAnswered([1, 1, 1])).toBe(100);
  });
});

describe("parentStepShares", () => {
  it("is 0% on an empty form (it showed 25% on the first page before)", () => {
    expect(percentAnswered(parentStepShares(emptyParent(), null))).toBe(0);
  });

  it("grows with each answer on the School step", () => {
    const one = parentStepShares({ ...emptyParent(), childName: "Asha", childLastName: "Rao" }, null);
    const two = parentStepShares({ ...emptyParent(), childName: "Asha", childLastName: "Rao", schoolStage: "middle" }, null);
    expect(one[0]).toBeGreaterThan(0);
    expect(two[0]).toBeGreaterThan(one[0]);
  });

  it("marks the School step done when every required card is answered", () => {
    expect(parentStepShares(schoolDone(), null)[0]).toBe(1);
  });

  it("counts a Yes to a previous Indian school only with its schools filled in", () => {
    const yes = { ...schoolDone(), previouslyStudiedInIndia: "yes" };
    expect(parentStepShares({ ...yes, educationHistory: [{ fromGrade: "1", toGrade: "", country: "India", curriculum: "CBSE" }] }, null)[0]).toBeLessThan(1);
    expect(parentStepShares({ ...yes, educationHistory: [{ fromGrade: "1", toGrade: "3", country: "India", curriculum: "CBSE" }] }, null)[0]).toBe(1);
    expect(parentStepShares({ ...schoolDone(), previouslyStudiedInIndia: "no" }, null)[0]).toBe(1);
  });

  it("counts subjects one by one once the Academic step reports them", () => {
    const d = { ...schoolDone(), subjectConfidences: { Mathematics: "strong" } };
    expect(parentStepShares(d, { answered: 1, total: 4 })[1]).toBeCloseTo(0.125); // (1/4 + no performance) / 2
    expect(parentStepShares({ ...d, overallPerformance: "on-track" }, { answered: 4, total: 4 })[1]).toBe(1);
  });

  it("reaches 100% on a fully answered form", () => {
    const d = {
      ...schoolDone(),
      subjectConfidences: { Mathematics: "strong" },
      academicPath: ["Mathematics"],
      overallPerformance: "on-track",
      learningStyles: ["visual"],
      transitionConcerns: ["Language barriers"],
      supportNeeds: ["Peer Study"],
    };
    expect(percentAnswered(parentStepShares(d, { answered: 5, total: 5 }))).toBe(100);
  });
});

describe("priorGradeOptions", () => {
  it("offers only the grades before the current one, from KG", () => {
    expect(priorGradeOptions("5").map((g) => g.value)).toEqual(["KG", "1", "2", "3", "4"]);
  });

  it("still offers KG to a Grade 1 child", () => {
    expect(priorGradeOptions("1").map((g) => g.value)).toEqual(["KG"]);
  });

  it("offers KG and Grades 1-12 before the grade is known", () => {
    expect(priorGradeOptions("")).toHaveLength(13);
  });
});
