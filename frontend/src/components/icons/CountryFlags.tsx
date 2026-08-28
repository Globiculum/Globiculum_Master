// Inline SVG country flags for the "Where does your child currently go to
// school?" card. Unicode flag emoji (🇺🇸 etc.) don't render as pictures on
// Windows in most browsers — Windows has no bundled color-emoji font for
// regional-indicator pairs, so it falls back to showing the raw two-letter
// code ("US", "CA", ...) as plain text instead of a flag. Self-contained SVG
// sidesteps that entirely and renders identically on every platform.
//
// Simplified, not vexillologically exact — legible at ~24px icon size is the
// only goal here.

const FLAG_VIEWBOX = "0 0 60 40";

export const UsFlag = () => (
  <svg viewBox={FLAG_VIEWBOX} className="h-full w-full" role="img" aria-label="United States">
    <rect width="60" height="40" fill="#fff" />
    {Array.from({ length: 7 }, (_, i) => (
      <rect key={i} y={(i * 2 * 40) / 13} width="60" height={40 / 13} fill="#B22234" />
    ))}
    <rect width="26" height={(40 / 13) * 7} fill="#3C3B6E" />
  </svg>
);

export const CaFlag = () => (
  <svg viewBox={FLAG_VIEWBOX} className="h-full w-full" role="img" aria-label="Canada">
    <rect width="60" height="40" fill="#fff" />
    <rect width="15" height="40" fill="#D80621" />
    <rect x="45" width="15" height="40" fill="#D80621" />
    <path d="M30 9 L32 15 L38 12 L36 18 L41 20 L35 23 L36 28 L30 25 L24 28 L25 23 L19 20 L24 18 L22 12 L28 15 Z" fill="#D80621" />
  </svg>
);

export const GbFlag = () => (
  <svg viewBox={FLAG_VIEWBOX} className="h-full w-full" role="img" aria-label="United Kingdom">
    <rect width="60" height="40" fill="#00247D" />
    <path d="M0 0 L60 40 M60 0 L0 40" stroke="#fff" strokeWidth="7" />
    <path d="M0 0 L60 40 M60 0 L0 40" stroke="#CF142B" strokeWidth="3" />
    <path d="M30 0 V40 M0 20 H60" stroke="#fff" strokeWidth="11" />
    <path d="M30 0 V40 M0 20 H60" stroke="#CF142B" strokeWidth="5" />
  </svg>
);

export const AuFlag = () => (
  <svg viewBox={FLAG_VIEWBOX} className="h-full w-full" role="img" aria-label="Australia">
    <rect width="60" height="40" fill="#00247D" />
    <path d="M0 0 L28 18 M28 0 L0 18" stroke="#fff" strokeWidth="3.5" />
    <path d="M14 0 V18 M0 9 H28" stroke="#fff" strokeWidth="5.5" />
    <path d="M14 0 V18 M0 9 H28" stroke="#CF142B" strokeWidth="2.5" />
    <circle cx="46" cy="10" r="2.6" fill="#fff" />
    <circle cx="50" cy="27" r="2.2" fill="#fff" />
    <circle cx="39" cy="32" r="1.8" fill="#fff" />
    <circle cx="53" cy="19" r="1.8" fill="#fff" />
    <circle cx="41" cy="21" r="1.4" fill="#fff" />
  </svg>
);

export const AeFlag = () => (
  <svg viewBox={FLAG_VIEWBOX} className="h-full w-full" role="img" aria-label="UAE">
    <rect width="60" height="40" fill="#fff" />
    <rect width="60" height="13.3" fill="#00732F" />
    <rect y="26.7" width="60" height="13.3" fill="#000" />
    <rect width="18" height="40" fill="#FF0000" />
  </svg>
);

export const SgFlag = () => (
  <svg viewBox={FLAG_VIEWBOX} className="h-full w-full" role="img" aria-label="Singapore">
    <rect width="60" height="20" fill="#EF3340" />
    <rect y="20" width="60" height="20" fill="#fff" />
    <circle cx="14" cy="10" r="6" fill="#fff" />
    <circle cx="17" cy="10" r="5" fill="#EF3340" />
    <circle cx="23" cy="4" r="1.1" fill="#fff" />
    <circle cx="27" cy="8" r="1.1" fill="#fff" />
    <circle cx="25" cy="14" r="1.1" fill="#fff" />
    <circle cx="19" cy="16" r="1.1" fill="#fff" />
    <circle cx="17" cy="7" r="1.1" fill="#fff" />
  </svg>
);

export const MyFlag = () => (
  <svg viewBox={FLAG_VIEWBOX} className="h-full w-full" role="img" aria-label="Malaysia">
    <rect width="60" height="40" fill="#fff" />
    {Array.from({ length: 7 }, (_, i) => (
      <rect key={i} y={(i * 2 * 40) / 14} width="60" height={40 / 14} fill="#CC0000" />
    ))}
    <rect width="30" height={(40 / 14) * 8} fill="#010066" />
    <circle cx="12" cy="11.4" r="6" fill="#010066" />
    <circle cx="14.5" cy="11.4" r="5" fill="#FFCC00" />
    <circle cx="23" cy="11.4" r="3" fill="#FFCC00" />
  </svg>
);

