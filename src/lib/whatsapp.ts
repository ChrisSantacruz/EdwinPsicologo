import "server-only";
import { phoneDigits } from "./format";

const GRAPH = "https://graph.facebook.com/v21.0";

export function isWhatsAppConfigured() {
  return Boolean(
    process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID,
  );
}

export function toWhatsAppRecipient(phone: string) {
  const digits = phoneDigits(phone);
  if (digits.startsWith("57") && digits.length >= 12) return digits;
  if (digits.length === 10) return `57${digits}`;
  return digits;
}

type SendResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string; code?: number };

export async function sendWhatsAppText(
  toPhone: string,
  body: string,
): Promise<SendResult> {
  if (!isWhatsAppConfigured()) {
    return {
      ok: false,
      error: "WhatsApp Cloud API no configurado. Completa WHATSAPP_TOKEN y WHATSAPP_PHONE_NUMBER_ID.",
    };
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const token = process.env.WHATSAPP_TOKEN!;
  const to = toWhatsAppRecipient(toPhone);

  const res = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: true, body },
    }),
  });

  const data = (await res.json()) as {
    messages?: { id: string }[];
    error?: { message: string; code?: number };
  };

  if (!res.ok || data.error) {
    return {
      ok: false,
      error: data.error?.message ?? `Error HTTP ${res.status}`,
      code: data.error?.code,
    };
  }

  return { ok: true, messageId: data.messages?.[0]?.id ?? "sent" };
}

/** Plantilla aprobada en Meta (para primer contacto fuera de ventana 24h). */
export async function sendWhatsAppTemplate(input: {
  toPhone: string;
  templateName: string;
  languageCode?: string;
  bodyParams?: string[];
}): Promise<SendResult> {
  if (!isWhatsAppConfigured()) {
    return {
      ok: false,
      error: "WhatsApp Cloud API no configurado.",
    };
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const token = process.env.WHATSAPP_TOKEN!;
  const to = toWhatsAppRecipient(input.toPhone);

  const components =
    input.bodyParams && input.bodyParams.length > 0
      ? [
          {
            type: "body",
            parameters: input.bodyParams.map((text) => ({
              type: "text",
              text,
            })),
          },
        ]
      : undefined;

  const res = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: input.templateName,
        language: { code: input.languageCode ?? "es" },
        ...(components ? { components } : {}),
      },
    }),
  });

  const data = (await res.json()) as {
    messages?: { id: string }[];
    error?: { message: string; code?: number };
  };

  if (!res.ok || data.error) {
    return {
      ok: false,
      error: data.error?.message ?? `Error HTTP ${res.status}`,
      code: data.error?.code,
    };
  }

  return { ok: true, messageId: data.messages?.[0]?.id ?? "sent" };
}

/**
 * Intenta texto libre; si Meta exige plantilla (fuera de 24h), usa plantilla configurada.
 */
export async function sendAppointmentWhatsApp(input: {
  toPhone: string;
  fullMessage: string;
  templateParams?: {
    patientName: string;
    dateLabel: string;
    timeLabel: string;
    serviceName: string;
    confirmUrl: string;
  };
}): Promise<SendResult & { mode?: "text" | "template" | "none" }> {
  const textResult = await sendWhatsAppText(input.toPhone, input.fullMessage);
  if (textResult.ok) return { ...textResult, mode: "text" };

  const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
  if (templateName && input.templateParams) {
    const templateResult = await sendWhatsAppTemplate({
      toPhone: input.toPhone,
      templateName,
      languageCode: process.env.WHATSAPP_TEMPLATE_LANG ?? "es",
      bodyParams: [
        input.templateParams.patientName,
        input.templateParams.dateLabel,
        input.templateParams.timeLabel,
        input.templateParams.serviceName,
        input.templateParams.confirmUrl,
      ],
    });
    if (templateResult.ok) return { ...templateResult, mode: "template" };
    return {
      ...templateResult,
      error: `Texto: ${textResult.error} | Plantilla: ${templateResult.error}`,
      mode: "none",
    };
  }

  return {
    ...textResult,
    error: `${textResult.error} Tip: crea una plantilla en Meta Business y define WHATSAPP_TEMPLATE_NAME.`,
    mode: "none",
  };
}
