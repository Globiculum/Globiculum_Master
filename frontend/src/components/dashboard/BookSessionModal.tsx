import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CalendarIcon, Loader2 } from "lucide-react";

const SUBJECTS = [
  "Math", "Science", "English", "Social Studies",
  "Hindi", "Sanskrit", "Computer Science", "Other",
];

const SESSION_TYPES = [
  { value: "diagnostic", label: "Diagnostic Assessment", description: "Evaluate current level" },
  { value: "tutoring", label: "1:1 Tutoring", description: "Focused subject help" },
  { value: "consultation", label: "Parent Consultation", description: "Discuss transition plan" },
];

const TIME_SLOTS = [
  "09:00", "10:00", "11:00", "12:00",
  "14:00", "15:00", "16:00", "17:00", "18:00",
];

interface BookSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gapSubjects?: string[];
  onBooked?: () => void;
}

const BookSessionModal = ({ open, onOpenChange, gapSubjects = [], onBooked }: BookSessionModalProps) => {
  const [subject, setSubject] = useState("");
  const [sessionType, setSessionType] = useState("");
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!subject || !sessionType || !date || !time) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("Please log in to book a session");
        return;
      }

      const [hours, minutes] = time.split(":").map(Number);
      const scheduledAt = new Date(date);
      scheduledAt.setHours(hours, minutes, 0, 0);

      if (scheduledAt <= new Date()) {
        toast.error("Please select a future date and time");
        setSaving(false);
        return;
      }

      const { error } = await supabase.from("tutor_sessions" as any).insert({
        user_id: userData.user.id,
        subject,
        session_type: sessionType,
        scheduled_at: scheduledAt.toISOString(),
        notes: notes.trim() || null,
      } as any);

      if (error) throw error;

      toast.success("Session booked successfully!");
      setSubject("");
      setSessionType("");
      setDate(undefined);
      setTime("");
      setNotes("");
      onOpenChange(false);
      onBooked?.();
    } catch (err) {
      console.error("Book session error:", err);
      toast.error("Failed to book session. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Prioritize gap subjects at the top
  const sortedSubjects = [
    ...gapSubjects.filter((s) => SUBJECTS.includes(s)),
    ...SUBJECTS.filter((s) => !gapSubjects.includes(s)),
  ];
  // Deduplicate
  const uniqueSubjects = [...new Set(sortedSubjects)];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Book a Session</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Subject */}
          <div className="space-y-2">
            <Label>Subject *</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a subject" />
              </SelectTrigger>
              <SelectContent>
                {uniqueSubjects.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                    {gapSubjects.includes(s) && (
                      <span className="ml-2 text-xs text-destructive">(Gap area)</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Session Type */}
          <div className="space-y-2">
            <Label>Session Type *</Label>
            <Select value={sessionType} onValueChange={setSessionType}>
              <SelectTrigger>
                <SelectValue placeholder="Choose session type" />
              </SelectTrigger>
              <SelectContent>
                {SESSION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <div>
                      <span>{t.label}</span>
                      <span className="ml-2 text-xs text-muted-foreground">— {t.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time */}
          <div className="space-y-2">
            <Label>Time Slot *</Label>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a time" />
              </SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {format(new Date(`2000-01-01T${t}:00`), "h:mm a")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Any specific topics or questions you'd like to cover..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={saving || !subject || !sessionType || !date || !time}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Booking...
              </>
            ) : (
              "Confirm Booking"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookSessionModal;
