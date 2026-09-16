import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "edwin@mideros.ps";
  const password = process.env.ADMIN_PASSWORD ?? "edwin2026";
  const name = process.env.ADMIN_NAME ?? "Edwin Mideros Meza";

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.admin.upsert({
    where: { email },
    update: { name, passwordHash },
    create: { email, name, passwordHash },
  });

  // Quitar admins de prueba (solo queda Edwin)
  await prisma.admin.deleteMany({
    where: { email: { not: email } },
  });

  // Calendar y push deben reconectarse con la cuenta/dispositivo de Edwin
  await prisma.googleToken.deleteMany({});
  await prisma.pushSubscription.deleteMany({});

  const locations = [
    {
      name: "Mariluz 1",
      address: "Carrera 40 No 13-10",
      neighborhood: "Mariluz 1",
      notes: "Pasto, Nariño – Colombia",
    },
    {
      name: "Bosque de la Colina",
      address: "Carrera 48 No 12A - 55",
      neighborhood:
        "Condominio Bosque de la Colina 1. Torre 4. Piso 10. apartamento 1005",
      notes: "Pasto, Nariño – Colombia",
    },
  ];

  for (const loc of locations) {
    const existing = await prisma.location.findFirst({
      where: { name: loc.name },
    });
    if (existing) {
      await prisma.location.update({
        where: { id: existing.id },
        data: loc,
      });
    } else {
      await prisma.location.create({ data: loc });
    }
  }

  const services = [
    { name: "Valoración Psicológica individual", defaultPrice: 200000, sortOrder: 1 },
    { name: "Asesoría Psicológica", defaultPrice: 200000, sortOrder: 2 },
    { name: "Psicoterapia individual", defaultPrice: 200000, sortOrder: 3 },
    { name: "Psicoterapia de pareja", defaultPrice: 250000, sortOrder: 4 },
    { name: "Aplicación psicometría", defaultPrice: 200000, sortOrder: 5 },
    { name: "Evaluación Psicológica", defaultPrice: 250000, sortOrder: 6 },
  ];

  for (const service of services) {
    const existing = await prisma.service.findFirst({
      where: { name: service.name },
    });
    if (existing) {
      await prisma.service.update({
        where: { id: existing.id },
        data: service,
      });
    } else {
      await prisma.service.create({ data: service });
    }
  }

  console.log("Seed OK:", { email, locations: locations.length, services: services.length });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
