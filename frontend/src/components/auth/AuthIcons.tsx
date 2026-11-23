// Icons from the Version 2 design (same 1.8 stroke), all decorative.
import type { SVGProps } from "react";

const SLATE = "#64748B";

const Stroke = ({ children, size = 20, color = SLATE, ...props }: SVGProps<SVGSVGElement> & { size?: number; color?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    {children}
  </svg>
);

export const MailIcon = () => (
  <Stroke>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  </Stroke>
);

export const LockIcon = () => (
  <Stroke>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Stroke>
);

export const UserIcon = () => (
  <Stroke>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
  </Stroke>
);

export const EyeIcon = () => (
  <Stroke>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Stroke>
);

/** Not in the design (it draws only the eye): the same eye, struck through. */
export const EyeOffIcon = () => (
  <Stroke>
    <path d="M9.9 5.2A9.8 9.8 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1" />
    <path d="M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    <path d="M3 3l18 18" />
  </Stroke>
);

export const ArrowIcon = () => (
  <Stroke size={18} color="#FFFFFF">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Stroke>
);

/** The official four-colour Google "G". */
export const GoogleMark = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z" />
    <path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.2 1.5-5 2.3-8.2 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
  </svg>
);

// Status icons for the email and password pages (same stroke style).
export const MailCheckIcon = () => (
  <Stroke size={28} color="currentColor">
    <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8" />
    <path d="M3 7l9 6 9-6" />
    <path d="M16 19l2 2 4-4" />
  </Stroke>
);

export const KeyIcon = () => (
  <Stroke size={28} color="currentColor">
    <circle cx="7.5" cy="15.5" r="4.5" />
    <path d="M10.7 12.3L20 3M16 7l3 3M18 5l2 2" />
  </Stroke>
);

export const AlertIcon = () => (
  <Stroke size={28} color="currentColor">
    <path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <path d="M12 9v4M12 17h.01" />
  </Stroke>
);

/** Faint network texture on the teal panel (520 x 340). */
export const PanelNetwork = ({ className }: { className?: string }) => (
  <svg className={className} width="520" height="340" viewBox="0 0 520 340" aria-hidden="true" focusable="false">
    <g stroke="#0D9488" strokeWidth="1">
      <line x1="30" y1="260" x2="120" y2="190" />
      <line x1="120" y1="190" x2="230" y2="215" />
      <line x1="120" y1="190" x2="190" y2="90" />
      <line x1="190" y1="90" x2="320" y2="120" />
      <line x1="230" y1="215" x2="320" y2="120" />
      <line x1="320" y1="120" x2="430" y2="60" />
      <line x1="230" y1="215" x2="360" y2="290" />
      <line x1="320" y1="120" x2="480" y2="190" />
    </g>
    <g fill="#0D9488">
      {[[30, 260], [120, 190], [230, 215], [190, 90], [320, 120], [430, 60], [360, 290], [480, 190]].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.5" />
      ))}
    </g>
  </svg>
);

/** Network lines in the card's top-right corner (170 x 140, flipped). */
export const CardNetwork = ({ className }: { className?: string }) => (
  <svg className={className} width="170" height="140" viewBox="0 0 220 180" aria-hidden="true" focusable="false">
    <g stroke="#0D9488" strokeWidth="1">
      <line x1="20" y1="150" x2="80" y2="100" />
      <line x1="80" y1="100" x2="150" y2="120" />
      <line x1="80" y1="100" x2="120" y2="40" />
      <line x1="120" y1="40" x2="190" y2="60" />
      <line x1="150" y1="120" x2="200" y2="160" />
      <line x1="150" y1="120" x2="190" y2="60" />
    </g>
    <g fill="#0D9488">
      {[[20, 150], [80, 100], [150, 120], [120, 40], [190, 60], [200, 160]].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3" />
      ))}
    </g>
  </svg>
);
