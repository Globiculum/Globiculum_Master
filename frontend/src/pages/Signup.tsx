import { useRef, useState, type FormEvent, type RefObject } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "@/components/auth/AuthLayout";
import {
  Checkbox,
  Divider,
  FormAlert,
  GoogleButton,
  PasswordField,
  PrimaryButton,
  SecondaryButton,
  StrengthMeter,
  TextField,
} from "@/components/auth/AuthFormParts";
import { MailCheckIcon } from "@/components/auth/AuthIcons";
import { resendConfirmation, signInWithGoogle, signUpWithPassword, type AuthError } from "@/lib/authClient";
import { cleanName, confirmProblem, emailProblem, nameProblem, termsProblem } from "@/lib/authValidation";
import { newPasswordProblem } from "@/lib/passwordRules";
import { loginPath, safeFormPath } from "@/lib/afterSignIn";

type Field = "name" | "email" | "password" | "confirm" | "terms";
const ORDER: Field[] = ["name", "email", "password", "confirm", "terms"];

const Signup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Set when sent here from an assessment form ("Get Free Report").
  const formPath = safeFormPath(searchParams.get("next"));

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [serverError, setServerError] = useState<AuthError | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  // Set once the account exists but its email still has to be confirmed.
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resend, setResend] = useState<"idle" | "sending" | "sent">("idle");
  const [resendError, setResendError] = useState<string | null>(null);

  const refs: Record<Field, RefObject<HTMLInputElement>> = {
    name: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    password: useRef<HTMLInputElement>(null),
    confirm: useRef<HTMLInputElement>(null),
    terms: useRef<HTMLInputElement>(null),
  };

  const problems = (values = { name, email, password, confirm, agreed }): Partial<Record<Field, string>> => ({
    name: nameProblem(values.name),
    email: emailProblem(values.email),
    password: newPasswordProblem(values.password),
    confirm: confirmProblem(values.password, values.confirm),
    terms: termsProblem(values.agreed),
  });

  // A field is checked when it is left, and on every change once it shows an error.
  const validate = (field: Field, overrides: Partial<{ name: string; email: string; password: string; confirm: string; agreed: boolean }> = {}) =>
    setErrors((prev) => ({ ...prev, [field]: problems({ name, email, password, confirm, agreed, ...overrides })[field] }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const found = problems();
    setErrors(found);
    const firstInvalid = ORDER.find((field) => found[field]);
    if (firstInvalid) {
      refs[firstInvalid].current?.focus();
      return;
    }

    setBusy(true);
    setServerError(null);
    const { error, needsConfirmation } = await signUpWithPassword({
      name: cleanName(name),
      email: email.trim(),
      password,
      formPath,
      acceptedTermsAt: new Date().toISOString(),
    });
    setBusy(false);

    if (error) {
      if (error.code === "weak_password") {
        setErrors((prev) => ({ ...prev, password: error.message }));
        refs.password.current?.focus();
        return;
      }
      setServerError(error);
      return;
    }
    if (needsConfirmation) {
      setSentTo(email.trim());
      setPassword("");
      setConfirm("");
      return;
    }
    // Email confirmation is switched off: the account is already signed in.
    navigate(formPath ?? "/", { replace: true });
  };

  const handleGoogle = async () => {
    // A Google account still has to agree to the Terms and Privacy Policy.
    if (!agreed) {
      setErrors((prev) => ({ ...prev, terms: termsProblem(false) }));
      refs.terms.current?.focus();
      return;
    }
    setGoogleBusy(true);
    setServerError(null);
    const { error } = await signInWithGoogle({ formPath, acceptedTermsAt: new Date().toISOString() });
    if (error) {
      setGoogleBusy(false);
      setServerError(error);
    }
  };

  const handleResend = async () => {
    if (!sentTo) return;
    setResend("sending");
    setResendError(null);
    const { error } = await resendConfirmation(sentTo);
    if (error) {
      setResend("idle");
      setResendError(error.code === "rate_limited" ? "Please wait a minute before asking for another email." : error.message);
      return;
    }
    setResend("sent");
  };

  if (sentTo) {
    return (
      <AuthLayout
        pageTitle="Check your email | Globiculum"
        title="Check your email"
        centered
        icon={
          <div className="ga-status-icon">
            <MailCheckIcon />
          </div>
        }
        footer={
          <>
            Already confirmed?{" "}
            <Link to={loginPath(formPath)} className="ga-link">
              Log in
            </Link>
          </>
        }
      >
        <p className="ga-text">
          Your account has been created. We've sent a confirmation link to <strong>{sentTo}</strong>. Open it before
          you log in.{formPath && " It brings you straight back to the form."}
        </p>
        <p className="ga-note">Can't find it? Check your spam or junk folder. Confirmation emails are often filtered.</p>
        <div className="ga-stack">
          {resendError && <FormAlert>{resendError}</FormAlert>}
          <p role="status" className="ga-success" hidden={resend !== "sent"}>
            We've sent a new link to {sentTo}.
          </p>
          <SecondaryButton busy={resend === "sending"} onClick={handleResend}>
            {resend === "sending" ? "Sending..." : "Resend confirmation email"}
          </SecondaryButton>
          <button
            type="button"
            className="ga-link ga-link-button"
            onClick={() => {
              setSentTo(null);
              setResend("idle");
              setResendError(null);
            }}
          >
            Wrong email address? Go back
          </button>
        </div>
      </AuthLayout>
    );
  }

  const alreadyRegistered = serverError?.code === "already_registered";

  return (
    <AuthLayout
      pageTitle="Sign up | Globiculum"
      title="Create your account"
      footer={
        <>
          Already have an account?{" "}
          <Link to={loginPath(formPath)} className="ga-link">
            Log in
          </Link>
        </>
      }
    >
      <form className="ga-form" onSubmit={handleSubmit} noValidate>
        <TextField
          ref={refs.name}
          id="signup-name"
          label="Full name"
          icon="user"
          type="text"
          autoComplete="name"
          placeholder="Enter your full name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) validate("name", { name: e.target.value });
          }}
          onBlur={() => name && validate("name")}
          error={errors.name}
          disabled={busy}
        />
        <TextField
          ref={refs.email}
          id="signup-email"
          label="Email address"
          icon="mail"
          type="email"
          autoComplete="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) validate("email", { email: e.target.value });
          }}
          onBlur={() => email && validate("email")}
          error={errors.email}
          disabled={busy}
        />
        <PasswordField
          ref={refs.password}
          id="signup-password"
          label="Password"
          autoComplete="new-password"
          placeholder="Create a password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) validate("password", { password: e.target.value });
            if (errors.confirm && confirm) validate("confirm", { password: e.target.value });
          }}
          onBlur={() => password && validate("password")}
          error={errors.password}
          describedBy="signup-password-strength"
          disabled={busy}
          meter={<StrengthMeter id="signup-password-strength" password={password} />}
        />
        <PasswordField
          ref={refs.confirm}
          id="signup-confirm"
          label="Confirm password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            if (errors.confirm) validate("confirm", { confirm: e.target.value });
          }}
          onBlur={() => confirm && validate("confirm")}
          error={errors.confirm}
          disabled={busy}
        />
        <Checkbox
          ref={refs.terms}
          id="signup-terms"
          small
          checked={agreed}
          onChange={(e) => {
            setAgreed(e.target.checked);
            if (errors.terms) validate("terms", { agreed: e.target.checked });
          }}
          error={errors.terms}
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

        {serverError && (
          <FormAlert>
            {alreadyRegistered ? (
              <>
                An account with this email already exists.{" "}
                <Link to={loginPath(formPath)} className="ga-link">
                  Log in
                </Link>{" "}
                instead, or{" "}
                <Link to="/forgot-password" className="ga-link">
                  reset your password
                </Link>
                .
              </>
            ) : serverError.code === "rate_limited" ? (
              "Too many attempts. Wait a minute, then try again."
            ) : serverError.code === "network" ? (
              "We couldn't reach Globiculum. Check your connection and try again."
            ) : serverError.code === "provider_disabled" ? (
              "Google sign-in isn't switched on yet. Please create your account with your email for now."
            ) : (
              serverError.message
            )}
          </FormAlert>
        )}

        <PrimaryButton busy={busy}>{busy ? "Creating account..." : "Create account"}</PrimaryButton>

        <Divider />
        <GoogleButton busy={googleBusy} onClick={handleGoogle} />
      </form>
    </AuthLayout>
  );
};

export default Signup;
