import "server-only";
import webpush from "web-push";
import { prisma } from "@/lib/db";
import { getAppUrl } from "@/lib/app-url";

function configured() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:edwin@mideros.ps";
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY?.trim() || null;
}

function ensureWebPush() {
  const cfg = configured();
  if (!cfg) return false;
  webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey);
  return true;
}

/** Envía notificación al iPhone/Android (PWA), aunque el panel esté cerrado. */
export async function sendDevicePush(input: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}) {
  if (!ensureWebPush()) {
    console.warn("Web Push no configurado (VAPID keys)");
    return { sent: 0, failed: 0 };
  }

  const subs = await prisma.pushSubscription.findMany();
  if (subs.length === 0) return { sent: 0, failed: 0 };

  const payload = JSON.stringify({
    title: input.title,
    body: input.body,
    url: input.url ?? `${getAppUrl()}/admin`,
    tag: input.tag ?? "edwin-cita",
  });

  let sent = 0;
  let failed = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
        );
        sent += 1;
      } catch (err: unknown) {
        failed += 1;
        const status = (err as { statusCode?: number })?.statusCode;
        // Suscripción muerta → borrar
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => null);
        } else {
          console.error("Push falló:", err);
        }
      }
    }),
  );

  return { sent, failed };
}
