/**
 * Field checks for the Log in, Sign up and password pages. Each returns the
 * message to show under the field, or undefined when the value is fine.
 * Wording from GLOBICULUM_AUTH_PAGES_V2.md (placeholder copy, to be confirmed
 * with the product owner).
 */
import { z } from "zod";

const emailSchema = z.string().trim().email().max(255);

export function emailProblem(email: string): string | undefined {
  return emailSchema.safeParse(email).success ? undefined : "Enter a valid email address.";
}

// Kept from the previous sign-up form: strip HTML, block SQL-like input but
// allow apostrophes in names (O'Reilly, D'Angelo).
const SQL_PATTERN =
  /(--|;|"|\\)|(('\s*(or|and|union|select|drop|delete|insert|update|exec)\s)|((drop|delete|insert|update|select|union|exec|execute)\s))/i;

/** The name as it is saved: HTML tags removed, trimmed. */
export function cleanName(name: string): string {
  return name.replace(/<[^>]*>/g, "").trim();
}

export function nameProblem(name: string): string | undefined {
  const clean = cleanName(name);
  if (clean.length < 2) return "Enter your full name.";
  if (clean.length > 100) return "Use 100 characters or fewer.";
  if (SQL_PATTERN.test(clean)) return "This name contains characters we can't accept.";
  return undefined;
}

export function loginPasswordProblem(password: string): string | undefined {
  return password ? undefined : "Enter your password.";
}

export function confirmProblem(password: string, confirm: string): string | undefined {
  if (!confirm) return "Re-enter your password.";
  return confirm === password ? undefined : "Passwords don't match.";
}

export function termsProblem(agreed: boolean): string | undefined {
  return agreed ? undefined : "Agree to continue.";
}
