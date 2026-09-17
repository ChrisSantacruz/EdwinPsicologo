"use client";

import { useState, useTransition } from "react";
import { patientChoosePaymentAction } from "@/app/actions";
import { formatMoney, formatPhoneDisplay, whatsappLink } from "@/lib/format";
import { IconCheck, IconNequi, IconWhatsApp } from "@/components/icons";
import { CopyButton } from "@/components/client-actions";

type ConfirmExtras = {
  calendarUrl?: string;
  paymentRef?: string | null;
  amount?: number;
  nequi?: string;
};

export function PatientPaymentChooser({
  token,
  initialStatus,
  practicePhone,
  nequiNumber,
  paymentRef: initialRef,
  amount: initialAmount,
}: {
  token: string;
  initialStatus: string;
  practicePhone: string;
  nequiNumber: string;
  paymentRef?: string | null;
  amount?: number;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [extras, setExtras] = useState<ConfirmExtras>({
    paymentRef: initialRef,
    amount: initialAmount,
    nequi: nequiNumber,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function applyResult(res: Awaited<ReturnType<typeof patientChoosePaymentAction>>) {
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    if ("status" in res && res.status) {
      setStatus(res.status);
      setExtras({
        calendarUrl: res.calendarUrl,
        paymentRef: res.paymentRef,
        amount: res.amount,
        nequi: res.nequi ?? nequiNumber,
      });
    }
  }

  const amountLabel = formatMoney(extras.amount ?? initialAmount ?? 0);
  const refLabel = extras.paymentRef ?? initialRef ?? "—";
  const nequiLabel = formatPhoneDisplay(extras.nequi ?? nequiNumber);

  if (status === "CONFIRMED") {
    return (
      <div className="ios-card patient-card fade-up space-y-4 p-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success shadow-inner">
          <IconCheck className="h-8 w-8" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">Pago exitoso</h2>
          <div className="mx-auto mt-2 h-px w-14 bg-gradient-to-r from-transparent via-gold to-transparent" />
        </div>
        <p className="text-sm leading-relaxed text-muted">
          Tu pago fue aceptado y tu cita ya quedó confirmada. Por favor espera el día de tu
          encuentro y recuerda agendarla en tu Google Calendar.
        </p>
        {extras.calendarUrl ? (
          <a
            href={extras.calendarUrl}
            target="_blank"
            rel="noreferrer"
            className="ios-btn ios-btn-primary w-full"
          >
            Agendar en Google Calendar
          </a>
        ) : null}
      </div>
    );
  }

  if (status === "AWAITING_PROOF") {
    const waProof = whatsappLink(
      practicePhone,
      `Hola Edwin, te envío el pantallazo de mi Nequi. Monto ${amountLabel}. Referencia ${refLabel}.`,
    );

    return (
      <div className="ios-card patient-card fade-up space-y-4 p-5">
        <div className="text-center">
          <h2 className="font-display text-xl font-semibold text-ink">Paga por Nequi</h2>
          <p className="mt-1 text-sm text-muted">Paso a paso</p>
          <div className="mx-auto mt-2 h-px w-14 bg-gradient-to-r from-transparent via-gold to-transparent" />
        </div>

        <p className="rounded-2xl bg-burgundy/[0.06] px-4 py-3 text-sm leading-relaxed text-burgundy">
          Envía el pantallazo por WhatsApp para que Edwin pueda confirmar tu cita.
        </p>

        <ol className="space-y-3 text-left text-sm text-muted">
          <li className="rounded-2xl bg-canvas px-4 py-3">
            <span className="font-semibold text-ink">1. Monto exacto</span>
            <p className="mt-1 text-lg font-semibold text-burgundy">{amountLabel}</p>
          </li>
          <li className="rounded-2xl bg-canvas px-4 py-3">
            <span className="font-semibold text-ink">2. Número Nequi</span>
            <p className="mt-1 text-lg font-semibold text-ink">{nequiLabel}</p>
            <div className="mt-2">
              <CopyButton text={(extras.nequi ?? nequiNumber).replace(/\D/g, "")} label="Copiar número" />
            </div>
          </li>
          <li className="rounded-2xl bg-canvas px-4 py-3">
            <span className="font-semibold text-ink">3. En el mensaje de la transferencia</span>
            <p className="mt-1 font-mono text-lg font-bold tracking-wide text-burgundy">{refLabel}</p>
            <div className="mt-2">
              <CopyButton text={refLabel} label="Copiar referencia" />
            </div>
          </li>
          <li className="rounded-2xl bg-canvas px-4 py-3">
            <span className="font-semibold text-ink">4. Envía el pantallazo a Edwin</span>
            <p className="mt-1">Por WhatsApp. Él lo revisa en persona y confirma tu cita.</p>
          </li>
        </ol>

        <a href={waProof} target="_blank" rel="noreferrer" className="ios-btn ios-btn-primary w-full gap-2">
          <IconWhatsApp className="h-5 w-5" />
          Abrir chat para enviar pantallazo
        </a>
      </div>
    );
  }

  if (status === "CANCELLED") {
    return (
      <div className="ios-card patient-card p-5 text-center">
        <h2 className="font-display text-xl font-semibold text-ink">Cita cancelada</h2>
        <p className="mt-2 text-sm text-muted">Escríbenos para reprogramar cuando quieras.</p>
      </div>
    );
  }

  // PENDING_PATIENT (u otro): solo Nequi
  return (
    <div className="ios-card patient-card fade-up space-y-4 p-5">
      <div className="text-center">
        <h2 className="font-display text-xl font-semibold text-ink">Confirma tu asistencia</h2>
        <p className="mt-1 text-sm text-muted">
          Inversión: <strong className="text-ink">{amountLabel}</strong>
        </p>
        <p className="mt-1 text-xs text-muted">El pago se realiza únicamente por Nequi</p>
        <div className="mx-auto mt-2 h-px w-14 bg-gradient-to-r from-transparent via-gold to-transparent" />
      </div>

      <button
        type="button"
        disabled={pending}
        className="patient-pay-option"
        onClick={() =>
          startTransition(async () => {
            applyResult(await patientChoosePaymentAction(token, "NEQUI"));
          })
        }
      >
        <span className="patient-pay-icon text-burgundy">
          <IconNequi className="h-5 w-5" />
        </span>
        <span>
          <span className="block font-semibold text-ink">Continuar con Nequi</span>
          <span className="mt-0.5 block text-xs text-muted">
            Envías pantallazo · Edwin confirma
          </span>
        </span>
      </button>

      {error ? <p className="text-center text-sm text-burgundy">{error}</p> : null}
      {pending ? <p className="text-center text-xs text-muted">Guardando…</p> : null}
    </div>
  );
}
