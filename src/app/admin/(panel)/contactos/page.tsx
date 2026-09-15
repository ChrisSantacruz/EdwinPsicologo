import Link from "next/link";
import { prisma } from "@/lib/db";
import { importContactsCsvAction, savePatientAction } from "@/app/actions";
import { formatPhoneDisplay } from "@/lib/format";

export default async function ContactosPage({
  searchParams,
}: {
  searchParams: Promise<{ imported?: string; error?: string }>;
}) {
  const params = await searchParams;
  const patients = await prisma.patient.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { appointments: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-ink">Contactos</h2>
        <p className="mt-1 text-sm text-muted">
          WhatsApp no exporta la agenda fácilmente. Lo práctico: importar CSV de Google Contactos / teléfono,
          o ir guardando pacientes al crear citas.
        </p>
      </div>

      {params.imported ? (
        <p className="rounded-2xl bg-success/10 px-4 py-3 text-sm font-medium text-success">
          Se importaron {params.imported} contactos
        </p>
      ) : null}
      {params.error ? (
        <p className="rounded-2xl bg-burgundy/10 px-4 py-3 text-sm font-medium text-burgundy">
          No se pudo importar. Usa CSV con columnas nombre y teléfono (o export de Google Contacts).
        </p>
      ) : null}

      <div className="ios-card space-y-3 p-5">
        <h3 className="font-bold text-ink">Importar CSV (recomendado)</h3>
        <ol className="list-decimal space-y-1 pl-4 text-sm text-muted">
          <li>
            En el celular: Contacts / Contactos → exportar, o en PC:{" "}
            <a
              className="font-medium text-burgundy underline"
              href="https://contacts.google.com"
              target="_blank"
              rel="noreferrer"
            >
              contacts.google.com
            </a>{" "}
            → Exportar → Google CSV
          </li>
          <li>También sirve un archivo simple: <code>Nombre,3001234567</code></li>
          <li>Súbelo aquí. Los números se deduplican automáticamente.</li>
        </ol>
        <form action={importContactsCsvAction} className="space-y-3">
          <input className="ios-input" type="file" name="csv" accept=".csv,text/csv" required />
          <button type="submit" className="ios-btn ios-btn-primary w-full sm:w-auto">
            Importar contactos
          </button>
        </form>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <form action={savePatientAction} className="ios-card space-y-3 p-5">
          <h3 className="font-bold text-ink">Agregar manual</h3>
          <input className="ios-input" name="name" placeholder="Nombre" required />
          <input className="ios-input" name="phone" placeholder="WhatsApp" required inputMode="tel" />
          <input className="ios-input" name="notes" placeholder="Notas (opcional)" />
          <button type="submit" className="ios-btn ios-btn-secondary w-full">
            Guardar contacto
          </button>
        </form>

        <div className="ios-card overflow-hidden">
          <div className="border-b border-line px-4 py-3">
            <p className="font-semibold text-ink">{patients.length} contactos</p>
          </div>
          {patients.length === 0 ? (
            <p className="p-6 text-sm text-muted">Aún no hay contactos guardados.</p>
          ) : (
            <ul className="max-h-[28rem] divide-y divide-line overflow-y-auto">
              {patients.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/admin/contactos/${p.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-burgundy/[0.03]"
                  >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{p.name}</p>
                    <p className="text-sm text-muted">{formatPhoneDisplay(p.phone)}</p>
                    <p className="text-xs text-brown">{p._count.appointments} citas</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-burgundy">Ver →</span>
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
