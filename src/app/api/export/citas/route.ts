import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatBogota } from "@/lib/time";
import { STATUS_LABEL } from "@/lib/constants";
import { getAppUrl } from "@/lib/app-url";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.redirect(new URL("/admin/login", getAppUrl()));
  }

  const appointments = await prisma.appointment.findMany({
    include: { service: true, location: true },
    orderBy: { scheduledAt: "desc" },
  });

  const header = [
    "fecha",
    "hora",
    "paciente",
    "telefono",
    "servicio",
    "sede",
    "precio",
    "estado",
    "pago",
  ];

  const rows = appointments.map((a) => [
    formatBogota(a.scheduledAt, "yyyy-MM-dd"),
    formatBogota(a.scheduledAt, "HH:mm"),
    csvEscape(a.patientName),
    csvEscape(a.patientPhone),
    csvEscape(a.service.name),
    csvEscape(a.location.name),
    String(a.price),
    csvEscape(STATUS_LABEL[a.status] ?? a.status),
    csvEscape(a.paymentMethod ?? ""),
  ]);

  const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const filename = `citas-edwin-${formatBogota(new Date(), "yyyy-MM-dd")}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
