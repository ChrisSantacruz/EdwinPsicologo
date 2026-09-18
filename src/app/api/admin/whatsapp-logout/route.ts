import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

/**
 * Cierra la sesión de WhatsApp en Render y fuerza un QR nuevo.
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
      signal: AbortSignal.timeout(60_000),
    });

    const raw = await res.text();
    let data: { ok?: boolean; error?: string; message?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as typeof data) : {};
    } catch {
      data = { error: raw?.slice(0, 200) || `HTTP ${res.status}` };
    }

    if (!res.ok || !data.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            data.error ??
            "No se pudo limpiar la sesión. Espera un minuto e inténtalo de nuevo (Render free).",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: data.message ?? "Sesión limpia. Espera el código nuevo.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("whatsapp-logout:", msg);
    return NextResponse.json(
      {
        ok: false,
        error:
          "No se pudo contactar el bot. Espera un minuto (Render free se despierta lento) y vuelve a intentar.",
      },
      { status: 502 },
    );
  }
}
