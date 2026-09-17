"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";

type Status = {
  ok: boolean;
  connected?: boolean;
  whatsapp?: string;
  hasPendingQr?: boolean;
  error?: string;
  outdated?: boolean;
  build?: string | null;
};

export function WhatsAppConnectPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [tick, setTick] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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

  function resetSession() {
    startTransition(async () => {
      setMsg(null);
      setErr(null);
      try {
        const res = await fetch("/api/admin/whatsapp-logout", { method: "POST" });
        const data = (await res.json()) as { ok?: boolean; error?: string; message?: string };
        if (!res.ok || !data.ok) {
          setErr(data.error ?? "No se pudo limpiar la sesión");
          return;
        }
        setMsg(data.message ?? "Sesión limpia. Escanea el QR nuevo.");
        setTick((t) => t + 1);
      } catch {
        setErr("No se pudo contactar WhatsApp. Intenta de nuevo en un momento.");
      }
    });
  }

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
          Vincula el celular del consultorio. Después los mensajes salen desde aquí.
        </p>
      </div>

      {connected ? (
        <div className="ios-card space-y-3 p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
            <span className="text-2xl font-semibold">✓</span>
          </div>
          <h3 className="font-display text-2xl font-semibold text-ink">WhatsApp conectado</h3>
          <p className="text-sm text-muted">
            Ya puedes enviar mensajes a tus pacientes desde cada cita.
          </p>
          {status?.outdated ? (
            <p className="rounded-2xl bg-burgundy/10 px-4 py-3 text-left text-sm text-burgundy">
              El bot en Render está <strong>desactualizado</strong> (aún responde “Soy el bot…”).
              En{" "}
              <a
                href="https://dashboard.render.com"
                target="_blank"
                rel="noreferrer"
                className="font-semibold underline"
              >
                dashboard.render.com
              </a>{" "}
              → servicio <strong>edwinpsicologo</strong> → <strong>Manual Deploy</strong> →{" "}
              <strong>Clear build cache &amp; deploy</strong>. No uses Logout; la sesión se
              mantiene.
            </p>
          ) : null}
          <Link href="/admin" className="ios-btn ios-btn-primary w-full">
            Ir a la agenda
          </Link>
          <button
            type="button"
            disabled={pending}
            onClick={resetSession}
            className="ios-btn ios-btn-secondary w-full disabled:opacity-60"
          >
            {pending ? "Limpiando…" : "Cambiar de WhatsApp (nuevo QR)"}
          </button>
          <p className="text-xs text-muted">
            Usa esto para desvincular el número de prueba y escanear el de Edwin.
          </p>
        </div>
      ) : (
        <div className="ios-card space-y-4 p-6">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted">
            <li>Abre WhatsApp en el celular de Edwin</li>
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
                  "Preparando el código… Si tarda, toca “Pedir QR nuevo” o espera unos segundos (Render free se despierta lento)."}
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={pending}
            onClick={resetSession}
            className="ios-btn ios-btn-secondary w-full disabled:opacity-60"
          >
            {pending ? "Preparando…" : "Pedir QR nuevo"}
          </button>

          <p className="text-xs text-muted">
            El código se actualiza solo. Cuando quede vinculado, esta pantalla cambiará a “conectado”.
          </p>
        </div>
      )}

      {msg ? <p className="text-center text-sm font-medium text-success">{msg}</p> : null}
      {err ? <p className="text-center text-sm text-burgundy">{err}</p> : null}
    </div>
  );
}
