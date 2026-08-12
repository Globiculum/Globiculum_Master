import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Mail, CheckCircle2, AlertTriangle, Loader2, X } from "lucide-react";
import { User } from "@supabase/supabase-js";

interface EmailVerificationBannerProps {
  user: User;
}

const EmailVerificationBanner = ({ user }: EmailVerificationBannerProps) => {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const isEmailConfirmed = user.email_confirmed_at !== null;

  const handleResendVerification = async () => {
    if (!user.email) return;
    
    setSending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;

      toast({
        title: "Verification email sent!",
        description: "Please check your inbox and click the verification link.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to send email",
        description: error.message || "Please try again later.",
      });
    } finally {
      setSending(false);
    }
  };

  if (dismissed) return null;

  if (isEmailConfirmed) {
    return (
      <Alert className="mb-6 border-success/50 bg-success/10">
        <CheckCircle2 className="h-4 w-4 text-success" />
        <AlertTitle className="text-success">Email Verified</AlertTitle>
        <AlertDescription className="text-success/80">
          Your email address ({user.email}) has been verified.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="mb-6 border-warning/50 bg-warning/10 relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-6 w-6"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
      <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
      <AlertTitle className="text-warning">Email Not Verified</AlertTitle>
      <AlertDescription className="text-warning/80">
        <p className="mb-3">
          Please verify your email address ({user.email}) to access all features.
        </p>
        <Button 
          size="sm" 
          variant="outline"
          className="border-warning/50 hover:bg-warning/20"
          onClick={handleResendVerification}
          disabled={sending}
        >
          {sending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Resend Verification Email
            </>
          )}
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default EmailVerificationBanner;
