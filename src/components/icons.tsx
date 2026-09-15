type IconProps = {
  className?: string;
};

const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconCalendar({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M8 3.5v3M16 3.5v3M3.5 10h17" />
    </svg>
  );
}

export function IconClock({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 8v4.5l3 1.75" />
    </svg>
  );
}

export function IconWallet({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H18a1.5 1.5 0 0 1 1.5 1.5V9" />
      <rect x="3.5" y="9" width="17" height="10.5" rx="2.2" />
      <path d="M15.5 14.25h3.2" />
    </svg>
  );
}

export function IconPin({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <path d="M12 21s6.5-5.2 6.5-10A6.5 6.5 0 0 0 5.5 11c0 4.8 6.5 10 6.5 10z" />
      <circle cx="12" cy="11" r="2.25" />
    </svg>
  );
}

export function IconBuilding({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <path d="M4.5 20.5h15" />
      <path d="M6.5 20.5V7.5L12 4.5l5.5 3v13" />
      <path d="M10 10h.01M14 10h.01M10 13.5h.01M14 13.5h.01M10 17h.01M14 17h.01" />
    </svg>
  );
}

export function IconCash({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <rect x="3.5" y="6.5" width="17" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.4" />
      <path d="M6.5 10.5v3M17.5 10.5v3" />
    </svg>
  );
}

export function IconPhone({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <rect x="7.5" y="3.5" width="9" height="17" rx="2.2" />
      <path d="M11 17.5h2" />
    </svg>
  );
}

export function IconCheck({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M8.5 12.2l2.4 2.4 4.6-5" />
    </svg>
  );
}

export function IconWhatsApp({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M12.04 3.1A8.85 8.85 0 0 0 3.2 11.9c0 1.56.41 3.08 1.19 4.42L3 21l4.82-1.26a8.86 8.86 0 0 0 4.22 1.07h.01a8.85 8.85 0 0 0 8.84-8.85 8.82 8.82 0 0 0-8.85-8.86zm5.15 12.62c-.22.62-1.28 1.14-1.78 1.21-.46.07-1.04.1-1.68-.1-.39-.13-.88-.27-1.52-.53-2.67-1.15-4.4-3.84-4.54-4.02-.13-.17-1.1-1.46-1.1-2.79 0-1.32.69-1.97.94-2.24.24-.27.53-.34.71-.34h.51c.16 0 .38-.06.59.45.22.53.74 1.83.8 1.96.07.13.1.29.02.46-.08.17-.13.29-.26.45-.13.16-.28.35-.4.47-.13.13-.27.27-.11.53.16.27.7 1.15 1.5 1.86 1.03.92 1.9 1.2 2.17 1.34.27.13.43.11.59-.07.16-.17.68-.79.86-1.06.18-.27.36-.22.6-.13.24.08 1.53.72 1.79.85.26.13.43.2.5.31.06.11.06.64-.16 1.26z" />
    </svg>
  );
}

export function IconNequi({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <path d="M7 7.5h7.5a3.5 3.5 0 0 1 0 7H11" />
      <path d="M11 14.5H7.5a3.5 3.5 0 0 1 0-7H9" />
      <path d="M12 4.5v15" />
    </svg>
  );
}
