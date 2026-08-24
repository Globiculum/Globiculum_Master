import type { GlobiculumIconProps } from "./types";

// Country / Location — a simplified globe: teal sphere, violet meridian +
// equator lines.
const GlobiculumGlobeIcon = ({
  size = 24,
  className,
  primaryColor = "hsl(var(--secondary))",
  secondaryColor = "hsl(var(--violet))",
}: GlobiculumIconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
    <circle cx="24" cy="24" r="16" fill={primaryColor} />
    <ellipse cx="24" cy="24" rx="7" ry="16" stroke={secondaryColor} strokeWidth="2" fill="none" />
    <line x1="8" y1="24" x2="40" y2="24" stroke={secondaryColor} strokeWidth="2" />
    <path d="M11 16C15 18 33 18 37 16" stroke={secondaryColor} strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M11 32C15 30 33 30 37 32" stroke={secondaryColor} strokeWidth="2" fill="none" strokeLinecap="round" />
  </svg>
);

export default GlobiculumGlobeIcon;
