"use client";

import { useState, useTransition } from "react";

export function CopyButton({ text, label = "Copiar mensaje" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="ios-btn ios-btn-secondary w-full"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
    >
      {copied ? "Copiado" : label}
    </button>
  );
}

export function ConfirmNequiButton({
  action,
}: {
  action: () => Promise<{ error?: string; ok?: boolean }>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        className="ios-btn ios-btn-primary w-full disabled:opacity-60"
        onClick={() =>
          startTransition(async () => {
            const res = await action();
            if (res?.error) setError(res.error);
          })
        }
      >
        {pending ? "Confirmando…" : "Confirmar pago Nequi"}
      </button>
      {error ? <p className="text-sm text-burgundy">{error}</p> : null}
    </div>
  );
}
