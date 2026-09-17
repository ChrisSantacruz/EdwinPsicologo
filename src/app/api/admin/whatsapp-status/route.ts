import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

function botConfig() {
  const base = process.env.WHATSAPP_BOT_URL?.trim().replace(/\/$/, "");
  const secret = process.env.WHATSAPP_BOT_SECRET?.trim();
  return { base, secret };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { base } = botConfig();
  if (!base) {
    return NextResponse.json({
      ok: false,
      error: "WhatsApp aún no está configurado en el servidor",
    });
  }

  try {
    const res = await fetch(`${base}/`, { cache: "no-store" });
    const data = (await res.json()) as {
      connected?: boolean;
      whatsapp?: string;
      hasPendingQr?: boolean;
      build?: string;
      autoReply?: boolean;
    };
    return NextResponse.json({
      ok: true,
      connected: Boolean(data.connected),
      whatsapp: data.whatsapp,
      hasPendingQr: Boolean(data.hasPendingQr),
      build: data.build ?? null,
      // Si no trae autoReply:false, Render aún tiene el bot viejo que responde “hola”
      outdated: data.autoReply !== false,
    });
  } catch {
    return NextResponse.json({
      ok: false,
      error: "No se pudo contactar el servicio de WhatsApp. Intenta en un momento.",
    });
  }
}
