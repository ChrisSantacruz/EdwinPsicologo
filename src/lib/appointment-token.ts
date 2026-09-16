import { customAlphabet } from "nanoid";
import { prisma } from "@/lib/db";
import { formatBogota } from "@/lib/time";

const paymentCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 4);

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

/** Referencia corta para Nequi (mensaje de la transferencia). */
export async function createPaymentRef() {
  for (let i = 0; i < 12; i++) {
    const paymentRef = `EDW-${paymentCode()}`;
    const exists = await prisma.appointment.findFirst({
      where: { paymentRef },
      select: { id: true },
    });
    if (!exists) return paymentRef;
  }

  return `EDW-${Date.now().toString(36).toUpperCase().slice(-4)}`;
}

export function appointmentPublicPath(token: string) {
  return `/cita/${token}`;
}
