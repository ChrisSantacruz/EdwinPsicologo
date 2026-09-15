import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { BrandMark } from "@/components/brand";

const links = [
  { href: "/admin", label: "Agenda" },
  { href: "/admin/citas/nueva", label: "Nueva cita" },
  { href: "/admin/contactos", label: "Contactos" },
  { href: "/admin/sedes", label: "Sedes" },
  { href: "/admin/servicios", label: "Servicios" },
  { href: "/admin/ajustes", label: "Ajustes" },
  { href: "/manual", label: "Manual" },
];

export function AdminNav({ name, unread = 0 }: { name: string; unread?: number }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark size={42} />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-burgundy">
              Atención psicológica
            </p>
            <h1 className="truncate font-display text-lg font-semibold text-ink">{name}</h1>
          </div>
          {unread > 0 ? (
            <span className="rounded-full bg-burgundy px-2.5 py-1 text-xs font-bold text-white">
              {unread} nuevas
            </span>
          ) : null}
        </div>
        <form action={logoutAction}>
          <button type="submit" className="ios-btn ios-btn-ghost text-sm">
            Salir
          </button>
        </form>
      </div>
      <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-3 pb-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium text-brown hover:bg-burgundy/8"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
