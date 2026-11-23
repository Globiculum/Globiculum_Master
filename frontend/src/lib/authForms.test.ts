import { describe, expect, it } from "vitest";
import { newPasswordProblem, passwordStrength, PASSWORD_RULE_MESSAGE, STRENGTH_LABELS } from "./passwordRules";
import { cleanName, confirmProblem, emailProblem, loginPasswordProblem, nameProblem, termsProblem } from "./authValidation";
import { toAuthError } from "./authErrors";

describe("password strength meter", () => {
  it("is hidden (0) while empty, then counts the four rules", () => {
    expect(passwordStrength("")).toBe(0);
    expect(STRENGTH_LABELS[passwordStrength("abc")]).toBe("Weak");
    expect(STRENGTH_LABELS[passwordStrength("abcdefgh")]).toBe("Weak");
    expect(STRENGTH_LABELS[passwordStrength("abcdefg1")]).toBe("Fair");
    expect(STRENGTH_LABELS[passwordStrength("Abcdefg1")]).toBe("Good");
    expect(STRENGTH_LABELS[passwordStrength("Abcdefg1!")]).toBe("Strong");
  });

  it("reads Strong exactly when the password is allowed", () => {
    for (const pw of ["Abcdefg1!", "Globiculum26!", "abc", "Abcdefg1", "ABCDEFG1!"]) {
      expect(passwordStrength(pw) === 4).toBe(newPasswordProblem(pw) === undefined);
    }
  });
});

describe("new password rules", () => {
  it("explain what is missing", () => {
    expect(newPasswordProblem("")).toBe("Create a password.");
    expect(newPasswordProblem("short")).toBe(PASSWORD_RULE_MESSAGE);
    expect(newPasswordProblem(`Aa1!${"x".repeat(100)}`)).toBe("Use 100 characters or fewer.");
    expect(newPasswordProblem("Globiculum26!")).toBeUndefined();
  });
});

describe("field checks", () => {
  it("email", () => {
    expect(emailProblem("")).toBe("Enter a valid email address.");
    expect(emailProblem("asha@")).toBe("Enter a valid email address.");
    expect(emailProblem(" asha.rao@example.com ")).toBeUndefined();
  });

  it("full name: trimmed, HTML removed, apostrophes allowed", () => {
    expect(nameProblem("   ")).toBe("Enter your full name.");
    expect(nameProblem("Siobhan O'Reilly")).toBeUndefined();
    expect(nameProblem("x; drop table")).toBe("This name contains characters we can't accept.");
    expect(cleanName("  <b>Asha</b> Rao ")).toBe("Asha Rao");
  });

  it("log in password, confirm password and terms", () => {
    expect(loginPasswordProblem("")).toBe("Enter your password.");
    expect(loginPasswordProblem("anything")).toBeUndefined();
    expect(confirmProblem("Abc12345!", "")).toBe("Re-enter your password.");
    expect(confirmProblem("Abc12345!", "Abc12345?")).toBe("Passwords don't match.");
    expect(confirmProblem("Abc12345!", "Abc12345!")).toBeUndefined();
    expect(termsProblem(false)).toBe("Agree to continue.");
    expect(termsProblem(true)).toBeUndefined();
  });
});

describe("toAuthError", () => {
  it("turns Supabase errors into the codes the pages use", () => {
    expect(toAuthError({ code: "invalid_credentials", message: "Invalid login credentials" }).code).toBe("invalid_credentials");
    expect(toAuthError({ message: "Email not confirmed" }).code).toBe("email_not_confirmed");
    expect(toAuthError({ code: "user_already_exists", message: "User already registered" }).code).toBe("already_registered");
    expect(toAuthError({ status: 429, message: "For security purposes, you can only request this after 60 seconds." }).code).toBe("rate_limited");
    expect(toAuthError({ code: "validation_failed", message: "Unsupported provider: provider is not enabled" }).code).toBe("provider_disabled");
    expect(toAuthError({ name: "AuthRetryableFetchError", message: "Failed to fetch" }).code).toBe("network");
    expect(toAuthError(undefined).code).toBe("unknown");
  });
});
