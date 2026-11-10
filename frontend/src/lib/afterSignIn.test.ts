import { describe, expect, it } from "vitest";
import { safeFormPath, signInPathFor } from "./afterSignIn";

describe("safeFormPath", () => {
  it("allows the two assessment forms, with their query string", () => {
    expect(safeFormPath("/begin-journey")).toBe("/begin-journey");
    expect(safeFormPath("/student-assessment")).toBe("/student-assessment");
    expect(safeFormPath("/begin-journey?topic=Fractions")).toBe("/begin-journey?topic=Fractions");
  });

  it("refuses other sites and other pages", () => {
    for (const bad of ["//evil.example/begin-journey", "https://evil.example/begin-journey", "/admin", "/auth", "/begin-journey/../admin", "begin-journey", "", null, undefined, 42]) {
      expect(safeFormPath(bad)).toBeNull();
    }
  });
});

describe("signInPathFor", () => {
  it("links to sign-in with the form to come back to", () => {
    expect(signInPathFor("/begin-journey")).toBe("/auth?next=%2Fbegin-journey");
  });

  it("links to plain sign-in for any other page", () => {
    expect(signInPathFor("/reports")).toBe("/auth");
  });
});
