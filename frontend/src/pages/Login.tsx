import { useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "@/components/auth/AuthLayout";
import { Checkbox, Divider, FormAlert, GoogleButton, PasswordField, PrimaryButton, SecondaryButton, TextField } from "@/components/auth/AuthFormParts";
import { resendConfirmation, signInWithGoogle, signInWithPassword, type AuthError } from "@/lib/authClient";
import { emailProblem, loginPasswordProblem } from "@/lib/authValidation";
import { safeFormPath, signupPath } from "@/lib/afterSignIn";

type Field = "email" | "password";

/** Plain wording for a failed log in. Never says whether the email has an account. */
function loginErrorText(error: AuthError): string {
  switch (error.code) {
    case "invalid_credentials":
      return "Email or password is incorrect.";
    case "rate_limited":
      return "Too many attempts. Wait a minute, then try again.";
    case "network":
      return "We couldn't reach Globiculum. Check your connection and try again.";
    case "provider_disabled":
      return "Google sign-in isn't switched on yet. Please log in with your email and password for now.";
    default:
      return error.message;
  }
}

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // Set when sent here from an assessment form: go straight back to it.
  const formPath = safeFormPath(searchParams.get("next"));
  const passwordChanged = (location.state as { passwordChanged?: boolean } | null)?.passwordChanged === true;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [resend, setResend] = useState<"idle" | "sending" | "sent">("idle");

  const refs = { email: useRef<HTMLInputElement>(null), password: useRef<HTMLInputElement>(null) };
  const problem = { email: emailProblem, password: loginPasswordProblem };

  // Checked when a filled field is left, and on every change once it shows an error.
  const validate = (field: Field, value: string) => setErrors((prev) => ({ ...prev, [field]: problem[field](value) }));
  const change = (field: Field, value: string, set: (value: string) => void) => {
    set(value);
    if (errors[field]) validate(field, value);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const found: Partial<Record<Field, string>> = { email: emailProblem(email), password: loginPasswordProblem(password) };
    setErrors(found);
    const firstInvalid = (["email", "password"] as Field[]).find((field) => found[field]);
    if (firstInvalid) {
      refs[firstInvalid].current?.focus();
      return;
    }

    setBusy(true);
    setServerError(null);
    setUnconfirmedEmail(null);
    setResend("idle");
    const { error } = await signInWithPassword(email.trim(), password, { remember });
    setBusy(false);

    if (!error) {
      navigate(formPath ?? "/", { replace: true });
      return;
    }
    if (error.code === "email_not_confirmed") {
      setUnconfirmedEmail(email.trim());
      setServerError("This email address hasn't been confirmed yet. Open the link we emailed you, or send a new one.");
      return;
    }
    setServerError(loginErrorText(error));
  };

  const handleResend = async () => {
    if (!unconfirmedEmail) return;
    setResend("sending");
    const { error } = await resendConfirmation(unconfirmedEmail);
    if (error) {
      setResend("idle");
      setServerError(error.code === "rate_limited" ? "Please wait a minute before asking for another email." : error.message);
      return;
    }
    setResend("sent");
  };

  const handleGoogle = async () => {
    setGoogleBusy(true);
    setServerError(null);
    const { error } = await signInWithGoogle({ formPath });
    // On success the browser is already leaving for Google.
    if (error) {
      setGoogleBusy(false);
      setServerError(loginErrorText(error));
    }
  };

  return (
    <AuthLayout
      pageTitle="Log in | Globiculum"
      title={
        <>
          Welcome back <span aria-hidden="true">👋</span>
        </>
      }
      subtitle="Log in to continue learning with Globiculum."
      footer={
        <>
          New to Globiculum?{" "}
          <Link to={signupPath(formPath)} className="ga-link">
            Create an account
          </Link>
        </>
      }
    >
      {passwordChanged && (
        <p role="status" className="ga-success">
          Your password has been changed. Log in with your new password.
        </p>
      )}
      <form className="ga-form" onSubmit={handleSubmit} noValidate>
        <TextField
          ref={refs.email}
          id="signin-email"
          label="Email address"
          icon="mail"
          type="email"
          autoComplete="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => change("email", e.target.value, setEmail)}
          onBlur={() => email && validate("email", email)}
          error={errors.email}
          disabled={busy}
        />
        <PasswordField
          ref={refs.password}
          id="signin-password"
          label="Password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => change("password", e.target.value, setPassword)}
          onBlur={() => password && validate("password", password)}
          error={errors.password}
          disabled={busy}
          below={
            <Link to="/forgot-password" className="ga-link ga-forgot">
              Forgot password?
            </Link>
          }
        />
        <Checkbox id="keep-signed-in" checked={remember} onChange={(e) => setRemember(e.target.checked)} disabled={busy}>
          Keep me signed in
        </Checkbox>

        {serverError && (
          <FormAlert>
            {serverError}
            {resend === "sent" && <> We've sent a new link to {unconfirmedEmail}.</>}
          </FormAlert>
        )}
        {unconfirmedEmail && resend !== "sent" && (
          <SecondaryButton busy={resend === "sending"} onClick={handleResend}>
            {resend === "sending" ? "Sending..." : "Resend confirmation email"}
          </SecondaryButton>
        )}

        <PrimaryButton busy={busy}>{busy ? "Logging in..." : "Log in"}</PrimaryButton>

        <Divider />
        <GoogleButton busy={googleBusy} onClick={handleGoogle} />
      </form>
    </AuthLayout>
  );
};

export default Login;
