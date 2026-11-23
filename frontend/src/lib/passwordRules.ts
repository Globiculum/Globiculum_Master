/**
 * Password policy for new passwords (Sign up, Reset password), unchanged from
 * before the Version 2 redesign: 8-100 characters with a capital letter, a
 * small letter, a number and a symbol. The strength meter counts the same four
 * rules, so "Strong" means the password will be accepted.
 */

export const PASSWORD_RULE_MESSAGE =
  "Use 8 or more characters, with a capital letter, a small letter, a number and a symbol.";

export const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong"] as const;

function checks(password: string) {
  return [
    password.length >= 8,
    /[A-Z]/.test(password) && /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
}

/** 0 while empty, then 1 (Weak) to 4 (Strong): how many of the four rules are met. */
export function passwordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  if (!password) return 0;
  const met = checks(password).filter(Boolean).length;
  return Math.max(1, met) as 1 | 2 | 3 | 4;
}

/** The message to show under a new-password field, or undefined when it is allowed. */
export function newPasswordProblem(password: string): string | undefined {
  if (!password) return "Create a password.";
  if (password.length > 100) return "Use 100 characters or fewer.";
  return checks(password).every(Boolean) ? undefined : PASSWORD_RULE_MESSAGE;
}
