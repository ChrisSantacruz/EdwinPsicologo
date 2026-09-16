import { prisma } from "@/lib/db";
import Link from "next/link";
import { saveLocationAction, toggleLocationAction } from "@/app/actions";
import { ToggleActiveButton } from "@/components/toggle-active-button";

export default async function SedesPage() {
  const locations = await prisma.location.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/ajustes" className="text-sm font-medium text-burgundy">
          ← Ajustes
        </Link>
        <h2 className="mt-2 font-display text-3xl font-semibold text-ink">Sedes</h2>
        <p className="mt-1 text-sm text-muted">Direcciones del mensaje de confirmación</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <form action={saveLocationAction} className="ios-card space-y-3 p-5">
          <h3 className="font-semibold text-ink">Agregar sede</h3>
          <input type="hidden" name="id" value="" />
          <input className="ios-input" name="name" placeholder="Nombre de la sede" required />
          <input className="ios-input" name="address" placeholder="Dirección" required />
          <input className="ios-input" name="neighborhood" placeholder="Barrio / detalle" required />
          <input className="ios-input" name="notes" placeholder="Notas (opcional)" />
          <button type="submit" className="ios-btn ios-btn-primary w-full">
            Guardar sede
          </button>
        </form>

        <div className="space-y-3">
          {locations.map((loc) => (
            <div key={loc.id} className={`ios-card space-y-3 p-4 ${loc.active ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{loc.name}</p>
                  <p className="mt-1 text-sm text-muted">{loc.address}</p>
                  <p className="text-sm text-brown">{loc.neighborhood}</p>
                </div>
                <ToggleActiveButton
                  active={loc.active}
                  action={toggleLocationAction.bind(null, loc.id)}
                />
              </div>
              <form action={saveLocationAction} className="space-y-2 border-t border-line pt-3">
                <input type="hidden" name="id" value={loc.id} />
                <input className="ios-input" name="name" defaultValue={loc.name} required />
                <input className="ios-input" name="address" defaultValue={loc.address} required />
                <input
                  className="ios-input"
                  name="neighborhood"
                  defaultValue={loc.neighborhood}
                  required
                />
                <input className="ios-input" name="notes" defaultValue={loc.notes ?? ""} />
                <button type="submit" className="ios-btn ios-btn-secondary w-full">
                  Actualizar
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
