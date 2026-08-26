import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { z, ZodError } from "zod";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { MailCheck, Loader2 } from "lucide-react";

// Every emailed auth link must land on the dedicated callback route, which is
// the only page that knows how to exchange a PKCE code / read link errors.
// Pointing this at "/" (as it previously did) meant a successful confirmation
// dumped the user on the landing page without a session.
const emailRedirectUrl = () => `${window.location.origin}/auth/callback`;

const getErrorMessage = (error: unknown): string => {
  if (error instanceof ZodError) {
    return error.errors[0]?.message || "Validation failed";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
};

// Turns a ZodError into a { fieldName: message } map so each input can show
// its own error inline, instead of only a single generic toast.
const zodErrorsByField = (error: ZodError): Record<string, string> => {
  const map: Record<string, string> = {};
  for (const issue of error.errors) {
    const key = issue.path[0];
    if (typeof key === "string" && !map[key]) {
      map[key] = issue.message;
    }
  }
  return map;
};

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password must be less than 100 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

// Sanitize name: strip HTML tags and reject SQL injection patterns
const sanitizeName = (name: string): string => {
  return name.replace(/<[^>]*>/g, '').trim();
};

// Block SQL injection patterns but allow legitimate apostrophes in names (O'Reilly, D'Angelo)
const sqlPatternRegex = /(--|;|"|\\)|(('\s*(or|and|union|select|drop|delete|insert|update|exec)\s)|((drop|delete|insert|update|select|union|exec|execute)\s))/i;

const authSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255),
  password: passwordSchema,
  fullName: z.string()
    .trim()
    .transform(sanitizeName)
    .refine((val) => val.length >= 2, { message: "Name must be at least 2 characters" })
    .refine((val) => val.length <= 100, { message: "Name must be less than 100 characters" })
    .refine((val) => !sqlPatternRegex.test(val), { message: "Name contains invalid characters" })
    .optional(),
});

const signInSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
});

interface SignInErrors {
  email?: string;
  password?: string;
}

interface SignUpErrors {
  fullName?: string;
  email?: string;
  password?: string;
}

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const [signInErrors, setSignInErrors] = useState<SignInErrors>({});
  const [signUpErrors, setSignUpErrors] = useState<SignUpErrors>({});
  const [resetError, setResetError] = useState<string | undefined>();

  // Set once a signup succeeds but still needs email confirmation, so the UI can
  // stop claiming the user "can now log in" (they cannot — signInWithPassword
  // rejects unconfirmed accounts with email_not_confirmed).
  const [pendingConfirmEmail, setPendingConfirmEmail] = useState<string | null>(null);
  // Set when a sign-in attempt is rejected specifically because the address is
  // unconfirmed, so we can offer a resend instead of a dead-end toast.
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);

  const handleResendConfirmation = async (targetEmail: string) => {
    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: targetEmail,
        options: { emailRedirectTo: emailRedirectUrl() },
      });
      if (error) throw error;
      toast({
        title: "Confirmation email sent",
        description: `We've sent a new confirmation link to ${targetEmail}. Please check your inbox and spam folder.`,
      });
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Couldn't resend email",
        description: getErrorMessage(error),
      });
    } finally {
      setResendLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpErrors({});

    try {
      const validated = authSchema.parse({ email, password, fullName });
      setLoading(true);

      // `data` matters as much as `error` here — signUp resolves successfully in
      // three materially different situations, and they need different UX.
      const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: emailRedirectUrl(),
          data: {
            full_name: validated.fullName || "User",
          },
        },
      });

      if (error) throw error;

      // Case 1 — the address is ALREADY registered. Supabase deliberately does
      // not return an error for this (it would let anyone enumerate registered
      // emails); it returns an obfuscated user with an EMPTY identities array
      // and no session. Treating that as success is what previously told people
      // their account was created and then left them unable to log in, because
      // the password they just typed was never applied to the existing account.
      const alreadyRegistered = !!data.user && (data.user.identities?.length ?? 0) === 0;
      if (alreadyRegistered) {
        setSignUpErrors({
          email: "An account with this email already exists. Please sign in instead, or use “Forgot password?” to reset it.",
        });
        return;
      }

      // Case 2 — email confirmation is DISABLED on the project, so Supabase
      // returns a live session and the user is already signed in.
      if (data.session) {
        toast({
          title: "Welcome!",
          description: "Your account is ready.",
        });
        navigate("/dashboard", { replace: true });
        return;
      }

      // Case 3 — email confirmation is ENABLED (the Supabase default). The
      // account exists but cannot sign in until the emailed link is opened.
      setPendingConfirmEmail(validated.email);
      setPassword("");
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        // Field-level messages do the job here — the inputs themselves show
        // what's wrong, so a duplicate generic toast would just be noise.
        setSignUpErrors(zodErrorsByField(error));
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: getErrorMessage(error),
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInErrors({});
    setUnconfirmedEmail(null);

    try {
      const validated = signInSchema.parse({ email, password });
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (error) throw error;

      navigate("/dashboard", { replace: true });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        setSignInErrors(zodErrorsByField(error));
        return;
      }

      // An unconfirmed address is the single most common reason a freshly
      // created account can't sign in. Surface it as a recoverable state with a
      // resend button rather than an opaque toast the user can't act on.
      const code = (error as { code?: string })?.code;
      const message = getErrorMessage(error);
      const isUnconfirmed =
        code === "email_not_confirmed" || /email not confirmed|not confirmed/i.test(message);

      if (isUnconfirmed) {
        // Re-derive from state rather than the try-scoped `validated`: by this
        // point we know the address parsed, and the raw state value is the same
        // one that was submitted.
        setUnconfirmedEmail(email.trim());
        setSignInErrors({
          email: "This email hasn't been confirmed yet. Check your inbox for the confirmation link.",
        });
        return;
      }

      if (code === "invalid_credentials" || /invalid login credentials/i.test(message)) {
        setSignInErrors({ password: "Incorrect email or password. Please try again." });
        return;
      }

      // Anything else (network failure, rate limit, server error) genuinely
      // belongs in a toast.
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(undefined);

    const emailValidation = z.string().trim().email("Invalid email address").max(255);

    try {
      emailValidation.parse(resetEmail);
      setResetLoading(true);

      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: "Check your email",
        description: "We've sent you a password reset link. Please check your inbox.",
      });
      setResetDialogOpen(false);
      setResetEmail("");
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        setResetError(error.errors[0]?.message);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: getErrorMessage(error),
        });
      }
    } finally {
      setResetLoading(false);
    }
  };

  // Signup succeeded but the account is unusable until the emailed link is
  // opened. This replaces the old "Account created successfully. You can now log
  // in." toast, which was actively wrong in this state.
  if (pendingConfirmEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center space-y-2">
            <MailCheck className="h-10 w-10 text-primary mx-auto" aria-hidden="true" />
            <h1 className="text-2xl font-bold leading-none tracking-tight">Confirm your email</h1>
            <CardDescription>
              Your account has been created. We've sent a confirmation link to{" "}
              <span className="font-medium text-foreground">{pendingConfirmEmail}</span>. You need to open
              that link before you can sign in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Can't find it? Check your spam or junk folder — confirmation emails are often filtered.
            </p>
            <Button
              variant="outline"
              className="w-full"
              disabled={resendLoading}
              onClick={() => handleResendConfirmation(pendingConfirmEmail)}
            >
              {resendLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Sending...
                </>
              ) : (
                "Resend confirmation email"
              )}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setPendingConfirmEmail(null);
                setPassword("");
              }}
            >
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <h1 className="text-2xl font-bold leading-none tracking-tight">Welcome to Globiculum</h1>
          <CardDescription>Sign in or create an account to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (signInErrors.email) setSignInErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    required
                    disabled={loading}
                    autoComplete="email"
                    aria-invalid={!!signInErrors.email}
                    aria-describedby={signInErrors.email ? "signin-email-error" : undefined}
                  />
                  {signInErrors.email && (
                    <p id="signin-email-error" role="alert" className="text-sm text-destructive">
                      {signInErrors.email}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signin-password">Password</Label>
                    <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          type="button"
                          variant="link"
                          className="px-0 h-auto text-xs text-muted-foreground hover:text-primary"
                        >
                          Forgot password?
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Reset your password</DialogTitle>
                          <DialogDescription>
                            Enter your email address and we'll send you a link to reset your password.
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleForgotPassword} className="space-y-4 mt-4" noValidate>
                          <div className="space-y-2">
                            <Label htmlFor="reset-email">Email</Label>
                            <Input
                              id="reset-email"
                              type="email"
                              placeholder="your.email@example.com"
                              value={resetEmail}
                              onChange={(e) => {
                                setResetEmail(e.target.value);
                                if (resetError) setResetError(undefined);
                              }}
                              required
                              disabled={resetLoading}
                              autoComplete="email"
                              aria-invalid={!!resetError}
                              aria-describedby={resetError ? "reset-email-error" : undefined}
                            />
                            {resetError && (
                              <p id="reset-email-error" role="alert" className="text-sm text-destructive">
                                {resetError}
                              </p>
                            )}
                          </div>
                          <Button type="submit" className="w-full" disabled={resetLoading}>
                            {resetLoading ? "Sending..." : "Send Reset Link"}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (signInErrors.password) setSignInErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    required
                    disabled={loading}
                    autoComplete="current-password"
                    aria-invalid={!!signInErrors.password}
                    aria-describedby={signInErrors.password ? "signin-password-error" : undefined}
                  />
                  {signInErrors.password && (
                    <p id="signin-password-error" role="alert" className="text-sm text-destructive">
                      {signInErrors.password}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>

                {/* Sign-in was rejected purely because the address is
                    unconfirmed — offer the fix inline instead of leaving the
                    user stuck on an error they can't act on. */}
                {unconfirmedEmail && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={resendLoading}
                    onClick={() => handleResendConfirmation(unconfirmedEmail)}
                  >
                    {resendLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        Sending...
                      </>
                    ) : (
                      "Resend confirmation email"
                    )}
                  </Button>
                )}
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (signUpErrors.fullName) setSignUpErrors((prev) => ({ ...prev, fullName: undefined }));
                    }}
                    required
                    disabled={loading}
                    autoComplete="name"
                    aria-invalid={!!signUpErrors.fullName}
                    aria-describedby={signUpErrors.fullName ? "signup-name-error" : undefined}
                  />
                  {signUpErrors.fullName && (
                    <p id="signup-name-error" role="alert" className="text-sm text-destructive">
                      {signUpErrors.fullName}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (signUpErrors.email) setSignUpErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    required
                    disabled={loading}
                    autoComplete="email"
                    aria-invalid={!!signUpErrors.email}
                    aria-describedby={signUpErrors.email ? "signup-email-error" : undefined}
                  />
                  {signUpErrors.email && (
                    <p id="signup-email-error" role="alert" className="text-sm text-destructive">
                      {signUpErrors.email}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (signUpErrors.password) setSignUpErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    required
                    disabled={loading}
                    autoComplete="new-password"
                    aria-invalid={!!signUpErrors.password}
                    aria-describedby={signUpErrors.password ? "signup-password-error" : "signup-password-strength"}
                  />
                  {signUpErrors.password && (
                    <p id="signup-password-error" role="alert" className="text-sm text-destructive">
                      {signUpErrors.password}
                    </p>
                  )}
                  <div id="signup-password-strength">
                    <PasswordStrengthIndicator password={password} />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating account..." : "Sign Up"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
