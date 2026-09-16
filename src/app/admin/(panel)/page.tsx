import Link from "next/link";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/status-badge";
import { formatAppointmentDate, formatAppointmentTime, formatMoney } from "@/lib/format";
import { addDays } from "date-fns";
import { endOfBogotaDay, startOfBogotaDay } from "@/lib/time";
import { markNotificationsReadAction } from "@/app/actions";
import { NotificationsPanel } from "@/components/notifications-panel";
import { isWhatsAppConfigured } from "@/lib/whatsapp";

export default async function AdminDashboardPage() {
  const now = new Date();
  const todayStart = startOfBogotaDay(now);
  const todayEnd = endOfBogotaDay(now);
  const tomorrowEnd = endOfBogotaDay(addDays(now, 1));
  const waReady = isWhatsAppConfigured();

  const [appointments, todayAppts, tomorrowAppts, awaitingCount, pendingCount, confirmedCount, notifications] =
    await Promise.all([
      prisma.appointment.findMany({
        include: { service: true, location: true },
        orderBy: { scheduledAt: "desc" },
        take: 40,
      }),
      prisma.appointment.findMany({
        where: {
          scheduledAt: { gte: todayStart, lte: todayEnd },
          status: { not: "CANCELLED" },
        },
        include: { service: true },
        orderBy: { scheduledAt: "asc" },
      }),
      prisma.appointment.findMany({
        where: {
          scheduledAt: { gt: todayEnd, lte: tomorrowEnd },
          status: { not: "CANCELLED" },
        },
        include: { service: true },
        orderBy: { scheduledAt: "asc" },
      }),
      prisma.appointment.count({
        where: { status: { in: ["AWAITING_PROOF", "AWAITING_EDWIN"] } },
      }),
      prisma.appointment.count({
        where: { status: "PENDING_PATIENT" },
      }),
      prisma.appointment.count({
        where: { status: "CONFIRMED" },
      }),
      prisma.notification.findMany({
        where: { read: false },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

  const pending = pendingCount;
  const confirmed = confirmedCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-3xl font-semibold text-ink">Agenda</h2>
          <p className="mt-1 text-sm text-muted">
            Hoy y mañana
            {waReady ? " · WhatsApp listo" : " · WhatsApp: abrir desde cada cita"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/citas/nueva" className="ios-btn ios-btn-primary">
            Nueva cita
          </Link>
        </div>
      </div>

      {notifications.length > 0 ? (
        <NotificationsPanel
          items={notifications.map((n) => ({
            id: n.id,
            title: n.title,
            body: n.body,
            appointmentId: n.appointmentId,
            createdAt: n.createdAt.toISOString(),
          }))}
          markAllAction={markNotificationsReadAction}
        />
      ) : null}

      <div className="grid grid-cols-3 gap-3">
        <div className="ios-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Pendientes</p>
          <p className="mt-1 text-2xl font-bold text-ink">{pending}</p>
        </div>
        <div className="ios-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Por confirmar</p>
          <p className="mt-1 text-2xl font-bold text-burgundy">{awaitingCount}</p>
        </div>
        <div className="ios-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Confirmadas</p>
          <p className="mt-1 text-2xl font-bold text-success">{confirmed}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="ios-card overflow-hidden">
          <div className="border-b border-line px-4 py-3">
            <p className="font-semibold text-ink">Hoy</p>
          </div>
          {todayAppts.length === 0 ? (
            <p className="p-4 text-sm text-muted">Sin citas para hoy</p>
          ) : (
            <ul className="divide-y divide-line">
              {todayAppts.map((a) => (
                <li key={a.id}>
                  <Link href={`/admin/citas/${a.id}`} className="block px-4 py-3 hover:bg-burgundy/[0.03]">
                    <p className="font-medium text-ink">{a.patientName}</p>
                    <p className="text-sm text-muted">
                      {formatAppointmentTime(a.scheduledAt)} · {a.service.name}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="ios-card overflow-hidden">
          <div className="border-b border-line px-4 py-3">
            <p className="font-semibold text-ink">Mañana</p>
          </div>
          {tomorrowAppts.length === 0 ? (
            <p className="p-4 text-sm text-muted">Sin citas mañana</p>
          ) : (
            <ul className="divide-y divide-line">
              {tomorrowAppts.map((a) => (
                <li key={a.id}>
                  <Link href={`/admin/citas/${a.id}`} className="block px-4 py-3 hover:bg-burgundy/[0.03]">
                    <p className="font-medium text-ink">{a.patientName}</p>
                    <p className="text-sm text-muted">
                      {formatAppointmentTime(a.scheduledAt)} · {a.service.name}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="ios-card overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <p className="font-semibold text-ink">Todas las citas</p>
        </div>
        {appointments.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-medium text-ink">Aún no hay citas</p>
            <p className="mt-1 text-sm text-muted">Crea la primera para generar el mensaje de WhatsApp</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {appointments.map((appt) => (
              <li key={appt.id}>
                <Link
                  href={`/admin/citas/${appt.id}`}
                  className="block px-4 py-4 transition hover:bg-burgundy/[0.03]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{appt.patientName}</p>
                      <p className="mt-0.5 text-sm text-muted">
                        {formatAppointmentDate(appt.scheduledAt)} ·{" "}
                        {formatAppointmentTime(appt.scheduledAt)}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-brown">
                        {appt.service.name} · {appt.location.name}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <StatusBadge status={appt.status} />
                      <p className="mt-2 text-sm font-semibold text-ink">
                        {formatMoney(appt.price)}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
