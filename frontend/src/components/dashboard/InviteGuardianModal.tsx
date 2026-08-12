import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Mail, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InviteGuardianModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentProfileId: string | null;
}

const InviteGuardianModal = ({ open, onOpenChange, studentProfileId }: InviteGuardianModalProps) => {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const handleInvite = async () => {
    if (!email.trim() || !studentProfileId) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-guardian", {
        body: {
          guardianEmail: email.trim().toLowerCase(),
          studentProfileId,
        },
      });

      if (error) {
        const msg = (data as any)?.error || error.message || "Failed to send invitation";
        toast.error(msg);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success("Guardian invitation sent successfully!");
      setEmail("");
      onOpenChange(false);
    } catch (err) {
      console.error("Invite error:", err);
      toast.error("Failed to send invitation. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Invite a Guardian
          </DialogTitle>
          <DialogDescription>
            Send an invitation to a guardian or family member so they can view your child's progress and reports in read-only mode.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="guardian-email">Guardian's Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="guardian-email"
                type="email"
                placeholder="guardian@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                disabled={sending}
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              They'll receive an email invitation. Once they sign up or log in with this email, they'll automatically get read-only access.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={sending || !email.trim() || !studentProfileId}>
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                Sending...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" aria-hidden="true" />
                Send Invitation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InviteGuardianModal;
