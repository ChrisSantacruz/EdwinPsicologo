import { prisma } from "@/lib/db";
import { saveServiceAction, toggleServiceAction } from "@/app/actions";
import { formatMoney } from "@/lib/format";
import { ToggleActiveButton } from "@/components/toggle-active-button";

export default async function ServiciosPage() {
  const services = await prisma.service.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl font-semibold text-ink">Servicios</h2>
        <p className="mt-1 text-sm text-muted">Tipos de consulta y precio por defecto</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <form action={saveServiceAction} className="ios-card space-y-3 p-5">
          <h3 className="font-semibold text-ink">Agregar servicio</h3>
          <input type="hidden" name="id" value="" />
          <input className="ios-input" name="name" placeholder="Nombre del servicio" required />
          <input
            className="ios-input"
            type="number"
            name="defaultPrice"
            placeholder="Precio por defecto"
            required
            min={1000}
            step={1000}
          />
          <input
            className="ios-input"
            type="number"
            name="sortOrder"
            placeholder="Orden"
            defaultValue={services.length + 1}
          />
          <button type="submit" className="ios-btn ios-btn-primary w-full">
            Guardar servicio
          </button>
        </form>

        <div className="space-y-3">
          {services.map((svc) => (
            <div key={svc.id} className={`ios-card space-y-3 p-4 ${svc.active ? "" : "opacity-60"}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{svc.name}</p>
                  <p className="text-sm text-burgundy">{formatMoney(svc.defaultPrice)}</p>
                </div>
                <ToggleActiveButton
                  active={svc.active}
                  action={toggleServiceAction.bind(null, svc.id)}
                />
              </div>
              <form action={saveServiceAction} className="space-y-2 border-t border-line pt-3">
                <input type="hidden" name="id" value={svc.id} />
                <input className="ios-input" name="name" defaultValue={svc.name} required />
                <input
                  className="ios-input"
                  type="number"
                  name="defaultPrice"
                  defaultValue={svc.defaultPrice}
                  required
                />
                <input
                  className="ios-input"
                  type="number"
                  name="sortOrder"
                  defaultValue={svc.sortOrder}
                />
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
