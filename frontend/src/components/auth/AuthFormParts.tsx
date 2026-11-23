import { forwardRef, useState, type ComponentProps, type ReactNode } from "react";
import { passwordStrength, STRENGTH_LABELS } from "@/lib/passwordRules";
import { ArrowIcon, EyeIcon, EyeOffIcon, GoogleMark, LockIcon, MailIcon, UserIcon } from "./AuthIcons";

const ICONS = { mail: MailIcon, lock: LockIcon, user: UserIcon };

interface FieldProps extends Omit<ComponentProps<"input">, "id" | "className"> {
  id: string;
  label: string;
  icon: keyof typeof ICONS;
  error?: string;
  /** Id of text that describes the field when there is no error (e.g. the strength meter). */
  describedBy?: string;
  /** Rendered under the input (e.g. "Forgot password?", the strength meter). */
  below?: ReactNode;
}

const describedByFor = (id: string, error?: string, describedBy?: string) =>
  [error ? `${id}-error` : null, describedBy].filter(Boolean).join(" ") || undefined;

/** Labelled input with a leading icon and its error under it. */
export const TextField = forwardRef<HTMLInputElement, FieldProps>(
  ({ id, label, icon, error, describedBy, below, ...input }, ref) => {
    const Icon = ICONS[icon];
    return (
      <div className="ga-field">
        <label htmlFor={id} className="ga-label">
          {label}
        </label>
        <div className="ga-input-wrap">
          <span className="ga-input-icon">
            <Icon />
          </span>
          <input
            ref={ref}
            id={id}
            className="ga-input"
            aria-invalid={error ? true : undefined}
            aria-describedby={describedByFor(id, error, describedBy)}
            {...input}
          />
        </div>
        {error && (
          <p id={`${id}-error`} className="ga-field-error">
            {error}
          </p>
        )}
        {below}
      </div>
    );
  }
);
TextField.displayName = "TextField";

/** Password input with a Show/Hide password button. `meter` sits right under the input, above any error. */
export const PasswordField = forwardRef<HTMLInputElement, Omit<FieldProps, "icon" | "type"> & { meter?: ReactNode }>(
  ({ id, label, error, describedBy, below, meter, ...input }, ref) => {
    const [shown, setShown] = useState(false);
    return (
      <div className="ga-field">
        <label htmlFor={id} className="ga-label">
          {label}
        </label>
        <div className="ga-input-wrap">
          <span className="ga-input-icon">
            <LockIcon />
          </span>
          <input
            ref={ref}
            id={id}
            type={shown ? "text" : "password"}
            className="ga-input ga-input--password"
            aria-invalid={error ? true : undefined}
            aria-describedby={describedByFor(id, error, describedBy)}
            {...input}
          />
          <button
            type="button"
            className="ga-toggle"
            aria-label={shown ? "Hide password" : "Show password"}
            aria-controls={id}
            onClick={() => setShown((value) => !value)}
          >
            {shown ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        {meter}
        {error && (
          <p id={`${id}-error`} className="ga-field-error">
            {error}
          </p>
        )}
        {below}
      </div>
    );
  }
);
PasswordField.displayName = "PasswordField";

interface CheckboxProps extends Omit<ComponentProps<"input">, "type" | "id" | "className"> {
  id: string;
  children: ReactNode;
  error?: string;
  small?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({ id, children, error, small, ...input }, ref) => (
  <div className="ga-field">
    <label className={`ga-check${small ? " ga-check--small" : ""}`} htmlFor={id}>
      <input
        ref={ref}
        id={id}
        type="checkbox"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...input}
      />
      <span>{children}</span>
    </label>
    {error && (
      <p id={`${id}-error`} className="ga-field-error">
        {error}
      </p>
    )}
  </div>
));
Checkbox.displayName = "Checkbox";

/**
 * Four-bar strength meter, hidden while the password is empty. The word is
 * announced through a live region that is always present (a region that
 * appears together with its text is often not read out).
 */
export const StrengthMeter = ({ id, password }: { id: string; password: string }) => {
  const score = passwordStrength(password);
  return (
    <>
      <div className={`ga-meter${score === 0 ? " ga-meter--empty" : ""}`} aria-hidden="true">
        <div className="ga-meter-bars">
          {[1, 2, 3, 4].map((bar) => (
            <span key={bar} className={`ga-meter-bar${bar <= score ? " ga-meter-bar--on" : ""}`} />
          ))}
        </div>
        <span className="ga-meter-label">{STRENGTH_LABELS[score]}</span>
      </div>
      <span id={id} className="sr-only" aria-live="polite">
        {score > 0 ? `Password strength: ${STRENGTH_LABELS[score]}` : ""}
      </span>
    </>
  );
};

export const Spinner = ({ large = false }: { large?: boolean }) => (
  <span className={`ga-spinner${large ? " ga-spinner--large" : ""}`} aria-hidden="true" />
);

/**
 * Mouse-down on a button would blur the field being typed in; its error then
 * appears, the button moves down under the pointer, and the click is lost.
 * Keeping focus where it is until the click lands avoids that (keyboard use
 * is unaffected).
 */
const keepFocus = (event: React.MouseEvent) => event.preventDefault();

/** Full-width teal submit button; shows a spinner instead of the arrow while busy. */
export const PrimaryButton = ({ busy, children, type = "submit", ...props }: ComponentProps<"button"> & { busy?: boolean }) => (
  <button type={type} className="ga-btn" disabled={busy || props.disabled} aria-busy={busy || undefined} onMouseDown={keepFocus} {...props}>
    {children}
    {busy ? <Spinner /> : <ArrowIcon />}
  </button>
);

/** White button for secondary actions (e.g. Resend confirmation email). */
export const SecondaryButton = ({ busy, children, ...props }: ComponentProps<"button"> & { busy?: boolean }) => (
  <button type="button" className="ga-btn ga-btn--plain" disabled={busy || props.disabled} aria-busy={busy || undefined} onMouseDown={keepFocus} {...props}>
    {busy && <Spinner />}
    {children}
  </button>
);

export const GoogleButton = ({ busy, onClick }: { busy: boolean; onClick: () => void }) => (
  <button type="button" className="ga-btn ga-btn--plain" onClick={onClick} disabled={busy} aria-busy={busy || undefined} onMouseDown={keepFocus}>
    {busy ? <Spinner /> : <GoogleMark />}
    Continue with Google
  </button>
);

export const Divider = () => (
  <div className="ga-divider">
    <span className="ga-divider-line" />
    <span className="ga-divider-text">or</span>
    <span className="ga-divider-line" />
  </div>
);

/** One server-error message above the primary button. */
export const FormAlert = ({ children }: { children: ReactNode }) => (
  <div role="alert" className="ga-alert">
    {children}
  </div>
);
