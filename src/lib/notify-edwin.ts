import "server-only";
import { prisma } from "@/lib/db";
import { getAppUrl } from "@/lib/app-url";
import { notificationsEnabled } from "@/lib/notifications-flag";

/**
 * Avisa a Edwin: historial del panel + push al iPhone.
 * Nunca debe tumbar confirmar cita / elegir pago.
 */
export async function notifyEdwin(input: {
  title: string;
  body: string;
  appointmentId?: string;
  tag?: string;
}) {
  if (!notificationsEnabled()) return;

  try {
    await prisma.notification.create({
      data: {
        title: input.title,
        body: input.body,
        appointmentId: input.appointmentId,
      },
    });
  } catch (err) {
    console.error("Notification create:", err);
  }

  try {
    const { sendDevicePush } = await import("@/lib/push");
    const url = input.appointmentId
      ? `${getAppUrl()}/admin/citas/${input.appointmentId}`
      : `${getAppUrl()}/admin`;
    await sendDevicePush({
      title: input.title,
      body: input.body,
      url,
      tag: input.tag ?? input.appointmentId ?? "edwin",
    });
  } catch (err) {
    console.error("Push dispositivo:", err);
  }
}
