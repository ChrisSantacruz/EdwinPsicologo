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
        Falta enlazar el bot. En Vercel agrega{" "}
        <code className="text-burgundy">WHATSAPP_BOT_URL</code> y{" "}
        <code className="text-burgundy">WHATSAPP_BOT_SECRET</code> (mismos valores que en Render).
        Mientras tanto puedes usar “Abrir en WhatsApp”.
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
            else {
              const label =
                res.mode === "bot"
                  ? "Enviado por el bot de WhatsApp"
                  : res.mode === "template"
                    ? "Enviado (plantilla Meta)"
                    : "Mensaje enviado";
              setMessage(label);
            }
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
