/**
 * Where to send someone after they sign in, when they were sent to sign in
 * from an assessment form ("Get Free Report" while signed out). Only the two
 * form pages are allowed, so a crafted /auth?next=... link can't send people
 * to another site or page.
 *
 * A new account confirms its email through a link that usually opens in a new
 * tab, so the path can't wait in this tab's storage (and the app writes
 * nothing to localStorage, see childDataStorage.ts). It is sent with the
 * sign-up instead, in the account's own sign-up metadata (AFTER_SIGN_UP_KEY),
 * and read back by the confirmation page (AuthCallback.tsx).
 */

const FORM_PATHS = ["/begin-journey", "/student-assessment"];

/** Sign-up metadata key holding the form to open once the email is confirmed. */
export const AFTER_SIGN_UP_KEY = "after_sign_up";

/** The path if it is one of the form pages (a query string is kept), else null. */
export function safeFormPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return null;
  let url: URL;
  try {
    url = new URL(value, "https://placeholder.invalid");
  } catch {
    return null;
  }
  if (url.origin !== "https://placeholder.invalid" || !FORM_PATHS.includes(url.pathname)) return null;
  return url.pathname + url.search;
}

/** The sign-in page link that comes back to `path` afterwards. */
export function signInPathFor(path: string): string {
  const next = safeFormPath(path);
  return next ? `/auth?next=${encodeURIComponent(next)}` : "/auth";
}
