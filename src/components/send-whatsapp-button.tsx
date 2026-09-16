"use client";

import { useState, useTransition } from "react";

export function SendWhatsAppApiButton({
  configured,
  action,
}: {
  configured: boolean;
  action: () => Promise<{ error?: string; ok?: boolean; mode?: string }>;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!configured) {
    return (
      <p className="rounded-2xl bg-canvas px-4 py-3 text-sm text-muted">
        WhatsApp aún no está vinculado. Ve a{" "}
        <a href="/admin/whatsapp" className="font-semibold text-burgundy">
          WhatsApp
        </a>{" "}
        para conectar tu celular, o usa “Abrir en WhatsApp” por ahora.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        className="ios-btn ios-btn-primary w-full disabled:opacity-60"
        onClick={() =>
          startTransition(async () => {
            setError(null);
            setMessage(null);
            const res = await action();
            if (res?.error) setError(res.error);
            else setMessage("Mensaje enviado al paciente");
          })
        }
      >
        {pending ? "Enviando…" : "Enviar mensaje"}
      </button>
      {message ? <p className="text-sm font-medium text-success">{message}</p> : null}
      {error ? <p className="text-sm text-burgundy">{error}</p> : null}
    </div>
  );
}
