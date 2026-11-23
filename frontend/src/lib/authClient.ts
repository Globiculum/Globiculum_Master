/**
 * The only place the Log in / Sign up / password pages talk to the auth
 * provider (Supabase Auth today; a move is still being decided, so the pages
 * call these functions instead of Supabase directly).
 *
 * Every function resolves to `{ error }` (null on success) with a small set of
 * error codes the pages turn into plain messages. Passwords are never logged.
 */
import { supabase, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/integrations/supabase/client";
import { AFTER_SIGN_UP_KEY } from "@/lib/afterSignIn";
import { keepNextSession } from "@/lib/authSessionStorage";
import { toAuthError, type AuthError } from "@/lib/authErrors";

export type { AuthError, AuthErrorCode } from "@/lib/authErrors";

export interface AuthResult {
  error: AuthError | null;
}

// Every emailed link and the Google redirect land on the callback page, the
// only page that exchanges a link's code for a session.
const callbackUrl = (params?: Record<string, string>) => {
  const url = new URL("/auth/callback", window.location.origin);
  Object.entries(params ?? {}).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
};

/** `remember: false` keeps the login for this browser tab only. */
export async function signInWithPassword(email: string, password: string, { remember = true } = {}): Promise<AuthResult> {
  keepNextSession(remember);
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? toAuthError(error) : null };
  } catch (error) {
    return { error: toAuthError(error) };
  } finally {
    keepNextSession(true);
  }
}

export interface SignUpResult extends AuthResult {
  /** The account exists but its email must be confirmed before signing in. */
  needsConfirmation: boolean;
}

export async function signUpWithPassword({
  name,
  email,
  password,
  formPath,
  acceptedTermsAt,
}: {
  name: string;
  email: string;
  password: string;
  /** The form to open once the emailed link confirms the account. */
  formPath?: string | null;
  /** When the Terms of Service and Privacy Policy box was ticked (ISO time). */
  acceptedTermsAt: string;
}): Promise<SignUpResult> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: callbackUrl(),
        data: {
          full_name: name,
          accepted_terms_at: acceptedTermsAt,
          ...(formPath ? { [AFTER_SIGN_UP_KEY]: formPath } : {}),
        },
      },
    });
    if (error) return { error: toAuthError(error), needsConfirmation: false };
    // Supabase does not report an existing address as an error (so emails
    // can't be enumerated): it returns a user with no identities and no session.
    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      return { error: { code: "already_registered", message: "User already registered" }, needsConfirmation: false };
    }
    return { error: null, needsConfirmation: !data.session };
  } catch (error) {
    return { error: toAuthError(error), needsConfirmation: false };
  }
}

let googleOn: Promise<boolean> | null = null;

/**
 * Whether Google sign-in is switched on in Supabase (Authentication >
 * Providers > Google), from the project's public auth settings. Checked
 * before redirecting: with it off, Supabase would show the visitor a raw
 * error page instead of our message.
 */
export function isGoogleSignInOn(): Promise<boolean> {
  googleOn ??= fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_PUBLISHABLE_KEY } })
    .then(async (res) => (res.ok ? (await res.json())?.external?.google === true : false))
    .catch(() => {
      googleOn = null; // try again next time (e.g. after a network blip)
      return false;
    });
  return googleOn;
}

/**
 * Starts the Google redirect; the browser leaves the page when it succeeds.
 * Google creates the account on first use, so Sign up passes the time its
 * Terms box was ticked (`acceptedTermsAt`); the callback page records it, or
 * asks for the agreement when there is none (AuthCallback.tsx).
 */
export async function signInWithGoogle({
  formPath,
  acceptedTermsAt,
}: { formPath?: string | null; acceptedTermsAt?: string } = {}): Promise<AuthResult> {
  if (!(await isGoogleSignInOn())) {
    return { error: { code: "provider_disabled", message: "Google sign-in is not switched on." } };
  }
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl({
          via: "google",
          ...(formPath ? { next: formPath } : {}),
          ...(acceptedTermsAt ? { terms: acceptedTermsAt } : {}),
        }),
      },
    });
    return { error: error ? toAuthError(error) : null };
  } catch (error) {
    return { error: toAuthError(error) };
  }
}

/** Saves when the signed-in user agreed to the Terms of Service and Privacy Policy. */
export async function recordTermsAgreement(acceptedTermsAt: string): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.updateUser({ data: { accepted_terms_at: acceptedTermsAt } });
    return { error: error ? toAuthError(error) : null };
  } catch (error) {
    return { error: toAuthError(error) };
  }
}

export async function sendPasswordReset(email: string): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error ? toAuthError(error) : null };
  } catch (error) {
    return { error: toAuthError(error) };
  }
}

export async function resendConfirmation(email: string): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: callbackUrl() } });
    return { error: error ? toAuthError(error) : null };
  } catch (error) {
    return { error: toAuthError(error) };
  }
}

/** Sets a new password for the signed-in user (the reset link signs them in). */
export async function updatePassword(password: string): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error ? toAuthError(error) : null };
  } catch (error) {
    return { error: toAuthError(error) };
  }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
