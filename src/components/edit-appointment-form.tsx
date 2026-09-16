"use client";

import { useState, useTransition } from "react";
import { updateAppointmentAction } from "@/app/actions";
import { bogotaDateInputValue, bogotaTimeInputValue } from "@/lib/time";

type Option = { id: string; name: string; defaultPrice?: number; address?: string };

export function EditAppointmentForm({
  appointment,
  services,
  locations,
}: {
  appointment: {
    id: string;
    patientName: string;
    patientPhone: string;
    scheduledAt: string;
    price: number;
    notes: string | null;
    serviceId: string;
    locationId: string;
  };
  services: Option[];
  locations: Option[];
}) {
  const scheduled = new Date(appointment.scheduledAt);
  const [serviceId, setServiceId] = useState(appointment.serviceId);
  const [price, setPrice] = useState(appointment.price);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" className="ios-btn ios-btn-secondary w-full" onClick={() => setOpen(true)}>
        Reprogramar / editar cita
      </button>
    );
  }

  return (
    <form
      className="ios-card space-y-3 p-5"
      action={(formData) => {
        startTransition(async () => {
          const res = await updateAppointmentAction(formData);
          if (res && "error" in res && res.error) setError(res.error);
        });
      }}
    >
      <h3 className="font-display text-xl font-semibold text-ink">Editar cita</h3>
      <input type="hidden" name="id" value={appointment.id} />

      <input className="ios-input" name="patientName" defaultValue={appointment.patientName} required />
      <input className="ios-input" name="patientPhone" defaultValue={appointment.patientPhone} required />

      <select
        className="ios-input"
        name="serviceId"
        value={serviceId}
        onChange={(e) => {
          setServiceId(e.target.value);
          const svc = services.find((s) => s.id === e.target.value);
          if (svc?.defaultPrice) setPrice(svc.defaultPrice);
        }}
      >
        {services.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      <input
        className="ios-input"
        type="number"
        name="price"
        value={price}
        onChange={(e) => setPrice(Number(e.target.value))}
        required
      />

      <select className="ios-input" name="locationId" defaultValue={appointment.locationId}>
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>

      <div className="grid grid-cols-2 gap-3">
        <input
          className="ios-input"
          type="date"
          name="date"
          required
          min={bogotaDateInputValue(new Date())}
          defaultValue={bogotaDateInputValue(scheduled)}
        />
        <input
          className="ios-input"
          type="time"
          name="time"
          required
          defaultValue={bogotaTimeInputValue(scheduled)}
        />
      </div>

      <textarea
        className="ios-input min-h-20"
        name="notes"
        defaultValue={appointment.notes ?? ""}
        placeholder="Notas"
      />

      {error ? <p className="text-sm text-burgundy">{error}</p> : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <button type="submit" disabled={pending} className="ios-btn ios-btn-primary disabled:opacity-60">
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
        <button type="button" className="ios-btn ios-btn-ghost" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
