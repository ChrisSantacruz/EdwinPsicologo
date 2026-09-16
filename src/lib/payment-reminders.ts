import "server-only";
import { prisma } from "@/lib/db";
import { formatAppointmentDate, formatAppointmentTime } from "@/lib/format";

const TEN_MIN_MS = 10 * 60 * 1000;

/**
 * Si el paciente ya eligió pago y Edwin no confirmó en 10 min,
 * crea una notificación en el panel (una sola vez por cita).
 */
export async function nudgePaymentReminders() {
  const cutoff = new Date(Date.now() - TEN_MIN_MS);

  const pending = await prisma.appointment.findMany({
    where: {
      status: { in: ["AWAITING_PROOF", "AWAITING_EDWIN"] },
      patientConfirmedAt: { lte: cutoff },
      paymentReminderSentAt: null,
    },
    include: { service: true },
    take: 40,
  });

  let created = 0;

  for (const appt of pending) {
    const method =
      appt.paymentMethod === "NEQUI"
        ? "Nequi (revisa el pantallazo)"
        : "efectivo";

    await prisma.notification.create({
      data: {
        title: `No olvides confirmar · ${appt.patientName}`,
        body: `Ya seleccionó ${method}. ${appt.service.name} · ${formatAppointmentDate(appt.scheduledAt)} · ${formatAppointmentTime(appt.scheduledAt)}. Confirma la cita cuando puedas.`,
        appointmentId: appt.id,
      },
    });

    await prisma.appointment.update({
      where: { id: appt.id },
      data: { paymentReminderSentAt: new Date() },
    });

    created += 1;
  }

  return { checked: pending.length, created };
}
