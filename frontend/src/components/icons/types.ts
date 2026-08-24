// Shared prop contract for every Globiculum icon component — keeps the
// family consistent (same size/color knobs everywhere) and means no icon
// needs its own bespoke prop shape. Colors default to the design system's
// existing CSS custom properties (see frontend/src/index.css) rather than
// hardcoded hex, so the icons follow the app's theme (including dark mode)
// automatically unless a caller overrides them.
export interface GlobiculumIconProps {
  /** Width/height in px — icons are square. Default 24 (matches Lucide's default, so drop-in replacement sizing works the same). */
  size?: number;
  className?: string;
  /** Dominant fill. Each icon defaults this to its assigned brand color. */
  primaryColor?: string;
  /** Secondary fill for the icon's second tone. */
  secondaryColor?: string;
  /** Small accent details (e.g. a dot, a badge) — optional third tone. */
  accentColor?: string;
}
