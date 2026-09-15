import { PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";
import { buildConfirmationMessage } from "../src/lib/format";
import { bogotaDateTime } from "../src/lib/time";
import { upsertPatient } from "../src/lib/patients";

const prisma = new PrismaClient();

async function main() {
  const service =
    (await prisma.service.findFirst({
      where: { name: "Asesoría Psicológica", active: true },
    })) ??
    (await prisma.service.findFirst({ where: { active: true }, orderBy: { sortOrder: "asc" } }));

  const location =
    (await prisma.location.findFirst({
      where: { name: "Bosque de la Colina", active: true },
    })) ??
    (await prisma.location.findFirst({ where: { active: true } }));

  if (!service || !location) throw new Error("Corre npm run db:seed primero");

  const token = nanoid(12);
  const scheduledAt = bogotaDateTime("2026-09-19", "19:30");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const confirmUrl = `${appUrl}/c/${token}`;

  const whatsappMessage = buildConfirmationMessage({
    scheduledAt,
    address: location.address,
    neighborhood: location.neighborhood,
    serviceName: service.name,
    price: 200000,
    confirmUrl,
  });

  const patient = await upsertPatient("María López (Demo)", "3001234567");

  const appt = await prisma.appointment.create({
    data: {
      token,
      patientName: "María López (Demo)",
      patientPhone: "3001234567",
      scheduledAt,
      price: 200000,
      status: "PENDING_PATIENT",
      whatsappMessage,
      serviceId: service.id,
      locationId: location.id,
      patientId: patient.id,
    },
  });

  console.log("---ADMIN---");
  console.log(`${appUrl}/admin/citas/${appt.id}`);
  console.log("---PACIENTE---");
  console.log(confirmUrl);
  console.log("---WHATSAPP---");
  console.log(whatsappMessage);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
