import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import {
  Award,
  BookOpen,
  GraduationCap,
  Lightbulb,
  MapPin,
  Sparkles,
  Star,
  Target,
  Users,
} from "lucide-react";

export type LoaderPersona = "parent" | "student";

interface OrbitIcon {
  icon: LucideIcon;
  angle: number; // degrees, 0 = top, clockwise
  duration: number;
  delay: number;
}

const STUDENT_ORBIT: OrbitIcon[] = [
  { icon: BookOpen, angle: 0, duration: 4.2, delay: 0 },
  { icon: Star, angle: 72, duration: 3.6, delay: 0.2 },
  { icon: GraduationCap, angle: 144, duration: 4.6, delay: 0.4 },
  { icon: Lightbulb, angle: 216, duration: 3.8, delay: 0.1 },
  { icon: Award, angle: 288, duration: 4.0, delay: 0.3 },
];

const PARENT_ORBIT: OrbitIcon[] = [
  { icon: MapPin, angle: 0, duration: 4.2, delay: 0 },
  { icon: BookOpen, angle: 72, duration: 3.8, delay: 0.15 },
  { icon: Target, angle: 144, duration: 4.4, delay: 0.3 },
  { icon: Award, angle: 216, duration: 3.6, delay: 0.1 },
  { icon: Sparkles, angle: 288, duration: 4.0, delay: 0.25 },
];

const STUDENT_MESSAGES = [
  "Building your personalized journey...",
  "Matching your strengths...",
  "Preparing recommendations...",
  "Almost ready...",
];

const PARENT_MESSAGES = [
  "Understanding your child's goals...",
  "Building personalized recommendations...",
  "Creating a learning roadmap...",
  "Almost there...",
];

const MESSAGE_INTERVAL_MS = 2200;

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
};

const orbitIconVariants: Variants = {
  hidden: { opacity: 0, scale: 0.4 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] } },
};

// Places 5 icons evenly around a circle of the given radius (px), centered on the parent.
const orbitPosition = (angleDeg: number, radius: number) => {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius };
};

const OrbitRing = ({ icons, shouldReduceMotion }: { icons: OrbitIcon[]; shouldReduceMotion: boolean }) => (
  <motion.div
    className="absolute inset-0"
    animate={shouldReduceMotion ? undefined : { rotate: 360 }}
    transition={{ duration: 34, repeat: Infinity, ease: "linear" }}
  >
    {icons.map(({ icon: Icon, angle, duration, delay }, index) => {
      const { x, y } = orbitPosition(angle, 92);
      return (
        <motion.div
          key={index}
          variants={orbitIconVariants}
          className="absolute left-1/2 top-1/2 flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card shadow-medium"
          style={{ x: x - 22, y: y - 22 }}
          animate={
            shouldReduceMotion
              ? undefined
              : { y: [y - 22, y - 30, y - 22], rotate: [0, -360] }
          }
          transition={{
            y: { duration, repeat: Infinity, ease: "easeInOut", delay },
            rotate: { duration: 34, repeat: Infinity, ease: "linear" },
          }}
        >
          <Icon className="h-5 w-5 text-secondary" />
        </motion.div>
      );
    })}
  </motion.div>
);

const RoadmapPath = ({ shouldReduceMotion }: { shouldReduceMotion: boolean }) => (
  <svg className="absolute inset-0 h-full w-full" viewBox="0 0 200 200" aria-hidden="true">
    <motion.path
      d="M55,140 Q75,80 100,100 T150,55"
      fill="none"
      stroke="hsl(var(--secondary))"
      strokeWidth="2"
      strokeLinecap="round"
      strokeDasharray="6 8"
      opacity="0.5"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 2.2, ease: "easeInOut", repeat: shouldReduceMotion ? 0 : Infinity, repeatDelay: 0.6 }}
    />
    {[
      { cx: 55, cy: 140, delay: 0 },
      { cx: 100, cy: 100, delay: 0.6 },
      { cx: 150, cy: 55, delay: 1.2 },
    ].map((dot, i) => (
      <motion.circle
        key={i}
        cx={dot.cx}
        cy={dot.cy}
        r="4"
        fill="hsl(var(--secondary))"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.3, 1], opacity: 1 }}
        transition={{ duration: 0.5, delay: dot.delay, repeat: shouldReduceMotion ? 0 : Infinity, repeatDelay: 1.5 }}
      />
    ))}
  </svg>
);

const CenterIllustration = ({ persona, shouldReduceMotion }: { persona: LoaderPersona; shouldReduceMotion: boolean }) => (
  <div className="relative h-14 w-14">
    {persona === "student" ? (
      <motion.div
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-cta text-white shadow-glow-md"
        animate={shouldReduceMotion ? undefined : { scale: [1, 1.06, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <GraduationCap className="h-7 w-7" />
      </motion.div>
    ) : (
      <>
        <RoadmapPath shouldReduceMotion={shouldReduceMotion} />
        <motion.div
          className="absolute -left-1 -top-1 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-white shadow-medium"
          animate={shouldReduceMotion ? undefined : { scale: [1, 1.08, 1] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <Users className="h-4 w-4" />
        </motion.div>
        <motion.div
          className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-violet text-white shadow-medium"
          animate={shouldReduceMotion ? undefined : { scale: [1, 1.08, 1] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        >
          <GraduationCap className="h-4 w-4" />
        </motion.div>
      </>
    )}
  </div>
);

interface ReportGenerationLoaderProps {
  persona: LoaderPersona;
}

// Full-screen premium loading experience shown while the report-generation
// pipeline (validate-student-data -> assessments insert -> analyze-curriculum
// -> diagnostics-engine -> diagnostic_results insert) runs. Mounted directly
// by ParentStep5 / StudentReviewStep whenever their submission is in flight;
// unmounts automatically the moment they navigate away or the call fails.
const ReportGenerationLoader = ({ persona }: ReportGenerationLoaderProps) => {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const messages = persona === "student" ? STUDENT_MESSAGES : PARENT_MESSAGES;
  const orbit = persona === "student" ? STUDENT_ORBIT : PARENT_ORBIT;
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    // Advances through the list once and holds on the final message — looping
    // back to "Building your journey..." after reaching "Almost ready..."
    // would read as the process going backwards on a long-running request.
    const id = window.setInterval(() => {
      setMessageIndex((prev) => (prev < messages.length - 1 ? prev + 1 : prev));
    }, MESSAGE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [messages.length]);

  return (
    <motion.div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-background/95 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* ambient glow background */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-secondary/15 via-violet/10 to-mint/15 blur-3xl"
          animate={shouldReduceMotion ? undefined : { opacity: [0.6, 1, 0.6], scale: [0.95, 1.03, 0.95] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div
        className="relative flex w-full max-w-sm flex-col items-center px-6 text-center"
        initial="hidden"
        animate="show"
        variants={containerVariants}
      >
        {/* orbiting icon ring + center illustration */}
        <div className="relative mb-8 flex h-52 w-52 items-center justify-center">
          <OrbitRing icons={orbit} shouldReduceMotion={shouldReduceMotion} />
          <CenterIllustration persona={persona} shouldReduceMotion={shouldReduceMotion} />
        </div>

        {/* rotating status message */}
        <div className="mb-4 flex h-6 items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={messageIndex}
              className="text-base font-medium text-foreground"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              {messages[messageIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* pulsing dots — reassures the process is still active while the
            message is holding on its final entry */}
        <div className="mb-5 flex items-center justify-center gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-secondary"
              animate={shouldReduceMotion ? undefined : { opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
            />
          ))}
        </div>

        {/* indeterminate progress indicator — there's no real progress signal
            from the multi-step backend pipeline, so this never claims a
            percentage; it just sweeps continuously for as long as this
            component stays mounted (i.e. for the full duration of the
            actual submitAssessment() promise, not a guessed timeout). */}
        <div className="h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full w-1/3 rounded-full bg-gradient-cta"
            animate={shouldReduceMotion ? { x: "40%" } : { x: ["-100%", "220%"] }}
            transition={shouldReduceMotion ? undefined : { duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ReportGenerationLoader;
