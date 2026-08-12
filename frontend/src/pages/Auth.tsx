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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpErrors({});

    try {
      const validated = authSchema.parse({ email, password, fullName });
      setLoading(true);

      const { error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: validated.fullName || "User",
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Account created successfully. You can now log in.",
      });
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

    try {
      const validated = signInSchema.parse({ email, password });
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (error) throw error;

      navigate("/");
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        setSignInErrors(zodErrorsByField(error));
      } else {
        // Not a field-level issue (e.g. wrong credentials, network failure) —
        // the toast remains the right place for this.
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
