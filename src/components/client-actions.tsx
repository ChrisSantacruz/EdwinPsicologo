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

export function ConfirmAppointmentButton({
  mode,
  amount,
  paymentRef,
  action,
}: {
  mode: "nequi" | "efectivo";
  amount: number;
  paymentRef?: string | null;
  action: (
    note?: string,
  ) => Promise<{
    error?: string;
    ok?: boolean;
    whatsappSent?: boolean;
    confirmWaUrl?: string;
    confirmMessage?: string;
  }>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState(mode === "efectivo");
  const [done, setDone] = useState<{
    whatsappSent?: boolean;
    confirmWaUrl?: string;
    confirmMessage?: string;
  } | null>(null);

  if (done) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold text-success">Pago recibido · cita confirmada</p>
        {done.whatsappSent ? (
          <p className="text-sm text-muted">El mensaje de confirmación ya se envió al paciente.</p>
        ) : (
          <>
            <p className="text-sm text-muted">Envía este mensaje al paciente por WhatsApp:</p>
            {done.confirmMessage ? (
              <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-2xl bg-canvas p-4 text-sm leading-relaxed text-ink">
                {done.confirmMessage}
              </pre>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2">
              {done.confirmWaUrl ? (
                <a
                  href={done.confirmWaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ios-btn ios-btn-primary w-full"
                >
                  Abrir WhatsApp
                </a>
              ) : null}
              {done.confirmMessage ? (
                <CopyButton text={done.confirmMessage} label="Copiar mensaje" />
              ) : null}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {mode === "nequi" ? (
        <>
          <p className="text-sm text-muted">
            {formatMoney(amount)}
            {paymentRef ? (
              <>
                {" "}
                · ref <strong className="font-mono text-burgundy">{paymentRef}</strong>
              </>
            ) : null}
          </p>
          <label className="flex items-start gap-3 text-sm text-ink">
            <input
              type="checkbox"
              className="mt-1"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            <span>Ya llegó el pago a mi Nequi</span>
          </label>
        </>
      ) : (
        <p className="text-sm text-muted">Confirma para enviar el mensaje final al paciente.</p>
      )}

      <button
        type="button"
        disabled={pending || !checked}
        className="ios-btn ios-btn-primary w-full disabled:opacity-60"
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              const res = await action();
              if (res?.error) {
                setError(res.error);
                return;
              }
              setDone({
                whatsappSent: res.whatsappSent,
                confirmWaUrl: res.confirmWaUrl,
                confirmMessage: res.confirmMessage,
              });
            } catch {
              setError("No se pudo confirmar. Recarga la página e inténtalo de nuevo.");
            }
          })
        }
      >
        {pending ? "Confirmando…" : "Confirmar pago recibido"}
      </button>
      {error ? <p className="text-sm text-burgundy">{error}</p> : null}
    </div>
  );
}

/** Compat */
export function ConfirmNequiButton({
  amount,
  paymentRef,
  action,
}: {
  amount: number;
  paymentRef?: string | null;
  action: (note?: string) => Promise<{
    error?: string;
    ok?: boolean;
    whatsappSent?: boolean;
    confirmWaUrl?: string;
    confirmMessage?: string;
  }>;
}) {
  return (
    <ConfirmAppointmentButton
      mode="nequi"
      amount={amount}
      paymentRef={paymentRef}
      action={action}
    />
  );
}
