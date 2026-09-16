import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { endOfBogotaDay, formatBogota, startOfBogotaDay } from "@/lib/time";
import { formatAppointmentTime } from "@/lib/format";

/**
 * Recordatorio 7:00 America/Bogota (= 12:00 UTC).
 * Vercel Cron llama este endpoint cada día.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET?.trim();
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const dayStart = startOfBogotaDay(now);
  const dayEnd = endOfBogotaDay(now);

  const todays = await prisma.appointment.findMany({
    where: {
      scheduledAt: { gte: dayStart, lte: dayEnd },
      status: { in: ["CONFIRMED", "AWAITING_PROOF", "AWAITING_EDWIN"] },
    },
    include: { service: true, location: true },
    orderBy: { scheduledAt: "asc" },
  });

  let created = 0;
  for (const appt of todays) {
    const title = `Hoy · ${appt.patientName}`;
    const body = `${appt.service.name} · ${formatAppointmentTime(appt.scheduledAt)} · ${appt.location.name}`;

    // Evita duplicar el mismo recordatorio matutino el mismo día
    const already = await prisma.notification.findFirst({
      where: {
        appointmentId: appt.id,
        title,
        createdAt: { gte: dayStart },
      },
    });
    if (already) continue;

    await prisma.notification.create({
      data: {
        title,
        body: `${body}. Recuerda preparar el espacio con calma.`,
        appointmentId: appt.id,
      },
    });
    created += 1;
  }

  return NextResponse.json({
    ok: true,
    date: formatBogota(now, "yyyy-MM-dd"),
    appointments: todays.length,
    notificationsCreated: created,
  });
}
