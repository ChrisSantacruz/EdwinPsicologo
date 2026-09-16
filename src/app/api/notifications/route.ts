import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { nudgePaymentReminders } from "@/lib/payment-reminders";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Mientras Edwin tiene el panel abierto, revisamos recordatorios de pago
  await nudgePaymentReminders().catch(() => null);

  const { searchParams } = new URL(request.url);
  const after = searchParams.get("after");

  const unreadCount = await prisma.notification.count({
    where: { read: false },
  });

  const where = after
    ? { createdAt: { gt: new Date(after) } }
    : { read: false };

  const items = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      body: true,
      appointmentId: true,
      createdAt: true,
      read: true,
    },
  });

  return NextResponse.json({
    unreadCount,
    latestAt: items[0]?.createdAt?.toISOString() ?? after,
    items: items.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
    })),
  });
}
