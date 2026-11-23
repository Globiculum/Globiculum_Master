import { describe, expect, it } from "vitest";
import { loginPath, safeFormPath, signInPathFor, signupPath } from "./afterSignIn";

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
  it("opens Sign up from a form, with the form to come back to", () => {
    expect(signInPathFor("/begin-journey")).toBe("/signup?next=%2Fbegin-journey");
  });

  it("opens plain Log in from any other page", () => {
    expect(signInPathFor("/reports")).toBe("/login");
  });
});

describe("loginPath and signupPath", () => {
  it("keep the form to come back to when switching between the two pages", () => {
    expect(loginPath("/student-assessment")).toBe("/login?next=%2Fstudent-assessment");
    expect(signupPath("/begin-journey")).toBe("/signup?next=%2Fbegin-journey");
  });

  it("drop anything that is not a form page", () => {
    expect(loginPath("https://evil.example")).toBe("/login");
    expect(signupPath(null)).toBe("/signup");
  });
});
