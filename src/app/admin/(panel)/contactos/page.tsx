import Link from "next/link";
import { prisma } from "@/lib/db";
import { savePatientAction } from "@/app/actions";
import { formatPhoneDisplay } from "@/lib/format";

export default async function ContactosPage() {
  const patients = await prisma.patient.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { appointments: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl font-semibold text-ink">Contactos</h2>
        <p className="mt-1 text-sm text-muted">
          Tus pacientes se guardan solos al crear citas. También puedes agregar uno aquí.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <form action={savePatientAction} className="ios-card space-y-3 p-5">
          <h3 className="font-semibold text-ink">Agregar contacto</h3>
          <input className="ios-input" name="name" placeholder="Nombre" required />
          <input className="ios-input" name="phone" placeholder="WhatsApp" required inputMode="tel" />
          <input className="ios-input" name="notes" placeholder="Notas (opcional)" />
          <button type="submit" className="ios-btn ios-btn-primary w-full">
            Guardar
          </button>
        </form>

        <div className="ios-card overflow-hidden">
          <div className="border-b border-line px-4 py-3">
            <p className="font-semibold text-ink">{patients.length} contactos</p>
          </div>
          {patients.length === 0 ? (
            <p className="p-6 text-sm text-muted">Aún no hay contactos. Crea una cita para empezar.</p>
          ) : (
            <ul className="divide-y divide-line">
              {patients.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/admin/contactos/${p.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-canvas/60"
                  >
                    <div>
                      <p className="font-medium text-ink">{p.name}</p>
                      <p className="text-sm text-muted">{formatPhoneDisplay(p.phone)}</p>
                    </div>
                    <span className="text-xs text-muted">{p._count.appointments} citas</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
