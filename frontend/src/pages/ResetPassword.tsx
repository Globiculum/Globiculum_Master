import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AuthLayout from "@/components/auth/AuthLayout";
import { FormAlert, PasswordField, PrimaryButton, Spinner, StrengthMeter } from "@/components/auth/AuthFormParts";
import { AlertIcon } from "@/components/auth/AuthIcons";
import { signOut, updatePassword } from "@/lib/authClient";
import { confirmProblem } from "@/lib/authValidation";
import { newPasswordProblem } from "@/lib/passwordRules";

type LinkState = "checking" | "valid" | "invalid";

/** The page a password reset email links to: set a new password. */
const ResetPassword = () => {
  const navigate = useNavigate();
  const [linkState, setLinkState] = useState<LinkState>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    let settled = false;

    // The recovery link carries a PKCE code that the SDK exchanges for a session
    // ASYNCHRONOUSLY (detectSessionInUrl). Calling getSession() once, immediately,
    // raced that exchange and reported "Link Expired" on a perfectly valid link
    // whenever the exchange hadn't finished yet. Listen for the session instead,
    // and only declare failure after the exchange has had time to complete.
    const settle = (valid: boolean) => {
      if (!active || settled) return;
      settled = true;
      setLinkState(valid ? "valid" : "invalid");
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) settle(true);
    });

    // Covers the case where the session already exists (exchange finished before
    // this effect ran, or the user reloaded the page).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) settle(true);
    });

    // Nothing arrived in time — the link really is invalid/expired/already used.
    const timer = setTimeout(() => settle(false), 3000);

    return () => {
      active = false;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const found = { password: newPasswordProblem(password), confirm: confirmProblem(password, confirm) };
    setErrors(found);
    if (found.password) return passwordRef.current?.focus();
    if (found.confirm) return confirmRef.current?.focus();

    setBusy(true);
    setServerError(null);
    const { error } = await updatePassword(password);
    if (error) {
      setBusy(false);
      if (error.code === "weak_password") {
        setErrors({ password: error.message });
        passwordRef.current?.focus();
      } else {
        setServerError(error.code === "network" ? "We couldn't reach Globiculum. Check your connection and try again." : error.message);
      }
      return;
    }
    // Log in again with the new password (the page shows that it was changed).
    await signOut();
    navigate("/login", { replace: true, state: { passwordChanged: true } });
  };

  if (linkState === "checking") {
    return (
      <AuthLayout pageTitle="Reset your password | Globiculum" title="Checking your link" centered>
        <div role="status" aria-live="polite" className="ga-stack" style={{ alignItems: "center" }}>
          <Spinner large />
          <p className="ga-text">This takes a moment.</p>
        </div>
      </AuthLayout>
    );
  }

  if (linkState === "invalid") {
    return (
      <AuthLayout
        pageTitle="Link expired | Globiculum"
        title="This link has expired"
        centered
        icon={
          <div className="ga-status-icon ga-status-icon--error">
            <AlertIcon />
          </div>
        }
        footer={
          <Link to="/login" className="ga-link">
            Back to log in
          </Link>
        }
      >
        <p className="ga-text">
          Password reset links work once and expire after a while. Ask for a new one, then open it on this device.
        </p>
        <Link to="/forgot-password" className="ga-btn">
          Send me a new link
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      pageTitle="Set a new password | Globiculum"
      title="Set a new password"
      footer={
        <Link to="/login" className="ga-link">
          Back to log in
        </Link>
      }
    >
      <form className="ga-form" onSubmit={handleSubmit} noValidate>
        <PasswordField
          ref={passwordRef}
          id="new-password"
          label="New password"
          autoComplete="new-password"
          placeholder="Create a password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors((prev) => ({ ...prev, password: newPasswordProblem(e.target.value) }));
          }}
          onBlur={() => password && setErrors((prev) => ({ ...prev, password: newPasswordProblem(password) }))}
          error={errors.password}
          describedBy="new-password-strength"
          disabled={busy}
          meter={<StrengthMeter id="new-password-strength" password={password} />}
        />
        <PasswordField
          ref={confirmRef}
          id="confirm-password"
          label="Confirm new password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            if (errors.confirm) setErrors((prev) => ({ ...prev, confirm: confirmProblem(password, e.target.value) }));
          }}
          onBlur={() => confirm && setErrors((prev) => ({ ...prev, confirm: confirmProblem(password, confirm) }))}
          error={errors.confirm}
          disabled={busy}
        />
        {serverError && <FormAlert>{serverError}</FormAlert>}
        <PrimaryButton busy={busy}>{busy ? "Saving..." : "Save new password"}</PrimaryButton>
      </form>
    </AuthLayout>
  );
};

export default ResetPassword;
