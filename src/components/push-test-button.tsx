"use client";

import { useState, useTransition } from "react";

export function PushTestButton() {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        className="ios-btn ios-btn-secondary w-full disabled:opacity-60"
        onClick={() =>
          startTransition(async () => {
            setMsg(null);
            setErr(null);
            try {
              const res = await fetch("/api/admin/push-test", { method: "POST" });
              const data = (await res.json()) as {
                ok?: boolean;
                error?: string;
                message?: string;
              };
              if (!data.ok) setErr(data.error ?? data.message ?? "No se pudo enviar");
              else setMsg(data.message ?? "Enviada");
            } catch {
              setErr("Error de red al probar la notificación");
            }
          })
        }
      >
        {pending ? "Enviando…" : "Probar notificación en este iPhone"}
      </button>
      {msg ? <p className="text-sm font-medium text-success">{msg}</p> : null}
      {err ? <p className="text-sm text-burgundy">{err}</p> : null}
    </div>
  );
}
