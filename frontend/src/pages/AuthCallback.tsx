import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Loader2, MailCheck, AlertTriangle } from "lucide-react";

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
  | { status: "success"; message: string }
  | { status: "error"; message: string };

// Supabase's raw error strings are developer-facing. Map the ones users
// actually hit onto something actionable, and fall back to the original text
// so we never swallow an unexpected failure.
const friendlyError = (code: string | null, description: string | null): string => {
  const raw = (description || "").replace(/\+/g, " ");
  switch (code) {
    case "otp_expired":
      return "This confirmation link has expired. Request a new one from the sign-in page and open it within the expiry window.";
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
        finish({ status: "error", message: friendlyError(errorCode, errorDescription) });
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
        finish({ status: "success", message: "Your email is confirmed and you're signed in." });
        return;
      }

      // 3. PKCE flow. `detectSessionInUrl` is enabled on the client, so the SDK
      //    is very likely already exchanging the code as this effect runs.
      //    Racing it with our own exchangeCodeForSession() would make one of the
      //    two fail (the verifier is single-use), so wait for the SDK first and
      //    only exchange manually if nothing materialises.
      const { data: existing } = await supabase.auth.getSession();
      if (existing.session) {
        finish({ status: "success", message: "Your email is confirmed and you're signed in." });
        return;
      }

      const code = query.get("code");
      if (!code) {
        finish({
          status: "error",
          message: "This link is missing its confirmation token. Please request a new confirmation email.",
        });
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
        finish({ status: "success", message: "Your email is confirmed and you're signed in." });
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        // The dominant real-world cause: the link was opened in a different
        // browser/device than the one that signed up, so the PKCE code verifier
        // isn't in this browser's storage. The account IS confirmed at this
        // point — the user just has to sign in manually.
        finish({
          status: "error",
          message:
            "Your email may already be confirmed, but we couldn't sign you in automatically — this happens when the link is opened on a different device or browser than the one you signed up on. Please sign in with your email and password.",
        });
        return;
      }

      finish({ status: "success", message: "Your email is confirmed and you're signed in." });
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-lg">
        {state.status === "working" && (
          <CardContent role="status" aria-live="polite" className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" aria-hidden="true" />
            <p className="text-muted-foreground">Confirming your email…</p>
          </CardContent>
        )}

        {state.status === "success" && (
          <>
            <CardHeader className="text-center space-y-2">
              <MailCheck className="h-10 w-10 text-primary mx-auto" aria-hidden="true" />
              <h1 className="text-2xl font-bold leading-none tracking-tight">Email confirmed</h1>
              <CardDescription>{state.message}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => navigate("/dashboard", { replace: true })}>
                Continue to Dashboard
              </Button>
            </CardContent>
          </>
        )}

        {state.status === "error" && (
          <>
            <CardHeader className="text-center space-y-2">
              <AlertTriangle className="h-10 w-10 text-destructive mx-auto" aria-hidden="true" />
              <h1 className="text-2xl font-bold leading-none tracking-tight">Confirmation failed</h1>
              <CardDescription role="alert">{state.message}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => navigate("/auth", { replace: true })}>
                Back to Sign In
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
};

export default AuthCallback;
