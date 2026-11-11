import { cn } from "@/lib/utils";

// A small "Optional" pill placed right after a question's title, in both
// assessments, so an optional question reads as optional at a glance instead
// of only in the hint line below it.
const OptionalBadge = ({ className }: { className?: string }) => (
  <span
    className={cn(
      "ml-2 inline-flex translate-y-[-2px] items-center rounded-full border border-border bg-muted/80 px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
      className
    )}
  >
    Optional
  </span>
);

export default OptionalBadge;
