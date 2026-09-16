export function BrandMark({
  size = 64,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full shadow-lg shadow-[#7A1F2B]/25 ${className}`}
      style={{ width: size, height: size }}
      aria-label="Atención psicológica especializada"
    >
      <svg viewBox="0 0 100 100" className="h-full w-full" role="img">
        <defs>
          <linearGradient id="ribbon" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F2C14E" />
            <stop offset="55%" stopColor="#E07A2F" />
            <stop offset="100%" stopColor="#7A1F2B" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="#7A1F2B" />
        <circle cx="50" cy="50" r="42" fill="#FAF6F4" />
        <path
          d="M32 62c8-18 14-28 22-28 6 0 8 5 8 10 0 10-8 16-16 22 10-2 22-8 28-18 2 12-8 24-22 28-12 4-24-2-20-14z"
          fill="url(#ribbon)"
        />
        <circle cx="50" cy="50" r="46" fill="none" stroke="#7A1F2B" strokeWidth="1.5" opacity="0.35" />
      </svg>
    </div>
  );
}

export function BrandHeader({
  subtitle,
  align = "center",
}: {
  subtitle?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "text-center" : "text-left"}>
      <div className={align === "center" ? "mx-auto mb-4 w-fit" : "mb-3"}>
        <BrandMark size={72} />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-burgundy">
        Atención psicológica especializada
      </p>
      <h1 className="mt-2 font-display text-2xl font-bold text-ink sm:text-[1.7rem]">
        Edwin Mideros Meza
      </h1>
      <p className="mt-1 text-sm text-muted">Psicólogo Clínico</p>
      {subtitle ? <p className="mt-3 text-sm leading-relaxed text-brown">{subtitle}</p> : null}
    </div>
  );
}
