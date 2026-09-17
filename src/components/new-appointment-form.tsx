"use client";

import { useMemo, useState, useTransition } from "react";

type ServiceOption = { id: string; name: string; defaultPrice: number };
type LocationOption = { id: string; name: string; address: string };
type PatientOption = { id: string; name: string; phone: string };

export function NewAppointmentForm({
  services,
  locations,
  patients,
  action,
  initialPatient,
}: {
  services: ServiceOption[];
  locations: LocationOption[];
  patients: PatientOption[];
  action: (formData: FormData) => Promise<{ error?: string } | void>;
  initialPatient?: { name: string; phone: string };
}) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [price, setPrice] = useState(services[0]?.defaultPrice ?? 200000);
  const [patientName, setPatientName] = useState(initialPatient?.name ?? "");
  const [patientPhone, setPatientPhone] = useState(
    initialPatient?.phone ?? "3028124298",
  );
  const [query, setQuery] = useState(initialPatient?.name ?? "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const minDate = useMemo(() => {
    // Fecha mínima en zona Colombia (aprox. local del navegador del admin)
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const minTime = useMemo(() => {
    if (!date || date !== minDate) return undefined;
    const d = new Date();
    d.setMinutes(d.getMinutes() + 5);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }, [date, minDate]);

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId),
    [services, serviceId],
  );

  const filteredPatients = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients.slice(0, 8);
    return patients
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.phone.replace(/\D/g, "").includes(q.replace(/\D/g, "")),
      )
      .slice(0, 8);
  }, [patients, query]);

  return (
    <form
      className="ios-card space-y-4 p-5 sm:p-6"
      action={(formData) => {
        startTransition(async () => {
          const res = await action(formData);
          if (res && "error" in res && res.error) setError(res.error);
        });
      }}
    >
      {patients.length > 0 ? (
        <div className="space-y-2 rounded-2xl border border-line bg-canvas/70 p-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-brown">Buscar contacto guardado</span>
            <input
              className="ios-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nombre o teléfono"
            />
          </label>
          {filteredPatients.length > 0 ? (
            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {filteredPatients.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-white"
                    onClick={() => {
                      setPatientName(p.name);
                      setPatientPhone(p.phone);
                      setQuery(p.name);
                    }}
                  >
                    <span className="font-medium text-ink">{p.name}</span>
                    <span className="ml-2 text-muted">{p.phone}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-1 text-xs text-muted">Sin coincidencias — escribe un paciente nuevo abajo</p>
          )}
        </div>
      ) : null}

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-brown">Nombre del paciente</span>
        <input
          className="ios-input"
          name="patientName"
          required
          placeholder="Ej. María López"
          value={patientName}
          onChange={(e) => setPatientName(e.target.value)}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-brown">WhatsApp del paciente</span>
        <input
          className="ios-input"
          name="patientPhone"
          required
          placeholder="3001234567"
          inputMode="tel"
          value={patientPhone}
          onChange={(e) => setPatientPhone(e.target.value)}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-brown">Tipo de consulta</span>
        <select
          className="ios-input"
          name="serviceId"
          required
          value={serviceId}
          onChange={(e) => {
            const id = e.target.value;
            setServiceId(id);
            const svc = services.find((s) => s.id === id);
            if (svc) setPrice(svc.defaultPrice);
          }}
        >
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-brown">
          Inversión {selectedService ? `(${selectedService.name})` : ""}
        </span>
        <input
          className="ios-input"
          type="number"
          name="price"
          required
          min={1000}
          step={1000}
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-brown">Sede</span>
        <select className="ios-input" name="locationId" required defaultValue={locations[0]?.id}>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} — {l.address}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-brown">Fecha</span>
          <input
            className="ios-input"
            type="date"
            name="date"
            required
            min={minDate}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-brown">Hora</span>
          <input
            className="ios-input"
            type="time"
            name="time"
            required
            min={minTime}
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-brown">Notas (opcional)</span>
        <textarea className="ios-input min-h-24 resize-y" name="notes" placeholder="Observaciones internas" />
      </label>

      {error ? <p className="text-sm text-burgundy">{error}</p> : null}

      <button type="submit" disabled={pending} className="ios-btn ios-btn-primary w-full disabled:opacity-60">
        {pending ? "Creando…" : "Crear cita y mensaje"}
      </button>
    </form>
  );
}
