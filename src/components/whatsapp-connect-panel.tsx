"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Status = {
  ok: boolean;
  connected?: boolean;
  whatsapp?: string;
  hasPendingQr?: boolean;
  error?: string;
};

export function WhatsAppConnectPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/admin/whatsapp-status", { cache: "no-store" });
        const data = (await res.json()) as Status;
        if (!cancelled) setStatus(data);
      } catch {
        if (!cancelled) setStatus({ ok: false, error: "No se pudo consultar el estado" });
      }
    }

    void load();
    const id = setInterval(() => {
      setTick((t) => t + 1);
      void load();
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const connected = Boolean(status?.connected);
  const waitingQr = Boolean(status?.hasPendingQr) && !connected;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link href="/admin/ajustes" className="text-sm font-medium text-burgundy">
          ← Ajustes
        </Link>
        <h2 className="mt-2 font-display text-3xl font-semibold text-ink">WhatsApp</h2>
        <p className="mt-1 text-sm text-muted">
          Vincula tu celular una sola vez. Después los mensajes salen desde aquí.
        </p>
      </div>

      {connected ? (
        <div className="ios-card space-y-3 p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
            <span className="text-2xl font-semibold">✓</span>
          </div>
          <h3 className="font-display text-2xl font-semibold text-ink">WhatsApp conectado</h3>
          <p className="text-sm text-muted">
            Ya puedes enviar mensajes a tus pacientes desde cada cita. Si cierras la sesión en el
            celular, vuelve a esta página para vincular de nuevo.
          </p>
          <Link href="/admin" className="ios-btn ios-btn-primary w-full">
            Ir a la agenda
          </Link>
        </div>
      ) : (
        <div className="ios-card space-y-4 p-6">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted">
            <li>Abre WhatsApp en tu celular</li>
            <li>Menú → Dispositivos vinculados → Vincular dispositivo</li>
            <li>Escanea el código de abajo</li>
          </ol>

          <div className="flex min-h-[280px] items-center justify-center rounded-2xl bg-canvas p-4">
            {waitingQr || status?.ok ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={tick}
                src={`/api/admin/whatsapp-qr?t=${tick}`}
                alt="Código para vincular WhatsApp"
                className="h-auto w-full max-w-[280px] rounded-xl bg-white p-2"
              />
            ) : (
              <p className="px-4 text-center text-sm text-muted">
                {status?.error ??
                  "Preparando el código… Si tarda unos segundos, espera o vuelve a entrar a esta página."}
              </p>
            )}
          </div>

          <p className="text-xs text-muted">
            El código se actualiza solo. Cuando quede vinculado, esta pantalla cambiará a “conectado”.
          </p>
        </div>
      )}
    </div>
  );
}
