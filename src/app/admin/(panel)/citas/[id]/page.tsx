import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/status-badge";
import { CopyButton, ConfirmNequiButton } from "@/components/client-actions";
import { EditAppointmentForm } from "@/components/edit-appointment-form";
import { SendWhatsAppApiButton } from "@/components/send-whatsapp-button";
import {
  formatAppointmentDate,
  formatAppointmentTime,
  formatMoney,
  formatPhoneDisplay,
  whatsappLink,
} from "@/lib/format";
import {
  cancelAppointmentAction,
  confirmNequiAction,
  sendAppointmentWhatsAppAction,
} from "@/app/actions";
import { PRACTICE } from "@/lib/constants";
import { isWhatsAppConfigured } from "@/lib/whatsapp";
import { getAppUrl } from "@/lib/app-url";

export default async function AppointmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ updated?: string }>;
}) {
  const { id } = await params;
  const { updated } = await searchParams;

  const [appointment, services, locations] = await Promise.all([
    prisma.appointment.findUnique({
      where: { id },
      include: { service: true, location: true, patient: true },
    }),
    prisma.service.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.location.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  if (!appointment) notFound();

  const appUrl = getAppUrl();
  const confirmUrl = `${appUrl}/c/${appointment.token}`;
  const message = appointment.whatsappMessage ?? "";
  const waPatient = whatsappLink(appointment.patientPhone, message);
  const waConfigured = isWhatsAppConfigured();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href="/admin" className="text-sm font-medium text-burgundy">
            ← Agenda
          </Link>
          <h2 className="mt-2 font-display text-3xl font-semibold text-ink">
            {appointment.patientName}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {formatPhoneDisplay(appointment.patientPhone)}
          </p>
          {appointment.patientId ? (
            <Link
              href={`/admin/contactos/${appointment.patientId}`}
              className="mt-1 inline-block text-sm font-semibold text-brown"
            >
              Ver historial del paciente →
            </Link>
          ) : null}
        </div>
        <StatusBadge status={appointment.status} />
      </div>

      {updated ? (
        <p className="rounded-2xl bg-success/10 px-4 py-3 text-sm font-medium text-success">
          Cita actualizada · mensaje y Calendar regenerados
        </p>
      ) : null}

      <div className="ios-card space-y-3 p-5">
        <DetailRow label="Fecha" value={formatAppointmentDate(appointment.scheduledAt)} />
        <DetailRow label="Hora" value={formatAppointmentTime(appointment.scheduledAt)} />
        <DetailRow label="Actividad" value={appointment.service.name} />
        <DetailRow label="Inversión" value={formatMoney(appointment.price)} />
        <DetailRow label="Sede" value={appointment.location.name} />
        <DetailRow label="Dirección" value={appointment.location.address} />
        <DetailRow label="Barrio" value={appointment.location.neighborhood} />
        {appointment.paymentMethod ? (
          <DetailRow label="Pago" value={appointment.paymentMethod} />
        ) : null}
        <DetailRow
          label="Google Calendar"
          value={appointment.googleEventId ? "Evento creado" : "Sin conectar / pendiente"}
        />
      </div>

      <EditAppointmentForm
        appointment={{
          id: appointment.id,
          patientName: appointment.patientName,
          patientPhone: appointment.patientPhone,
          scheduledAt: appointment.scheduledAt.toISOString(),
          price: appointment.price,
          notes: appointment.notes,
          serviceId: appointment.serviceId,
          locationId: appointment.locationId,
        }}
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          defaultPrice: s.defaultPrice,
        }))}
        locations={locations.map((l) => ({ id: l.id, name: l.name }))}
      />

      <div className="ios-card space-y-3 p-5">
        <h3 className="font-display text-xl font-semibold text-ink">WhatsApp</h3>
        <pre className="whitespace-pre-wrap rounded-2xl bg-canvas p-4 text-sm leading-relaxed text-ink">
          {message}
        </pre>
        <SendWhatsAppApiButton
          configured={waConfigured}
          action={sendAppointmentWhatsAppAction.bind(null, appointment.id)}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <a href={waPatient} target="_blank" rel="noreferrer" className="ios-btn ios-btn-secondary">
            Abrir en WhatsApp
          </a>
          <CopyButton text={message} />
        </div>
        <div className="rounded-2xl border border-line bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Link paciente</p>
          <p className="mt-1 break-all text-sm text-burgundy">{confirmUrl}</p>
          <div className="mt-2">
            <CopyButton text={confirmUrl} label="Copiar link" />
          </div>
        </div>
      </div>

      {appointment.status === "AWAITING_PROOF" ? (
        <div className="ios-card space-y-3 border-burgundy/20 p-5">
          <h3 className="font-display text-xl font-semibold text-ink">Comprobante Nequi pendiente</h3>
          <p className="text-sm text-muted">
            Cuando el paciente te envíe el pantallazo al WhatsApp{" "}
            {formatPhoneDisplay(PRACTICE.phone)}, confirma aquí para marcar la cita y actualizar
            Calendar.
          </p>
          <ConfirmNequiButton action={confirmNequiAction.bind(null, appointment.id)} />
        </div>
      ) : null}

      {appointment.status !== "CANCELLED" ? (
        <form
          action={async () => {
            "use server";
            await cancelAppointmentAction(appointment.id);
          }}
        >
          <button type="submit" className="ios-btn ios-btn-danger w-full">
            Cancelar cita
          </button>
        </form>
      ) : null}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="max-w-[65%] text-right text-sm font-medium text-ink">{value}</span>
    </div>
  );
}
