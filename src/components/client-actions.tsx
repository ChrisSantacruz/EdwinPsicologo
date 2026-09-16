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
  }>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState(mode === "efectivo");
  const [note, setNote] = useState("");
  const [done, setDone] = useState<{
    whatsappSent?: boolean;
    confirmWaUrl?: string;
  } | null>(null);

  if (done) {
    return (
      <div className="space-y-3 rounded-2xl bg-success/10 px-4 py-4">
        <p className="text-sm font-semibold text-success">Cita confirmada</p>
        <p className="text-sm text-muted">
          {done.whatsappSent
            ? "El mensaje de confirmación se envió al paciente."
            : "Envía ahora el mensaje cálido de confirmación por WhatsApp:"}
        </p>
        {done.confirmWaUrl && !done.whatsappSent ? (
          <a href={done.confirmWaUrl} target="_blank" rel="noreferrer" className="ios-btn ios-btn-primary w-full">
            Enviar confirmación por WhatsApp
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {mode === "nequi" ? (
        <>
          <div className="rounded-2xl bg-canvas px-4 py-3 text-sm text-muted">
            <p>
              Verifica el pantallazo: <strong className="text-ink">{formatMoney(amount)}</strong>
              {paymentRef ? (
                <>
                  {" "}
                  · ref <strong className="font-mono text-burgundy">{paymentRef}</strong>
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
            <span>Ya revisé el pantallazo en WhatsApp y el dinero está en mi Nequi.</span>
          </label>
          <input
            className="ios-input"
            placeholder="Nota opcional"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </>
      ) : (
        <p className="text-sm text-muted">
          El paciente eligió efectivo. Al confirmar, le enviaremos (o abrirás) el mensaje cálido de
          confirmación por WhatsApp.
        </p>
      )}

      <button
        type="button"
        disabled={pending || !checked}
        className="ios-btn ios-btn-primary w-full disabled:opacity-60"
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              const res = await action(note.trim() || undefined);
              if (res?.error) {
                setError(res.error);
                return;
              }
              setDone({
                whatsappSent: res.whatsappSent,
                confirmWaUrl: res.confirmWaUrl,
              });
            } catch {
              setError("No se pudo confirmar. Recarga la página e inténtalo de nuevo.");
            }
          })
        }
      >
        {pending ? "Confirmando…" : "Confirmar cita"}
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
  action: (note?: string) => Promise<{ error?: string; ok?: boolean; whatsappSent?: boolean; confirmWaUrl?: string }>;
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
