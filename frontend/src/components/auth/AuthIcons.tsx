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

/**
 * The teal waves on the right of the auth pages (25 Nov 2026 mock), drawn at
 * 1621 x 831 and stretched to the screen, so the wave's edge stays where the
 * mock has it (about 55% across) on any screen shape.
 */
export const AuthWaves = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 1621 831" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="ga-waves-main" x1="860" y1="0" x2="1621" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#d9f2ee" />
        <stop offset="0.3" stopColor="#b3e6de" />
        <stop offset="0.62" stopColor="#6cc7be" />
        <stop offset="1" stopColor="#2a9893" />
      </linearGradient>
      <linearGradient id="ga-waves-deep" x1="1150" y1="0" x2="1621" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#2a9f98" stopOpacity="0" />
        <stop offset="1" stopColor="#17807a" stopOpacity="0.85" />
      </linearGradient>
      <linearGradient id="ga-waves-band" x1="700" y1="0" x2="1621" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#c9eee7" stopOpacity="0.95" />
        <stop offset="0.5" stopColor="#8fd8cd" stopOpacity="0.85" />
        <stop offset="1" stopColor="#3fb0a7" stopOpacity="0.7" />
      </linearGradient>
      <linearGradient id="ga-waves-foot" x1="0" y1="640" x2="0" y2="831" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#1f8d87" stopOpacity="0" />
        <stop offset="1" stopColor="#16736e" stopOpacity="0.9" />
      </linearGradient>
      <filter id="ga-waves-soft" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation="6" />
      </filter>
    </defs>
    <path d="M880,0 C855,110 950,190 955,300 C960,410 840,500 790,600 C755,670 742,760 738,831 L1621,831 L1621,0 Z" fill="url(#ga-waves-main)" />
    <path d="M1170,0 C1250,160 1220,380 1330,560 C1420,705 1530,760 1621,790 L1621,0 Z" fill="url(#ga-waves-deep)" filter="url(#ga-waves-soft)" />
    <path d="M700,831 C770,715 900,640 1060,632 C1250,622 1380,700 1621,650 L1621,831 Z" fill="url(#ga-waves-band)" />
    <path d="M1080,831 C1260,790 1450,720 1621,690 L1621,831 Z" fill="url(#ga-waves-foot)" />
    <path
      d="M880,0 C855,110 950,190 955,300 C960,410 840,500 790,600 C755,670 742,760 738,831"
      fill="none"
      stroke="#ffffff"
      strokeOpacity="0.55"
      strokeWidth="3"
      filter="url(#ga-waves-soft)"
    />
    <path d="M760,700 C900,600 1100,590 1290,660" fill="none" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="2" filter="url(#ga-waves-soft)" />
  </svg>
);

/** The graduation cap with its sparks and dashed trail, between the headline and the waves. */
export const CapDoodle = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 265 210" fill="none" aria-hidden="true" focusable="false">
    <path d="M150 118 C118 150 98 122 72 160 S30 192 4 206" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="7 8" />
    {/* The cap: lucide's graduation-cap outline, enlarged and tilted. */}
    <g transform="translate(140 22) rotate(-14 48 48) scale(4)" stroke="#0f766e" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
      <path d="M22 10v6" />
      <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
    </g>
    <g stroke="#f59e0b" strokeWidth="3" strokeLinecap="round">
      <path d="M232 14 L238 2" />
      <path d="M244 26 L257 20" />
      <path d="M246 42 L259 44" />
    </g>
  </svg>
);
