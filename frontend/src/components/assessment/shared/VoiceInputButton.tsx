import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VoiceInputButtonProps {
  onResult: (text: string) => void;
  label?: string;
  className?: string;
}

// Browser-native speech-to-text (Web Speech API) — no new dependency. Renders
// nothing when unsupported (progressive enhancement), so it never blocks the
// underlying Input/Textarea from working with the keyboard as before.
const VoiceInputButton = ({ onResult, label = "Use microphone", className }: VoiceInputButtonProps) => {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) onResult(transcript.trim());
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    setSupported(true);

    return () => {
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!supported) return null;

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleListening}
      aria-label={listening ? `Stop ${label.toLowerCase()}` : label}
      aria-pressed={listening}
      className={cn(
        "h-9 w-9 shrink-0 text-muted-foreground hover:text-secondary",
        listening && "text-secondary animate-pulse",
        className
      )}
    >
      <Mic className="h-4 w-4" />
    </Button>
  );
};

export default VoiceInputButton;
