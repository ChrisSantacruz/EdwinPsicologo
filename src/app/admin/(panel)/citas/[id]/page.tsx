import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/status-badge";
import { CopyButton, ConfirmAppointmentButton } from "@/components/client-actions";
import { EditAppointmentForm } from "@/components/edit-appointment-form";
import { SendWhatsAppApiButton } from "@/components/send-whatsapp-button";
import {
  formatAppointmentDate,
  formatAppointmentTime,
  formatMoney,
  formatPhoneDisplay,
  buildEdwinConfirmedPatientMessage,
  whatsappLink,
} from "@/lib/format";
import {
  cancelAppointmentAction,
  confirmAppointmentAction,
  deleteAppointmentAction,
  sendAppointmentWhatsAppAction,
} from "@/app/actions";
import { isWhatsAppConfigured } from "@/lib/whatsapp";
import { getAppUrl } from "@/lib/app-url";
import { appointmentPublicPath } from "@/lib/appointment-token";

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
  const confirmUrl = `${appUrl}${appointmentPublicPath(appointment.token)}`;
  const isConfirmed = appointment.status === "CONFIRMED";
  const confirmMessage = isConfirmed
    ? buildEdwinConfirmedPatientMessage({
        patientName: appointment.patientName,
        scheduledAt: appointment.scheduledAt,
        serviceName: appointment.service.name,
        address: appointment.location.address,
        neighborhood: appointment.location.neighborhood,
      })
    : null;
  const message = confirmMessage ?? appointment.whatsappMessage ?? "";
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
          Cita actualizada
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
          <DetailRow
            label="Pago"
            value={
              appointment.paymentMethod === "EFECTIVO"
                ? "Efectivo"
                : `Nequi${appointment.paymentRef ? ` · ${appointment.paymentRef}` : ""}`
            }
          />
        ) : null}
        {appointment.paymentNote ? (
          <DetailRow label="Nota de pago" value={appointment.paymentNote} />
        ) : null}
        <DetailRow
          label="Agenda"
          value={appointment.googleEventId ? "En tu agenda" : "Pendiente"}
        />
      </div>

      {appointment.status === "AWAITING_PROOF" ? (
        <div className="ios-card space-y-3 border-burgundy/20 p-5">
          <h3 className="font-display text-xl font-semibold text-ink">¿Llegó el Nequi?</h3>
          <ConfirmAppointmentButton
            mode="nequi"
            amount={appointment.price}
            paymentRef={appointment.paymentRef}
            action={async () => {
              "use server";
              return confirmAppointmentAction(appointment.id);
            }}
          />
        </div>
      ) : null}

      {appointment.status === "AWAITING_EDWIN" ? (
        <div className="ios-card space-y-3 border-burgundy/20 p-5">
          <h3 className="font-display text-xl font-semibold text-ink">Confirmar efectivo</h3>
          <ConfirmAppointmentButton
            mode="efectivo"
            amount={appointment.price}
            action={async () => {
              "use server";
              return confirmAppointmentAction(appointment.id);
            }}
          />
        </div>
      ) : null}

      {isConfirmed || appointment.status === "PENDING_PATIENT" ? (
        <div className="ios-card space-y-3 p-5">
          <h3 className="font-display text-xl font-semibold text-ink">
            {isConfirmed ? "Mensaje de confirmación al paciente" : "Mensaje al paciente"}
          </h3>
          {isConfirmed ? (
            <p className="text-sm text-muted">
              El pago ya está confirmado. Ábrelo en WhatsApp y envíalo desde el celular (así llega
              bien).
            </p>
          ) : null}
          <pre className="whitespace-pre-wrap rounded-2xl bg-canvas p-4 text-sm leading-relaxed text-ink">
            {message}
          </pre>
          <div className="grid gap-2 sm:grid-cols-2">
            <a
              href={waPatient}
              target="_blank"
              rel="noreferrer"
              className="ios-btn ios-btn-primary"
            >
              Abrir WhatsApp
            </a>
            <CopyButton text={message} label="Copiar mensaje" />
          </div>
          {waConfigured ? (
            <SendWhatsAppApiButton
              configured={waConfigured}
              action={sendAppointmentWhatsAppAction.bind(null, appointment.id)}
            />
          ) : null}
          {!isConfirmed ? (
            <div className="rounded-2xl border border-line bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Enlace para el paciente
              </p>
              <p className="mt-1 truncate text-sm text-burgundy" title={confirmUrl}>
                {confirmUrl.replace(/^https?:\/\//, "")}
              </p>
              <div className="mt-2">
                <CopyButton text={confirmUrl} label="Copiar enlace" />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

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

      {appointment.status === "CONFIRMED" || appointment.status === "CANCELLED" ? (
        <form
          action={async () => {
            "use server";
            await deleteAppointmentAction(appointment.id);
          }}
        >
          <button type="submit" className="ios-btn ios-btn-secondary w-full text-burgundy">
            Eliminar del panel
          </button>
          <p className="mt-2 text-center text-xs text-muted">
            La quita de la agenda. No se puede deshacer.
          </p>
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
