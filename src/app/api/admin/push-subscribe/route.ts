import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getVapidPublicKey } from "@/lib/push";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ publicKey: getVapidPublicKey() });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: "suscripción inválida" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: body.endpoint },
    create: {
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      userAgent: request.headers.get("user-agent")?.slice(0, 240) ?? null,
    },
    update: {
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      userAgent: request.headers.get("user-agent")?.slice(0, 240) ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
