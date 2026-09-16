import "server-only";
import { prisma } from "@/lib/db";
import { getAppUrl } from "@/lib/app-url";
import { sendDevicePush } from "@/lib/push";

/**
 * Avisa a Edwin: queda en el historial del panel Y salta en el iPhone
 * (Web Push / PWA), aunque el panel esté cerrado.
 */
export async function notifyEdwin(input: {
  title: string;
  body: string;
  appointmentId?: string;
  tag?: string;
}) {
  await prisma.notification.create({
    data: {
      title: input.title,
      body: input.body,
      appointmentId: input.appointmentId,
    },
  });

  try {
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
