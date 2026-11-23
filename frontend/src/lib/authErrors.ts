/** Error codes the Log in / Sign up / password pages turn into plain messages. */
export type AuthErrorCode =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "already_registered"
  | "weak_password"
  | "rate_limited"
  | "provider_disabled"
  | "network"
  | "unknown";

export interface AuthError {
  code: AuthErrorCode;
  message: string;
}

/** Maps an auth provider (Supabase) error onto one of the codes above. */
export function toAuthError(error: unknown): AuthError {
  const e = (error ?? {}) as { code?: string; status?: number; message?: string; name?: string };
  const message = e.message || "Something went wrong. Please try again.";
  const code = e.code ?? "";
  if (code === "invalid_credentials" || /invalid login credentials/i.test(message)) return { code: "invalid_credentials", message };
  if (code === "email_not_confirmed" || /email not confirmed/i.test(message)) return { code: "email_not_confirmed", message };
  if (code === "user_already_exists" || code === "email_exists" || /already registered/i.test(message)) return { code: "already_registered", message };
  if (code === "weak_password") return { code: "weak_password", message };
  if (code === "provider_disabled" || /provider is not enabled/i.test(message)) return { code: "provider_disabled", message };
  if (e.status === 429 || /rate limit|too many/i.test(`${code} ${message}`)) return { code: "rate_limited", message };
  if (e.name === "AuthRetryableFetchError" || /failed to fetch|network/i.test(message)) return { code: "network", message };
  return { code: "unknown", message };
}
