import { customAlphabet } from "nanoid";
import { prisma } from "@/lib/db";

const shortId = customAlphabet("abcdefghijkmnopqrstuvwxyz23456789", 4);

/** Quita acentos y deja solo letras/números/guiones. */
export function slugifyName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "paciente";
}

/**
 * Token elegante para el link público:
 * maria-lopez-k2m9  →  /cita/maria-lopez-k2m9
 */
export async function createAppointmentToken(patientName: string) {
  const base = slugifyName(patientName);

  for (let attempt = 0; attempt < 8; attempt++) {
    const token = `${base}-${shortId()}`;
    const exists = await prisma.appointment.findUnique({
      where: { token },
      select: { id: true },
    });
    if (!exists) return token;
  }

  return `${base}-${shortId()}${shortId()}`;
}

export function appointmentPublicPath(token: string) {
  return `/cita/${token}`;
}
