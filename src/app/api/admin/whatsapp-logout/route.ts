import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

/**
 * Cierra la sesión de WhatsApp en Render y fuerza un QR nuevo (número de Edwin).
 */
export async function POST() {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const base = process.env.WHATSAPP_BOT_URL?.trim().replace(/\/$/, "");
  const secret = process.env.WHATSAPP_BOT_SECRET?.trim();
  if (!base || !secret) {
    return NextResponse.json(
      { ok: false, error: "WhatsApp aún no está configurado en el servidor" },
      { status: 503 },
    );
  }

  try {
    const res = await fetch(`${base}/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bot-secret": secret,
      },
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      message?: string;
    };
    if (!res.ok || !data.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: data.error ?? "No se pudo limpiar la sesión. Intenta en un momento.",
        },
        { status: res.status >= 400 ? res.status : 502 },
      );
    }
    return NextResponse.json({
      ok: true,
      message: data.message ?? "Sesión limpiada. Escanea el QR nuevo con el WhatsApp de Edwin.",
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "No se pudo contactar WhatsApp. Espera un minuto (Render free se despierta lento).",
      },
      { status: 502 },
    );
  }
}
