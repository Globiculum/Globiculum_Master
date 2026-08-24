import type { KeyboardEvent } from "react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PersonaCardChip {
  icon: LucideIcon;
  label: string;
}

export interface PersonaCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  chips: PersonaCardChip[];
  accent: "primary" | "violet";
  selected: boolean;
  onSelect: () => void;
}

const ACCENT_STYLES = {
  primary: {
    // Idle badge is a teal-tinted glass tile (not a navy tint, which would
    // vanish against the card's own dark-glass surface) — reads as Parent's
    // teal identity even before selection.
    iconWrap: "bg-secondary/20 border-secondary/30",
    icon: "text-mint",
    border: "from-secondary via-mint to-secondary",
    selectedIconWrap: "bg-gradient-to-br from-secondary to-primary border-transparent",
    selectedIcon: "text-white",
    chipIcon: "text-mint",
  },
  violet: {
    iconWrap: "bg-violet/20 border-violet/30",
    icon: "text-violet",
    border: "from-violet via-secondary to-violet",
    // Selected state: solid dark blue-violet fill, mirroring Parent's treatment.
    selectedIconWrap: "bg-gradient-to-br from-violet to-primary border-transparent",
    selectedIcon: "text-white",
    chipIcon: "text-violet",
  },
} as const;

// Premium selection card: refined tinted icon badge (not a solid color
// block), a gradient border ring that appears on hover and intensifies when
// selected, a one-time selection pulse, and an animated checkmark.
// role/tabIndex/aria-pressed/onClick/onKeyDown are unchanged — this is the
// exact same interaction contract as the original inline Card markup.
const PersonaCard = ({ icon: Icon, title, description, chips, accent, selected, onSelect }: PersonaCardProps) => {
  const styles = ACCENT_STYLES[accent];

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  };

  return (
    <motion.div
      className={cn(
        "group relative rounded-[1.35rem] p-[1.5px] transition-colors duration-200",
        selected ? cn("bg-gradient-to-br", styles.border) : "bg-white/15"
      )}
      whileHover={{ y: -6, scale: 1.015 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      {/* hover-only gradient tint — kept low-opacity since the card face itself
          is translucent glass; at full opacity this fully repaints the card a
          solid color instead of reading as a subtle ring/glow. */}
      {!selected && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 rounded-[1.35rem] bg-gradient-to-br opacity-0 transition-opacity duration-200 group-hover:opacity-25",
            styles.border
          )}
        />
      )}

      <div
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        onClick={onSelect}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative flex h-full cursor-pointer select-none items-start gap-4 rounded-[calc(1.35rem-1.5px)] p-6 text-left backdrop-blur-xl",
          "shadow-soft transition-[background-color,box-shadow] duration-200 ease-out group-hover:shadow-glow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          // Selected stays at a fixed opaque navy glass — no hover variant —
          // otherwise hovering an already-selected card would fall back to
          // the near-transparent idle fill and let the bright gradient ring
          // behind it (see wrapper above) bleed through the whole face again.
          selected ? "bg-primary/40 shadow-glow-md" : "bg-white/10 hover:bg-white/[0.14]"
        )}
      >
        {selected && (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[calc(1.35rem-1.5px)]"
            initial={{ boxShadow: "0 0 0 0px hsl(var(--secondary) / 0.45)" }}
            animate={{ boxShadow: "0 0 0 12px hsl(var(--secondary) / 0)" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        )}

        {selected && (
          <motion.span
            className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-medium"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
          >
            <Check className="h-3.5 w-3.5" />
          </motion.span>
        )}

        <motion.div
          animate={{ scale: selected ? 1.15 : 1 }}
          whileHover={{ rotate: 4, scale: selected ? 1.15 : 1.05 }}
          transition={{ type: "spring", stiffness: 500, damping: 20 }}
          className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border transition-colors duration-200",
            selected ? styles.selectedIconWrap : styles.iconWrap,
            selected && "shadow-glow-sm"
          )}
        >
          <Icon className={cn("h-6 w-6 transition-colors duration-200", selected ? styles.selectedIcon : styles.icon)} />
        </motion.div>

        <div className="min-w-0 flex-1 pr-6">
          <h3 className="text-h3 text-white">{title}</h3>
          <p className="mt-1 text-caption text-white/70">{description}</p>

          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <span
                key={chip.label}
                className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/80"
              >
                <chip.icon className={cn("h-3 w-3", styles.chipIcon)} />
                {chip.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PersonaCard;
