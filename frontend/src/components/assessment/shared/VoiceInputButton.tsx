import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { canRecordAudio, startWavRecording, type WavRecorder } from "@/lib/wavRecorder";

interface VoiceInputButtonProps {
  onResult: (text: string) => void;
  label?: string;
  className?: string;
}

type VoiceStatus = "idle" | "listening" | "transcribing";

// Longest recording sent for transcription; the function accepts a little more.
const MAX_RECORDING_SECONDS = 60;

// Voice typing for the notes boxes. Two ways, decided by sign-in:
//
// - Signed in: the recording goes to our own transcribe-audio function, which
//   uses Gemini (the AI service that already writes the report). Works in every
//   browser that can record. Tap to start, tap to stop (stops itself at 60 s).
// - Signed out: the browser's built-in speech recognition, as before (Chrome
//   and Edge; hidden where unsupported). Our function needs an account, since
//   every call costs money.
//
// Three visible states so the user always knows what's happening: idle (plain
// mic), listening (pulsing ring + animated icon + status pill), and
// transcribing (spinner + "Transcribing..." pill). The button is disabled
// while transcribing so a second recording can't start before the first ends.
const VoiceInputButton = ({ onResult, label = "Use microphone", className }: VoiceInputButtonProps) => {
  const { session } = useAuth();
  const serverMode = !!session && canRecordAudio();

  const [browserSupported, setBrowserSupported] = useState(false);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const recognitionRef = useRef<any>(null);
  const recorderRef = useRef<WavRecorder | null>(null);
  const mountedRef = useRef(true);
  // Latest callback, for results that arrive after a re-render.
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      recorderRef.current?.cancel();
      recorderRef.current = null;
    };
  }, []);

  // Browser speech recognition (signed-out path).
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
      if (transcript) onResultRef.current(transcript.trim());
    };
    recognition.onend = () => setStatus("idle");
    recognition.onerror = () => setStatus("idle");
    recognitionRef.current = recognition;
    setBrowserSupported(true);

    return () => {
      recognition.onstart = null;
      recognition.onspeechend = null;
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
    };
  }, []);

  if (!serverMode && !browserSupported) return null;

  // Server path: stop recording, send it, add the text.
  const finishRecording = async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorderRef.current = null;
    setStatus("transcribing");
    try {
      const recording = await recorder.stop();
      if (!recording) {
        toast({ title: "We didn't catch that", description: "Please try again, a little closer to the microphone." });
        return;
      }
      const { data, error } = await supabase.functions.invoke("transcribe-audio", {
        body: { audio: recording.base64, mimeType: recording.mimeType },
      });
      if (error) throw error;
      const text = typeof data?.text === "string" ? data.text.trim() : "";
      if (!mountedRef.current) return;
      if (text) onResultRef.current(text);
      else toast({ title: "We didn't catch that", description: "Please try again, a little closer to the microphone." });
    } catch (err) {
      if (!mountedRef.current) return;
      toast({
        title: "Couldn't turn that into text",
        description: (await functionErrorMessage(err)) ?? "Please try again, or type instead.",
        variant: "destructive",
      });
    } finally {
      if (mountedRef.current) setStatus("idle");
    }
  };

  const startRecording = async () => {
    try {
      recorderRef.current = await startWavRecording(MAX_RECORDING_SECONDS, () => {
        void finishRecording();
      });
      if (!mountedRef.current) {
        recorderRef.current.cancel();
        return;
      }
      setStatus("listening");
    } catch {
      recorderRef.current = null;
      toast({
        title: "Microphone not available",
        description: "Allow microphone access for this site in your browser, or type instead.",
        variant: "destructive",
      });
    }
  };

  const toggleListening = () => {
    if (status === "transcribing") return;
    if (serverMode) {
      if (status === "listening") void finishRecording();
      else void startRecording();
      return;
    }
    if (!recognitionRef.current) return;
    if (status === "listening") {
      recognitionRef.current.stop();
      return;
    }
    recognitionRef.current.start();
  };

  const statusLabel =
    status === "listening"
      ? serverMode
        ? "Listening... tap to stop"
        : "Listening..."
      : status === "transcribing"
        ? "Transcribing..."
        : null;

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

/** The function's own error message (e.g. "too long"), when it sent one. */
async function functionErrorMessage(err: unknown): Promise<string | null> {
  const context = (err as { context?: { json?: () => Promise<unknown> } })?.context;
  if (typeof context?.json !== "function") return null;
  try {
    const body = (await context.json()) as { error?: unknown };
    return typeof body?.error === "string" ? body.error : null;
  } catch {
    return null;
  }
}

export default VoiceInputButton;
