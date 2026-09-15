import { prisma } from "./db";

export function normalizePhone(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("57") && digits.length >= 12) {
    digits = digits.slice(2);
  }
  return digits;
}

export async function upsertPatient(name: string, phone: string, notes?: string | null) {
  const phoneKey = normalizePhone(phone);
  if (phoneKey.length < 7) {
    throw new Error("Teléfono inválido");
  }

  const existing = await prisma.patient.findUnique({ where: { phoneKey } });
  if (existing) {
    return prisma.patient.update({
      where: { id: existing.id },
      data: {
        name: name.trim() || existing.name,
        phone: phone.trim(),
        ...(notes !== undefined ? { notes } : {}),
      },
    });
  }

  return prisma.patient.create({
    data: {
      name: name.trim(),
      phone: phone.trim(),
      phoneKey,
      notes: notes?.trim() || null,
    },
  });
}

export async function backfillPatientsFromAppointments() {
  const appointments = await prisma.appointment.findMany({
    where: { patientId: null },
    orderBy: { createdAt: "asc" },
  });

  let count = 0;
  for (const appt of appointments) {
    const patient = await upsertPatient(appt.patientName, appt.patientPhone);
    await prisma.appointment.update({
      where: { id: appt.id },
      data: { patientId: patient.id },
    });
    count += 1;
  }
  return count;
}
