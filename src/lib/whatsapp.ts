import "server-only";
import { phoneDigits } from "./format";

const GRAPH = "https://graph.facebook.com/v21.0";

export function isWhatsAppBotConfigured() {
  return Boolean(
    process.env.WHATSAPP_BOT_URL?.trim() && process.env.WHATSAPP_BOT_SECRET?.trim(),
  );
}

export function isWhatsAppCloudConfigured() {
  return Boolean(
    process.env.WHATSAPP_TOKEN?.trim() && process.env.WHATSAPP_PHONE_NUMBER_ID?.trim(),
  );
}

/** Bot Render o Meta Cloud API — cualquiera habilita “Enviar mensaje”. */
export function isWhatsAppConfigured() {
  return isWhatsAppBotConfigured() || isWhatsAppCloudConfigured();
}

export function toWhatsAppRecipient(phone: string) {
  const digits = phoneDigits(phone);
  if (digits.startsWith("57") && digits.length >= 12) return digits;
  if (digits.length === 10) return `57${digits}`;
  return digits;
}

type SendResult =
  | { ok: true; messageId: string; mode?: "bot" | "text" | "template" }
  | { ok: false; error: string; code?: number; mode?: "none" };

async function sendViaBot(toPhone: string, body: string): Promise<SendResult> {
  const base = process.env.WHATSAPP_BOT_URL!.replace(/\/$/, "");
  const secret = process.env.WHATSAPP_BOT_SECRET!;

  const res = await fetch(`${base}/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-bot-secret": secret,
    },
    body: JSON.stringify({
      to: toWhatsAppRecipient(toPhone),
      text: body,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    messageId?: string;
    error?: string;
    status?: string;
  };

  if (!res.ok || !data.ok) {
    const hint =
      data.error === "whatsapp_not_connected"
        ? " WhatsApp no está vinculado: abre WhatsApp en el panel y vuelve a escanear el código."
        : "";
    return {
      ok: false,
      error:
        data.error === "whatsapp_not_connected"
          ? `No se pudo enviar.${hint}`
          : `No se pudo enviar el mensaje. Intenta de nuevo o usa Abrir en WhatsApp.${hint}`,
      mode: "none",
    };
  }

  return { ok: true, messageId: data.messageId ?? "sent", mode: "bot" };
}

export async function sendWhatsAppText(
  toPhone: string,
  body: string,
): Promise<SendResult> {
  if (isWhatsAppBotConfigured()) {
    return sendViaBot(toPhone, body);
  }

  if (!isWhatsAppCloudConfigured()) {
    return {
      ok: false,
      error:
        "WhatsApp no está listo. Abre WhatsApp en el panel, vincula tu celular y vuelve a intentar.",
      mode: "none",
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
      mode: "none",
    };
  }

  return {
    ok: true,
    messageId: data.messages?.[0]?.id ?? "sent",
    mode: "text",
  };
}

/** Plantilla aprobada en Meta (para primer contacto fuera de ventana 24h). */
export async function sendWhatsAppTemplate(input: {
  toPhone: string;
  templateName: string;
  languageCode?: string;
  bodyParams?: string[];
}): Promise<SendResult> {
  if (!isWhatsAppCloudConfigured()) {
    return {
      ok: false,
      error: "WhatsApp no está listo. Vincula tu celular desde el panel.",
      mode: "none",
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
      mode: "none",
    };
  }

  return {
    ok: true,
    messageId: data.messages?.[0]?.id ?? "sent",
    mode: "template",
  };
}

/**
 * Preferencia: bot Baileys (Render) → texto Cloud API → plantilla Meta.
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
}): Promise<SendResult> {
  const textResult = await sendWhatsAppText(input.toPhone, input.fullMessage);
  if (textResult.ok) return textResult;

  // Si falló el bot, no intentes Meta a menos que esté configurado
  if (isWhatsAppBotConfigured() && !isWhatsAppCloudConfigured()) {
    return textResult;
  }

  const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
  if (templateName && input.templateParams && isWhatsAppCloudConfigured()) {
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
    if (templateResult.ok) return templateResult;
    return {
      ok: false,
      error: "No se pudo enviar el mensaje. Prueba Abrir en WhatsApp.",
      mode: "none",
    };
  }

  return textResult;
}
