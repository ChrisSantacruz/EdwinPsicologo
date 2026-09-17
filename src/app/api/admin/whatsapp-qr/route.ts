import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth) return new NextResponse("Unauthorized", { status: 401 });

  const base = process.env.WHATSAPP_BOT_URL?.trim().replace(/\/$/, "");
  if (!base) return new NextResponse("Bot no configurado", { status: 503 });

  try {
    // Si ya está conectado, no hay QR que mostrar
    const statusRes = await fetch(`${base}/`, { cache: "no-store" });
    if (statusRes.ok) {
      const data = (await statusRes.json()) as {
        connected?: boolean;
        hasPendingQr?: boolean;
      };
      if (data.connected && !data.hasPendingQr) {
        return NextResponse.json(
          { ok: true, connected: true, message: "WhatsApp ya está conectado" },
          { status: 200 },
        );
      }
    }

    const res = await fetch(`${base}/qr.png`, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          waiting: true,
          message: "QR aún no listo. Espera o pide un QR nuevo.",
        },
        { status: 202 },
      );
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new NextResponse("Error al obtener el código", { status: 502 });
  }
}
