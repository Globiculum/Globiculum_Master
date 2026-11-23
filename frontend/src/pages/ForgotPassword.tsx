import { useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "@/components/auth/AuthLayout";
import { FormAlert, PrimaryButton, SecondaryButton, TextField } from "@/components/auth/AuthFormParts";
import { MailCheckIcon } from "@/components/auth/AuthIcons";
import { sendPasswordReset } from "@/lib/authClient";
import { emailProblem } from "@/lib/authValidation";

const BackToLogin = () => (
  <>
    Remembered it?{" "}
    <Link to="/login" className="ga-link">
      Log in
    </Link>
  </>
);

/** Asks for a password reset link (the link opens /reset-password). */
const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [sentAgain, setSentAgain] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const send = async (address: string) => {
    setBusy(true);
    setServerError(null);
    const { error: sendError } = await sendPasswordReset(address);
    setBusy(false);
    if (sendError) {
      setServerError(
        sendError.code === "rate_limited"
          ? "Please wait a minute before asking for another email."
          : sendError.code === "network"
            ? "We couldn't reach Globiculum. Check your connection and try again."
            : sendError.message
      );
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const problem = emailProblem(email);
    setError(problem);
    if (problem) {
      emailRef.current?.focus();
      return;
    }
    if (await send(email.trim())) setSentTo(email.trim());
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
        footer={<BackToLogin />}
      >
        <p className="ga-text">
          If there's an account for <strong>{sentTo}</strong>, we've sent it a link to set a new password. Open the
          link on this device.
        </p>
        <p className="ga-note">Can't find it? Check your spam or junk folder, or send the link again.</p>
        <div className="ga-stack">
          {serverError && <FormAlert>{serverError}</FormAlert>}
          <p role="status" className="ga-success" hidden={!sentAgain}>
            We've sent another link to {sentTo}.
          </p>
          <SecondaryButton
            busy={busy}
            onClick={async () => {
              setSentAgain(false);
              if (await send(sentTo)) setSentAgain(true);
            }}
          >
            {busy ? "Sending..." : "Send the link again"}
          </SecondaryButton>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout pageTitle="Reset your password | Globiculum" title="Reset your password" footer={<BackToLogin />}>
      <p className="ga-text">Enter the email address you signed up with and we'll send you a link to set a new password.</p>
      <form className="ga-form" onSubmit={handleSubmit} noValidate>
        <TextField
          ref={emailRef}
          id="reset-email"
          label="Email address"
          icon="mail"
          type="email"
          autoComplete="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(emailProblem(e.target.value));
          }}
          onBlur={() => email && setError(emailProblem(email))}
          error={error}
          disabled={busy}
        />
        {serverError && <FormAlert>{serverError}</FormAlert>}
        <PrimaryButton busy={busy}>{busy ? "Sending..." : "Send reset link"}</PrimaryButton>
      </form>
    </AuthLayout>
  );
};

export default ForgotPassword;
