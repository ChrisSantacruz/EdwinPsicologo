"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";

type Status = {
  ok: boolean;
  connected?: boolean;
  whatsapp?: string;
  hasPendingPairing?: boolean;
  pairingCode?: string | null;
  pairingPhone?: string | null;
  error?: string;
  outdated?: boolean;
  build?: string | null;
};

function formatPairCode(code: string) {
  const clean = code.replace(/\s/g, "");
  if (clean.length === 8) return `${clean.slice(0, 4)}-${clean.slice(4)}`;
  return clean;
}

export function WhatsAppConnectPanel() {
  const [status, setStatus] = useState<Status | null>(null);
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
    const id = setInterval(() => void load(), 4000);
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
        setMsg(data.message ?? "Sesión limpia. Espera el código nuevo.");
      } catch {
        setErr("No se pudo contactar WhatsApp. Intenta de nuevo en un momento.");
      }
    });
  }

  const connected = Boolean(status?.connected);
  const code = status?.pairingCode ? formatPairCode(status.pairingCode) : null;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link href="/admin/ajustes" className="text-sm font-medium text-burgundy">
          ← Ajustes
        </Link>
        <h2 className="mt-2 font-display text-3xl font-semibold text-ink">WhatsApp</h2>
        <p className="mt-1 text-sm text-muted">
          Vincula con un código (sin QR). Solo envío desde el panel.
        </p>
      </div>

      {connected ? (
        <div className="ios-card space-y-3 p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
            <span className="text-2xl font-semibold">✓</span>
          </div>
          <h3 className="font-display text-2xl font-semibold text-ink">WhatsApp conectado</h3>
          <p className="text-sm text-muted">Listo para Enviar desde cada cita.</p>
          {status?.outdated ? (
            <p className="rounded-2xl bg-burgundy/10 px-4 py-3 text-left text-sm text-burgundy">
              El bot en Render puede estar desactualizado. Haz Manual Deploy → Clear build cache.
              {status.build ? (
                <>
                  {" "}
                  Build: <code>{status.build}</code>
                </>
              ) : null}
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
            {pending ? "Limpiando…" : "Cambiar de WhatsApp"}
          </button>
        </div>
      ) : (
        <div className="ios-card space-y-4 p-6">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted">
            <li>Abre WhatsApp en el celular</li>
            <li>Menú → Dispositivos vinculados → Vincular dispositivo</li>
            <li>
              Elige <strong className="text-ink">Vincular con número de teléfono</strong>
            </li>
            <li>Escribe el código de abajo</li>
          </ol>

          <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-2xl bg-canvas px-4 py-8">
            {code ? (
              <>
                <p className="font-mono text-4xl font-bold tracking-[0.2em] text-ink sm:text-5xl">
                  {code}
                </p>
                <p className="text-xs text-muted">
                  Número del bot
                  {status?.pairingPhone ? `: ${status.pairingPhone}` : ""}
                </p>
              </>
            ) : (
              <p className="px-2 text-center text-sm text-muted">
                {status?.error ??
                  (status?.ok
                    ? "Generando código… Si tarda, Render free está despertando. Toca “Pedir código nuevo”."
                    : "Preparando…")}
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={pending}
            onClick={resetSession}
            className="ios-btn ios-btn-secondary w-full disabled:opacity-60"
          >
            {pending ? "Preparando…" : "Pedir código nuevo"}
          </button>

          <p className="text-xs text-muted">
            El código se renueva solo. Cuando vincule, verás “conectado”.
          </p>
        </div>
      )}

      {msg ? <p className="text-center text-sm font-medium text-success">{msg}</p> : null}
      {err ? <p className="text-center text-sm text-burgundy">{err}</p> : null}
    </div>
  );
}
