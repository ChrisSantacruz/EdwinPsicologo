import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { sendDevicePush } from "@/lib/push";
import { getAppUrl } from "@/lib/app-url";
import { prisma } from "@/lib/db";

/** Prueba de notificación al celular (Web Push). */
export async function POST() {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const count = await prisma.pushSubscription.count();
  if (count === 0) {
    return NextResponse.json({
      ok: false,
      error:
        "Aún no hay un celular registrado. En el iPhone: Agregar a pantalla de inicio → abrir la app → Activar alertas.",
      subscriptions: 0,
    });
  }

  const result = await sendDevicePush({
    title: "Prueba · Edwin Citas",
    body: "Si ves esto en tu iPhone, las alertas están listas.",
    url: `${getAppUrl()}/admin`,
    tag: "push-test",
  });

  return NextResponse.json({
    ok: result.sent > 0,
    subscriptions: count,
    sent: result.sent,
    failed: result.failed,
    message:
      result.sent > 0
        ? "Notificación enviada. Revisa el iPhone (aunque la app esté cerrada)."
        : "No se pudo enviar. Vuelve a Activar alertas desde el iPhone.",
  });
}
