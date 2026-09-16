import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth) return new NextResponse("Unauthorized", { status: 401 });

  const base = process.env.WHATSAPP_BOT_URL?.trim().replace(/\/$/, "");
  if (!base) return new NextResponse("Bot no configurado", { status: 503 });

  try {
    const res = await fetch(`${base}/qr.png`, { cache: "no-store" });
    if (!res.ok) {
      return new NextResponse("Código no disponible aún", { status: 404 });
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
