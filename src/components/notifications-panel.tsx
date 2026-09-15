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

export function NotificationsPanel({
  items,
  markAllAction,
}: {
  items: Item[];
  markAllAction: () => Promise<{ ok?: boolean }>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <section className="ios-card overflow-hidden border-burgundy/20">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-burgundy/[0.04] px-4 py-3">
        <div>
          <p className="font-semibold text-burgundy">Alertas nuevas</p>
          <p className="text-xs text-muted">Confirmaciones de pacientes y pagos</p>
        </div>
        <button
          type="button"
          disabled={pending}
          className="text-sm font-semibold text-burgundy disabled:opacity-50"
          onClick={() =>
          startTransition(() => {
            void markAllAction();
          })
        }
        >
          Marcar leídas
        </button>
      </div>
      <ul className="divide-y divide-line">
        {items.map((n) => (
          <li key={n.id} className="px-4 py-3">
            <p className="font-medium text-ink">{n.title}</p>
            <p className="mt-0.5 text-sm text-muted">{n.body}</p>
            <p className="mt-1 text-xs text-brown">
              {formatAppointmentDate(new Date(n.createdAt))} ·{" "}
              {formatAppointmentTime(new Date(n.createdAt))}
            </p>
            {n.appointmentId ? (
              <div className="mt-2 flex flex-wrap gap-3">
                <Link
                  href={`/admin/citas/${n.appointmentId}`}
                  className="text-sm font-semibold text-burgundy"
                >
                  Ver cita →
                </Link>
                {n.body.includes("calendar.google.com") ? (
                  <a
                    href={n.body.match(/https:\/\/calendar\.google\.com[^\s]+/)?.[0]}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-brown"
                  >
                    Calendar →
                  </a>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
