"use client";

import { useState, useTransition } from "react";
import { formatMoney } from "@/lib/format";

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
  amount,
  paymentRef,
  action,
}: {
  amount: number;
  paymentRef?: string | null;
  action: (note?: string) => Promise<{ error?: string; ok?: boolean }>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [note, setNote] = useState("");

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-canvas px-4 py-3 text-sm text-muted">
        <p>
          Verifica en Nequi: <strong className="text-ink">{formatMoney(amount)}</strong>
          {paymentRef ? (
            <>
              {" "}
              · referencia <strong className="font-mono text-burgundy">{paymentRef}</strong>
            </>
          ) : null}
        </p>
      </div>
      <label className="flex items-start gap-3 text-sm text-ink">
        <input
          type="checkbox"
          className="mt-1"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
        <span>Ya vi el pantallazo y el dinero aparece en mi Nequi por ese monto.</span>
      </label>
      <input
        className="ios-input"
        placeholder="Nota opcional (ej. hora del pantallazo)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <button
        type="button"
        disabled={pending || !checked}
        className="ios-btn ios-btn-primary w-full disabled:opacity-60"
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await action(note.trim() || undefined);
            if (res?.error) setError(res.error);
          })
        }
      >
        {pending ? "Confirmando…" : "Confirmar pago recibido"}
      </button>
      {error ? <p className="text-sm text-burgundy">{error}</p> : null}
    </div>
  );
}
