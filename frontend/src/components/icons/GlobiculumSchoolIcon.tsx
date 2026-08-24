import type { GlobiculumIconProps } from "./types";

// School / Education — a simplified schoolhouse: teal roof, mint body,
// amber flag for a single warm accent.
const GlobiculumSchoolIcon = ({
  size = 24,
  className,
  primaryColor = "hsl(var(--secondary))",
  secondaryColor = "hsl(var(--mint))",
  accentColor = "hsl(var(--accent))",
}: GlobiculumIconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
    <rect x="10" y="22" width="28" height="18" rx="3" fill={secondaryColor} />
    <path d="M6 23L24 10L42 23C42.8 23.6 42.4 25 41.3 25H6.7C5.6 25 5.2 23.6 6 23Z" fill={primaryColor} />
    <rect x="20" y="29" width="8" height="11" rx="1.5" fill={primaryColor} />
    <rect x="23.5" y="6" width="2" height="7" rx="1" fill={accentColor} />
    <path d="M25.5 7H31C31.8 7 32.1 8 31.5 8.5L29 10.5L31.5 12.5C32.1 13 31.8 14 31 14H25.5V7Z" fill={accentColor} />
  </svg>
);

export default GlobiculumSchoolIcon;
