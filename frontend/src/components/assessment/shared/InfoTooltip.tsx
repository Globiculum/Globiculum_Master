import { Info } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface InfoTooltipProps {
  description: string;
}

// Hover-to-open on desktop, tap-to-toggle on mobile, dismisses on outside
// tap/click (Popover's built-in behavior) — one component covers both.
const InfoTooltip = ({ description }: InfoTooltipProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="More information"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((prev) => !prev);
          }}
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-secondary/10 hover:text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        side="top"
        align="start"
        sideOffset={8}
        className="w-[260px] max-w-[280px] rounded-xl border-border bg-card p-3 text-sm leading-snug text-muted-foreground shadow-medium"
      >
        {description}
      </PopoverContent>
    </Popover>
  );
};

export default InfoTooltip;
