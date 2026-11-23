import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AFTER_SIGN_UP_KEY, safeFormPath } from "@/lib/afterSignIn";
import AuthLayout from "@/components/auth/AuthLayout";
import { Checkbox, FormAlert, PrimaryButton, Spinner } from "@/components/auth/AuthFormParts";
import { AlertIcon, MailCheckIcon } from "@/components/auth/AuthIcons";
import { recordTermsAgreement, signOut } from "@/lib/authClient";
import { termsProblem } from "@/lib/authValidation";

/**
 * After Google, when the account has no Terms agreement on record (e.g. a new
 * account made from the Log in page): agree, or cancel and log out.
 */
const GoogleConsent = ({ formPath }: { formPath: string | null }) => {
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleContinue = async () => {
    const problem = termsProblem(agreed);
    setError(problem);
    if (problem) {
      document.getElementById("google-terms")?.focus();
      return;
    }
    setBusy(true);
    setServerError(null);
    const { error: saveError } = await recordTermsAgreement(new Date().toISOString());
    if (saveError) {
      setBusy(false);
      setServerError(saveError.code === "network" ? "We couldn't reach Globiculum. Check your connection and try again." : saveError.message);
      return;
    }
    navigate(formPath ?? "/", { replace: true });
  };

  return (
    <AuthLayout
      pageTitle="One more step | Globiculum"
      title="One more step"
      footer={
        <button
          type="button"
          className="ga-link ga-link-button"
          onClick={async () => {
            await signOut();
            navigate("/login", { replace: true });
          }}
        >
          Cancel and log out
        </button>
      }
    >
      <p className="ga-text">You're signed in with Google. Before you continue, please agree to our terms.</p>
      <div className="ga-form">
        <Checkbox
          id="google-terms"
          small
          checked={agreed}
          onChange={(e) => {
            setAgreed(e.target.checked);
            if (error) setError(termsProblem(e.target.checked));
          }}
          error={error}
          disabled={busy}
        >
          I agree to the{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="ga-link">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="ga-link">
            Privacy Policy
          </a>
        </Checkbox>
        {serverError && <FormAlert>{serverError}</FormAlert>}
        <PrimaryButton type="button" busy={busy} onClick={handleContinue}>
          {busy ? "Saving..." : "Continue"}
        </PrimaryButton>
      </div>
    </AuthLayout>
  );
};

// AuthCallback — the landing page for every emailed auth link (signup
// confirmation, email-change confirmation, magic link, invite).
//
// Previously `emailRedirectTo` pointed at "/" and nothing on that page knew
// anything about auth links, so two things went wrong:
//   1. Supabase reports failed links by appending `error`/`error_description`
//      to the redirect URL (in the hash for the implicit flow, in the query
//      string for PKCE). Nothing read those, so an expired or already-used
//      link silently dumped the user on the landing page with no explanation.
//   2. supabase-js v2 defaults to flowType: 'pkce', so a successful link
//      arrives as `?code=<uuid>` that still has to be exchanged for a session.
//      With no page watching for that, the user was never actually signed in.
//
// This page handles both, plus the `token_hash` variant that Supabase's newer
// email templates use, and always ends with a definitive success or a readable
// error instead of an ambiguous blank screen.

type CallbackState =
  | { status: "working" }
  // formPath: the assessment form the account was created from (Signup.tsx).
  | { status: "success"; message: string; formPath?: string | null }
  // Signed in with Google, but no Terms agreement on record yet.
  | { status: "consent"; formPath: string | null }
  | { status: "error"; message: string; viaGoogle?: boolean };

/** A Terms agreement time passed from Sign up (?terms=), if it is a valid recent ISO time. */
function termsTimeFrom(value: string | null): string | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) || Math.abs(Date.now() - time) > 60 * 60 * 1000 ? null : new Date(time).toISOString();
}

// Supabase's raw error strings are developer-facing. Map the ones users
// actually hit onto something actionable, and fall back to the original text
// so we never swallow an unexpected failure.
const friendlyError = (code: string | null, description: string | null): string => {
  const raw = (description || "").replace(/\+/g, " ");
  switch (code) {
    case "otp_expired":
      return "This confirmation link has expired. Log in with your email and password and we'll offer to send a new one.";
    case "access_denied":
      return "This confirmation link is no longer valid. It may have already been used — try signing in, or request a new link.";
    default:
      return raw || "We couldn't confirm your email with that link. Please request a new one.";
  }
};

const AuthCallback = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<CallbackState>({ status: "working" });

  useEffect(() => {
    let active = true;
    const finish = (next: CallbackState) => {
      if (active) setState(next);
    };
    // "Continue with Google" comes back here too (lib/authClient.ts), with the
    // form to open in `next` and, from Sign up, the time its Terms box was
    // ticked in `terms`. No email to confirm, so it goes straight on, once
    // there is a Terms agreement on record: Google creates the account on
    // first use, also from the Log in page, where nobody has agreed yet.
    const startUrl = new URL(window.location.href);
    const viaGoogle = startUrl.searchParams.get("via") === "google";

    const succeedWithGoogle = async () => {
      const formPath = safeFormPath(startUrl.searchParams.get("next"));
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user.user_metadata?.accepted_terms_at) {
        const ticked = termsTimeFrom(startUrl.searchParams.get("terms"));
        if (!ticked || (await recordTermsAgreement(ticked)).error) {
          finish({ status: "consent", formPath });
          return;
        }
      }
      if (active) navigate(formPath ?? "/", { replace: true });
    };

    // Signed in: offer the form the account was created from, if any.
    const succeed = async () => {
      if (viaGoogle) return succeedWithGoogle();
      const { data } = await supabase.auth.getSession();
      const formPath = safeFormPath(data.session?.user.user_metadata?.[AFTER_SIGN_UP_KEY]);
      finish({ status: "success", message: "Your email is confirmed and you're logged in.", formPath });
    };

    const run = async () => {
      const url = new URL(window.location.href);
      const query = url.searchParams;
      // The implicit flow returns everything after '#', so it has to be parsed
      // separately from the query string.
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));

      const errorCode = query.get("error_code") || hash.get("error_code") || query.get("error") || hash.get("error");
      const errorDescription = query.get("error_description") || hash.get("error_description");

      // 1. An explicit error always wins — never try to exchange a failed link.
      if (errorCode) {
        finish(
          viaGoogle
            ? {
                status: "error",
                viaGoogle,
                message:
                  errorCode === "access_denied"
                    ? "Google sign-in was cancelled. Try again, or use your email address and password."
                    : "Google sign-in didn't finish. Try again, or use your email address and password.",
              }
            : { status: "error", message: friendlyError(errorCode, errorDescription) }
        );
        return;
      }

      // 2. token_hash flow (Supabase's newer default email template).
      const tokenHash = query.get("token_hash") || hash.get("token_hash");
      const type = (query.get("type") || hash.get("type")) as
        | "signup"
        | "email_change"
        | "recovery"
        | "invite"
        | "magiclink"
        | null;

      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (error) {
          finish({ status: "error", message: friendlyError(null, error.message) });
          return;
        }
        // A recovery link must land on the password form, not the dashboard.
        if (type === "recovery") {
          navigate("/reset-password", { replace: true });
          return;
        }
        await succeed();
        return;
      }

      // 3. PKCE flow. `detectSessionInUrl` is enabled on the client, so the SDK
      //    is very likely already exchanging the code as this effect runs.
      //    Racing it with our own exchangeCodeForSession() would make one of the
      //    two fail (the verifier is single-use), so wait for the SDK first and
      //    only exchange manually if nothing materialises.
      const { data: existing } = await supabase.auth.getSession();
      if (existing.session) {
        await succeed();
        return;
      }

      const code = query.get("code");
      if (!code) {
        finish(
          viaGoogle
            ? { status: "error", viaGoogle, message: "Google sign-in didn't finish. Try again, or use your email address and password." }
            : { status: "error", message: "This link is missing its confirmation token. Please request a new confirmation email." }
        );
        return;
      }

      // Give the SDK a short window to complete its own exchange.
      const sdkSession = await new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => {
          subscription.unsubscribe();
          resolve(false);
        }, 3000);
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session) {
            clearTimeout(timer);
            subscription.unsubscribe();
            resolve(true);
          }
        });
      });

      if (sdkSession) {
        await succeed();
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error && viaGoogle) {
        finish({ status: "error", viaGoogle, message: "Google sign-in didn't finish. Try again, or use your email address and password." });
        return;
      }
      if (error) {
        // The dominant real-world cause: the link was opened in a different
        // browser/device than the one that signed up, so the PKCE code verifier
        // isn't in this browser's storage. The account IS confirmed at this
        // point — the user just has to sign in manually.
        finish({
          status: "error",
          message:
            "Your email may already be confirmed, but we couldn't log you in automatically. This happens when the link is opened on a different device or browser from the one you signed up on. Please log in with your email and password.",
        });
        return;
      }

      await succeed();
    };

    run().catch((err: unknown) => {
      finish({
        status: "error",
        message: err instanceof Error ? err.message : "Something went wrong confirming your email.",
      });
    });

    return () => {
      active = false;
    };
  }, [navigate]);

  if (state.status === "working") {
    const fromGoogle = new URLSearchParams(window.location.search).get("via") === "google";
    return (
      <AuthLayout
        pageTitle={fromGoogle ? "Signing you in | Globiculum" : "Confirming your email | Globiculum"}
        title={fromGoogle ? "Signing you in" : "Confirming your email"}
        centered
      >
        <div role="status" aria-live="polite" className="ga-stack" style={{ alignItems: "center" }}>
          <Spinner large />
          <p className="ga-text">This takes a moment.</p>
        </div>
      </AuthLayout>
    );
  }

  if (state.status === "success") {
    return (
      <AuthLayout
        pageTitle="Email confirmed | Globiculum"
        title="Email confirmed"
        centered
        icon={
          <div className="ga-status-icon">
            <MailCheckIcon />
          </div>
        }
      >
        <p className="ga-text">{state.message}</p>
        <PrimaryButton type="button" onClick={() => navigate(state.formPath ?? "/", { replace: true })}>
          {state.formPath ? "Continue to the form" : "Continue to home"}
        </PrimaryButton>
      </AuthLayout>
    );
  }

  if (state.status === "consent") return <GoogleConsent formPath={state.formPath} />;

  return (
    <AuthLayout
      pageTitle={state.viaGoogle ? "Google sign-in | Globiculum" : "Link not confirmed | Globiculum"}
      title={state.viaGoogle ? "Google sign-in didn't finish" : "We couldn't confirm your email"}
      centered
      icon={
        <div className="ga-status-icon ga-status-icon--error">
          <AlertIcon />
        </div>
      }
      footer={
        <>
          No account yet?{" "}
          <Link to="/signup" className="ga-link">
            Create an account
          </Link>
        </>
      }
    >
      <p role="alert" className="ga-text">
        {state.message}
      </p>
      <Link to="/login" replace className="ga-btn">
        Go to log in
      </Link>
    </AuthLayout>
  );
};

export default AuthCallback;
