"use client";

import { useState, useTransition } from "react";
import { patientChoosePaymentAction } from "@/app/actions";
import { formatPhoneDisplay, whatsappLink } from "@/lib/format";
import { IconCash, IconCheck, IconNequi, IconWhatsApp } from "@/components/icons";

type ConfirmExtras = {
  patientConfirmWaUrl?: string;
  calendarUrl?: string;
  botSent?: boolean;
  adminUrl?: string;
};

export function PatientPaymentChooser({
  token,
  initialStatus,
  practicePhone,
  nequiNumber,
}: {
  token: string;
  initialStatus: string;
  practicePhone: string;
  nequiNumber: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [extras, setExtras] = useState<ConfirmExtras>({});
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
        patientConfirmWaUrl: res.patientConfirmWaUrl,
        calendarUrl: res.calendarUrl,
        botSent: res.botSent,
        adminUrl: res.adminUrl,
      });
    }
  }

  if (status === "CONFIRMED") {
    const wa =
      extras.patientConfirmWaUrl ??
      whatsappLink(
        practicePhone,
        `✅ Hola Edwin, confirmo mi cita. Quedo atento/a. ¡Mil gracias!`,
      );

    return (
      <div className="ios-card patient-card fade-up space-y-4 p-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success shadow-inner">
          <IconCheck className="h-8 w-8" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">Cita confirmada</h2>
          <div className="mx-auto mt-2 h-px w-14 bg-gradient-to-r from-transparent via-gold to-transparent" />
        </div>
        <p className="text-sm leading-relaxed text-muted">
          Tu asistencia quedó registrada. Edwin ya ve la alerta en su panel
          {extras.botSent ? " y recibió el aviso del bot" : ""}.
        </p>

        <a href={wa} target="_blank" rel="noreferrer" className="ios-btn ios-btn-primary w-full gap-2">
          <IconWhatsApp className="h-5 w-5" />
          Avisar a Edwin por WhatsApp
        </a>

        {extras.calendarUrl ? (
          <a
            href={extras.calendarUrl}
            target="_blank"
            rel="noreferrer"
            className="ios-btn ios-btn-secondary w-full"
          >
            Agregar a Google Calendar
          </a>
        ) : null}
      </div>
    );
  }

  if (status === "AWAITING_PROOF") {
    const waProof =
      extras.patientConfirmWaUrl ??
      whatsappLink(
        practicePhone,
        `Hola Edwin, elegí pagar por Nequi y te envío el comprobante para confirmar mi cita.`,
      );

    return (
      <div className="ios-card patient-card fade-up space-y-4 p-5">
        <div className="text-center">
          <h2 className="font-display text-xl font-semibold text-ink">Pago por Nequi</h2>
          <div className="mx-auto mt-2 h-px w-14 bg-gradient-to-r from-transparent via-gold to-transparent" />
        </div>
        <p className="text-sm leading-relaxed text-muted">
          Transfiere a{" "}
          <strong className="text-ink">{formatPhoneDisplay(nequiNumber)}</strong> y envía el
          pantallazo + tu confirmación a Edwin.
        </p>
        <div className="rounded-2xl bg-burgundy/[0.06] px-4 py-3 text-center text-sm font-medium text-burgundy">
          Edwin ya fue avisado en su panel
        </div>
        <a href={waProof} target="_blank" rel="noreferrer" className="ios-btn ios-btn-primary w-full gap-2">
          <IconWhatsApp className="h-5 w-5" />
          Enviar comprobante por WhatsApp
        </a>
        {extras.calendarUrl ? (
          <a
            href={extras.calendarUrl}
            target="_blank"
            rel="noreferrer"
            className="ios-btn ios-btn-secondary w-full"
          >
            Abrir en Google Calendar
          </a>
        ) : null}
      </div>
    );
  }

  if (status === "CANCELLED") {
    return (
      <div className="ios-card patient-card p-5 text-center">
        <h2 className="font-display text-xl font-semibold text-ink">Cita cancelada</h2>
        <p className="mt-2 text-sm text-muted">Comunícate con el consultorio para reprogramar.</p>
      </div>
    );
  }

  return (
    <div className="ios-card patient-card fade-up space-y-4 p-5">
      <div className="text-center">
        <h2 className="font-display text-xl font-semibold text-ink">Confirma tu asistencia</h2>
        <p className="mt-1 text-sm text-muted">Elige cómo realizarás el pago</p>
        <div className="mx-auto mt-2 h-px w-14 bg-gradient-to-r from-transparent via-gold to-transparent" />
      </div>

      <button
        type="button"
        disabled={pending}
        className="patient-pay-option"
        onClick={() =>
          startTransition(async () => {
            applyResult(await patientChoosePaymentAction(token, "EFECTIVO"));
          })
        }
      >
        <span className="patient-pay-icon text-burgundy">
          <IconCash className="h-5 w-5" />
        </span>
        <span>
          <span className="block font-semibold text-ink">Pagaré en efectivo</span>
          <span className="mt-0.5 block text-xs text-muted">
            Confirma al instante · aviso a Edwin
          </span>
        </span>
      </button>

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
          <span className="block font-semibold text-ink">Pagar por Nequi</span>
          <span className="mt-0.5 block text-xs text-muted">
            Al {formatPhoneDisplay(nequiNumber)} · envías pantallazo
          </span>
        </span>
      </button>

      {error ? <p className="text-center text-sm text-burgundy">{error}</p> : null}
      {pending ? <p className="text-center text-xs text-muted">Confirmando…</p> : null}
    </div>
  );
}
