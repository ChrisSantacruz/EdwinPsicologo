import Image from "next/image";

export function BrandMark({
  size = 64,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full bg-[#1a0505] shadow-lg shadow-[#7A1F2B]/25 ${className}`}
      style={{ width: size, height: size }}
      aria-label="Atención psicológica especializada"
    >
      <Image
        src="/brand-logo.png"
        alt="Atención psicológica especializada"
        width={size}
        height={size}
        className="h-full w-full object-cover"
        priority={size >= 64}
      />
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
