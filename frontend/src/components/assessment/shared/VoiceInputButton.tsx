import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VoiceInputButtonProps {
  onResult: (text: string) => void;
  label?: string;
  className?: string;
}

type VoiceStatus = "idle" | "listening" | "transcribing";

// Browser-native speech-to-text (Web Speech API) — no new dependency. Renders
// nothing when unsupported (progressive enhancement), so it never blocks the
// underlying Input/Textarea from working with the keyboard as before.
//
// Three visible states so the user always knows what's happening: idle (plain
// mic), listening (pulsing ring + animated icon + "Listening..." pill, from
// the engine's onstart event), and transcribing (spinner + "Transcribing..."
// pill, from onspeechend — the engine has detected silence and is finalizing
// the result — through onend/onresult). The button is disabled while
// transcribing so a second recording can't start before the first finishes.
const VoiceInputButton = ({ onResult, label = "Use microphone", className }: VoiceInputButtonProps) => {
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onstart = () => setStatus("listening");
    recognition.onspeechend = () => setStatus("transcribing");
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) onResult(transcript.trim());
    };
    recognition.onend = () => setStatus("idle");
    recognition.onerror = () => setStatus("idle");
    recognitionRef.current = recognition;
    setSupported(true);

    return () => {
      recognition.onstart = null;
      recognition.onspeechend = null;
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!supported) return null;

  const toggleListening = () => {
    if (!recognitionRef.current || status === "transcribing") return;
    if (status === "listening") {
      recognitionRef.current.stop();
      return;
    }
    recognitionRef.current.start();
  };

  const statusLabel = status === "listening" ? "Listening..." : status === "transcribing" ? "Transcribing..." : null;

  return (
    <div className={cn("relative inline-flex", className)}>
      <AnimatePresence>
        {statusLabel && (
          <motion.span
            initial={{ opacity: 0, y: 4, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none absolute -top-8 right-0 z-10 whitespace-nowrap rounded-full bg-foreground px-2.5 py-1 text-xs font-medium text-background shadow-medium"
          >
            {statusLabel}
          </motion.span>
        )}
      </AnimatePresence>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={toggleListening}
        disabled={status === "transcribing"}
        aria-label={status === "listening" ? `Stop ${label.toLowerCase()}` : statusLabel || label}
        aria-pressed={status === "listening"}
        className={cn("relative h-9 w-9 shrink-0 text-muted-foreground hover:text-secondary", status !== "idle" && "text-secondary")}
      >
        {status === "listening" && (
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-secondary/30"
            animate={{ scale: [1, 1.7], opacity: [0.55, 0] }}
            transition={{ duration: 1.3, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        {status === "transcribing" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <motion.span
            className="relative flex"
            animate={status === "listening" ? { scale: [1, 1.18, 1] } : { scale: 1 }}
            transition={status === "listening" ? { duration: 0.85, repeat: Infinity, ease: "easeInOut" } : undefined}
          >
            <Mic className="h-4 w-4" />
          </motion.span>
        )}
      </Button>
    </div>
  );
};

export default VoiceInputButton;
