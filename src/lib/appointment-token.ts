import { prisma } from "@/lib/db";
import { formatBogota } from "@/lib/time";

/** Quita acentos y deja solo letras/números/guiones. */
export function slugifyName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "paciente";
}

function slugifyService(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36) || "cita";
}

/**
 * Link elegante: /cita/maria-lopez-valoracion-psicologica-individual
 * Si ya existe (misma persona + mismo servicio), añade la fecha.
 * Solo en último recurso un sufijo corto.
 */
export async function createAppointmentToken(
  patientName: string,
  serviceName: string,
  scheduledAt: Date,
) {
  const patient = slugifyName(patientName);
  const service = slugifyService(serviceName);
  const base = `${patient}-${service}`;

  const candidates = [
    base,
    `${base}-${formatBogota(scheduledAt, "yyyy-MM-dd")}`,
    `${base}-${formatBogota(scheduledAt, "yyyy-MM-dd-HHmm")}`,
  ];

  for (const token of candidates) {
    const exists = await prisma.appointment.findUnique({
      where: { token },
      select: { id: true },
    });
    if (!exists) return token;
  }

  // Casos extremos: misma persona, mismo servicio, misma hora
  for (let i = 2; i <= 20; i++) {
    const token = `${candidates[2]}-${i}`;
    const exists = await prisma.appointment.findUnique({
      where: { token },
      select: { id: true },
    });
    if (!exists) return token;
  }

  return `${base}-${Date.now().toString(36)}`;
}

export function appointmentPublicPath(token: string) {
  return `/cita/${token}`;
}
