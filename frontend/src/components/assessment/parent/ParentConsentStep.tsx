import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlobiculumIconTile, type GlobiculumIconTileTone } from "@/components/icons";
import Icon3DImage from "@/components/icons/Icon3DImage";
import FlashcardShell from "../shared/FlashcardShell";
import FieldError from "../shared/FieldError";
import PremiumButton from "../shared/PremiumButton";
import { PARENT_CONSENT_STATEMENTS } from "@/lib/parentConsent";
import backIcon from "@/assets/icons-3d/back.png";
import childProfileIcon from "@/assets/icons-3d/child-profile.png";
import targetIcon from "@/assets/icons-3d/target.png";
import infoIcon from "@/assets/icons-3d/info.png";
import reviewIcon from "@/assets/icons-3d/review.png";
import keyIcon from "@/assets/icons-3d/support-at-home.png";
import shieldIcon from "@/assets/icons-3d/strengths.png";

// "Before we begin": the parent's permission to use their child's details,
// shown once before the parent form's first question (tracker T27). The
// wording is versioned in lib/parentConsent.ts; change it there, with a new
// version, never in place. Every sentence must stay true of what the app does:
// - the AI gets the answers without the child's name (notesForAnalysis swaps
//   names in the notes for "the child") or the parent's email;
// - voice typing goes to the same AI and isn't stored (transcribe-audio);
// - a shared link shows the first name only (fetch-shared-report) for 7 days;
// - deleting a report in My Reports deletes it for good.

const USES: { icon: string; tone: GlobiculumIconTileTone; title: string; text: string }[] = [
  {
    icon: childProfileIcon,
    tone: "violet",
    title: "What we ask",
    text: "Your child's name, grade, school and location, subjects, languages, how they learn, and any notes you add.",
  },
  {
    icon: targetIcon,
    tone: "amber",
    title: "What it's for",
    text: "Only to make your child's curriculum transition report, which is kept in your account.",
  },
  {
    icon: infoIcon,
    tone: "teal",
    title: "How the AI helps",
    text: "Google Gemini, the AI service we use, reads the answers (and any voice typing) to write the report. It isn't sent your child's name or your email.",
  },
  {
    icon: reviewIcon,
    tone: "mint",
    title: "Who sees it",
    text: "You, when you're logged in. If you share a report link, whoever has it sees the report with your child's first name only, for 7 days.",
  },
  {
    icon: keyIcon,
    tone: "violet",
    title: "You're in control",
    text: "Delete a report at any time from My Reports, and the answers go with it.",
  },
];

interface ParentConsentStepProps {
  /** Saves the agreement; resolves false when it couldn't be saved. */
  onAgree: () => Promise<boolean>;
  onChangePersona: () => void;
  showChangePersona: boolean;
}

const ParentConsentStep = ({ onAgree, onChangePersona, showChangePersona }: ParentConsentStepProps) => {
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const boxes = useRef<Record<string, HTMLInputElement | null>>({});
  const allTicked = PARENT_CONSENT_STATEMENTS.every((s) => ticked[s.key]);

  const toggle = (key: string, checked: boolean) => {
    setTicked((prev) => ({ ...prev, [key]: checked }));
    setError(undefined);
  };

  const submit = async () => {
    if (saving) return;
    if (!allTicked) {
      setError("Please tick both boxes to start.");
      const first = PARENT_CONSENT_STATEMENTS.find((s) => !ticked[s.key]);
      if (first) boxes.current[first.key]?.focus();
      return;
    }
    setSaving(true);
    const saved = await onAgree();
    setSaving(false);
    if (!saved) setError("We couldn't save your agreement. Please check your connection and try again.");
  };

  return (
    <div className="relative">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-mint/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-[420px] w-[420px] rounded-full bg-violet/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-[1180px] rounded-[20px] border border-border bg-card px-6 py-8 shadow-soft sm:px-10 sm:py-12">
        {showChangePersona && (
          <button
            type="button"
            onClick={onChangePersona}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <img src={backIcon} className="h-3.5 w-3.5 object-contain" alt="" aria-hidden="true" draggable={false} />
            Change persona
          </button>
        )}
        <motion.h1
          className="text-h2 mt-3 text-foreground"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          Before we begin
        </motion.h1>
        <p className="font-body mt-1.5 max-w-2xl text-body text-muted-foreground">
          Here's what we do with your child's details. It takes a minute to read, and we only ask once.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
          <section aria-labelledby="consent-uses-title" className="rounded-2xl border border-border bg-background/60 p-5 sm:p-6">
            <h2 id="consent-uses-title" className="font-heading text-lg font-bold text-foreground">
              How we use your child's details
            </h2>
            <ul className="mt-4 space-y-4">
              {USES.map((use, i) => (
                <motion.li
                  key={use.title}
                  className="flex gap-4"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 * i, ease: "easeOut" }}
                >
                  <GlobiculumIconTile tone={use.tone} size={48} accent={false}>
                    <Icon3DImage src={use.icon} size={28} />
                  </GlobiculumIconTile>
                  <div className="min-w-0">
                    <h3 className="font-heading text-[15px] font-semibold text-foreground">{use.title}</h3>
                    <p className="mt-0.5 font-body text-sm leading-relaxed text-muted-foreground">{use.text}</p>
                  </div>
                </motion.li>
              ))}
            </ul>
          </section>

          <FlashcardShell invalid={!!error && !allTicked}>
            <div className="flex flex-col items-center text-center">
              <GlobiculumIconTile tone="teal" size={64}>
                <Icon3DImage src={shieldIcon} size={38} />
              </GlobiculumIconTile>
              <h2 className="mt-4 text-xl font-bold text-foreground">Your permission</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">Tick both to start your child's assessment.</p>
            </div>

            <fieldset className="mt-6 space-y-3">
              <legend className="sr-only">Your permission</legend>
              {PARENT_CONSENT_STATEMENTS.map((s) => {
                const checked = !!ticked[s.key];
                return (
                  <label
                    key={s.key}
                    htmlFor={`consent-${s.key}`}
                    className={cn(
                      // relative: keeps the visually hidden box inside the label, so focusing it doesn't scroll the page.
                      "relative flex cursor-pointer items-start gap-3 rounded-xl border-2 bg-card/90 px-4 py-3.5 text-left transition-colors duration-200",
                      "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2",
                      checked ? "border-secondary bg-secondary/[0.06]" : "border-border hover:border-secondary/40"
                    )}
                  >
                    <input
                      ref={(el) => (boxes.current[s.key] = el)}
                      id={`consent-${s.key}`}
                      type="checkbox"
                      className="peer sr-only"
                      checked={checked}
                      onChange={(e) => toggle(s.key, e.target.checked)}
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors duration-200",
                        checked ? "border-secondary bg-secondary text-secondary-foreground" : "border-muted-foreground/50 bg-card"
                      )}
                    >
                      {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </span>
                    <span className="font-body text-[15px] leading-snug text-foreground">{s.label}</span>
                  </label>
                );
              })}
            </fieldset>

            <p className="mt-3 text-sm text-muted-foreground">
              More detail in our{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-secondary-contrast underline underline-offset-2 hover:text-foreground">
                Privacy Policy
              </a>
              .
            </p>

            <FieldError message={error} />

            <PremiumButton variant="primary" size="lg" onClick={submit} dimmed={!allTicked} loading={saving} className="mt-6 w-full gap-2">
              {saving ? "Saving…" : "Agree and start"}
              {!saving && <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />}
            </PremiumButton>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Lock className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
                Saved with your account
              </span>
              <Link to="/" className="font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
                Not now
              </Link>
            </div>
          </FlashcardShell>
        </div>
      </div>
    </div>
  );
};

export default ParentConsentStep;
