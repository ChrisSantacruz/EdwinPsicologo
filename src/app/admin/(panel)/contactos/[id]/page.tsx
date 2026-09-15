import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { deletePatientAction, savePatientAction } from "@/app/actions";
import { StatusBadge } from "@/components/status-badge";
import {
  formatAppointmentDate,
  formatAppointmentTime,
  formatMoney,
  formatPhoneDisplay,
  whatsappLink,
} from "@/lib/format";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      appointments: {
        include: { service: true, location: true },
        orderBy: { scheduledAt: "desc" },
      },
    },
  });

  if (!patient) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/admin/contactos" className="text-sm font-medium text-burgundy">
          ← Contactos
        </Link>
        <h2 className="mt-2 font-display text-3xl font-semibold text-ink">{patient.name}</h2>
        <p className="text-sm text-muted">{formatPhoneDisplay(patient.phone)}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href={whatsappLink(patient.phone, `Hola ${patient.name.split(" ")[0]}, `)}
          target="_blank"
          rel="noreferrer"
          className="ios-btn ios-btn-primary"
        >
          WhatsApp
        </a>
        <Link href={`/admin/citas/nueva?patient=${patient.id}`} className="ios-btn ios-btn-secondary">
          Nueva cita
        </Link>
      </div>

      <form action={savePatientAction} className="ios-card space-y-3 p-5">
        <h3 className="font-semibold text-ink">Editar contacto</h3>
        <input type="hidden" name="id" value={patient.id} />
        <input className="ios-input" name="name" defaultValue={patient.name} required />
        <input className="ios-input" name="phone" defaultValue={patient.phone} required />
        <textarea
          className="ios-input min-h-20"
          name="notes"
          defaultValue={patient.notes ?? ""}
          placeholder="Notas del paciente"
        />
        <button type="submit" className="ios-btn ios-btn-secondary w-full">
          Guardar cambios
        </button>
      </form>

      <div className="ios-card overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <p className="font-semibold text-ink">
            Historial · {patient.appointments.length} citas
          </p>
        </div>
        {patient.appointments.length === 0 ? (
          <p className="p-4 text-sm text-muted">Sin citas todavía</p>
        ) : (
          <ul className="divide-y divide-line">
            {patient.appointments.map((a) => (
              <li key={a.id}>
                <Link href={`/admin/citas/${a.id}`} className="block px-4 py-3 hover:bg-burgundy/[0.03]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink">{a.service.name}</p>
                      <p className="text-sm text-muted">
                        {formatAppointmentDate(a.scheduledAt)} · {formatAppointmentTime(a.scheduledAt)}
                      </p>
                      <p className="text-sm text-brown">{a.location.name}</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={a.status} />
                      <p className="mt-2 text-sm font-semibold">{formatMoney(a.price)}</p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form action={deletePatientAction.bind(null, patient.id)}>
        <button type="submit" className="ios-btn ios-btn-danger w-full">
          Eliminar contacto
        </button>
      </form>
    </div>
  );
}
