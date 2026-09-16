"use client";

import Link from "next/link";
import { useTransition } from "react";
import { formatAppointmentDate, formatAppointmentTime } from "@/lib/format";

type Item = {
  id: string;
  title: string;
  body: string;
  appointmentId: string | null;
  createdAt: string;
};

function toneFor(title: string) {
  const t = title.toLowerCase();
  if (t.includes("nequi") && (t.includes("listo") || t.includes("confirm"))) {
    return {
      accent: "bg-success/15 text-success",
      label: "Pago",
    };
  }
  if (t.includes("nequi")) {
    return {
      accent: "bg-burgundy/10 text-burgundy",
      label: "Nequi",
    };
  }
  if (t.includes("confirm")) {
    return {
      accent: "bg-success/15 text-success",
      label: "Confirmada",
    };
  }
  if (t.includes("mensaje")) {
    return {
      accent: "bg-brown/10 text-brown",
      label: "Mensaje",
    };
  }
  return {
    accent: "bg-burgundy/10 text-burgundy",
    label: "Aviso",
  };
}

function relativeLabel(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return `${formatAppointmentDate(new Date(iso))} · ${formatAppointmentTime(new Date(iso))}`;
}

export function NotificationsPanel({
  items,
  markAllAction,
}: {
  items: Item[];
  markAllAction: () => Promise<{ ok?: boolean }>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <section className="overflow-hidden rounded-[28px] border border-burgundy/15 bg-gradient-to-b from-burgundy/[0.06] to-white shadow-[0_12px_40px_rgba(122,31,43,0.06)]">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <div>
          <p className="font-display text-xl font-semibold text-ink">Novedades</p>
          <p className="text-xs text-muted">Lo que tus pacientes acaban de confirmar</p>
        </div>
        <button
          type="button"
          disabled={pending}
          className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-burgundy shadow-sm disabled:opacity-50"
          onClick={() =>
            startTransition(() => {
              void markAllAction();
            })
          }
        >
          Marcar leídas
        </button>
      </div>

      <ul className="space-y-2 px-3 pb-4">
        {items.map((n) => {
          const tone = toneFor(n.title);
          const inner = (
            <div className="flex gap-3 rounded-2xl bg-white/90 px-3.5 py-3 shadow-sm ring-1 ring-line/70 transition hover:ring-burgundy/20">
              <span
                className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-[10px] font-bold uppercase tracking-wide ${tone.accent}`}
              >
                {tone.label.slice(0, 4)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-snug text-ink">{n.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">{n.body}</p>
                <p className="mt-1.5 text-[11px] font-medium text-brown/80">
                  {relativeLabel(n.createdAt)}
                </p>
              </div>
            </div>
          );

          return (
            <li key={n.id}>
              {n.appointmentId ? (
                <Link href={`/admin/citas/${n.appointmentId}`} className="block">
                  {inner}
                </Link>
              ) : (
                inner
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
