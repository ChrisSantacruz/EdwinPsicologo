import { prisma } from "@/lib/db";
import { createAppointmentAction } from "@/app/actions";
import { NewAppointmentForm } from "@/components/new-appointment-form";

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ patient?: string }>;
}) {
  const { patient: patientId } = await searchParams;

  const [services, locations, patients] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.location.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.patient.findMany({ orderBy: { name: "asc" } }),
  ]);

  const selected = patientId
    ? patients.find((p) => p.id === patientId)
    : undefined;

  const orderedPatients = selected
    ? [selected, ...patients.filter((p) => p.id !== selected.id)]
    : patients;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-ink">Nueva cita</h2>
        <p className="mt-1 text-sm text-muted">
          Genera el mensaje, el link del paciente y el evento en Google Calendar
        </p>
      </div>

      <NewAppointmentForm
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          defaultPrice: s.defaultPrice,
        }))}
        locations={locations.map((l) => ({
          id: l.id,
          name: l.name,
          address: l.address,
        }))}
        patients={orderedPatients.map((p) => ({
          id: p.id,
          name: p.name,
          phone: p.phone,
        }))}
        action={createAppointmentAction}
        initialPatient={
          selected
            ? { name: selected.name, phone: selected.phone }
            : undefined
        }
      />
    </div>
  );
}
