import { PRACTICE } from "./constants";
import { formatBogota } from "./time";

export function formatMoney(cop: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(cop);
}

export function formatAppointmentDate(date: Date) {
  const raw = formatBogota(date, "EEEE d 'de' MMMM 'de' yyyy");
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function formatAppointmentTime(date: Date) {
  return formatBogota(date, "h:mm a").toLowerCase();
}

export function phoneDigits(phone: string) {
  return phone.replace(/\D/g, "");
}

export function formatPhoneDisplay(phone: string) {
  const d = phoneDigits(phone);
  if (d.length === 10) {
    return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  }
  return phone;
}

function greetingForNow() {
  const hour = Number(formatBogota(new Date(), "H"));
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

type MessageInput = {
  scheduledAt: Date;
  address: string;
  neighborhood: string;
  serviceName: string;
  price: number;
  confirmUrl?: string;
  patientName?: string;
};

/** Mensaje cálido que se envía al paciente al agendar. */
export function buildConfirmationMessage(input: MessageInput) {
  const day = formatAppointmentDate(input.scheduledAt);
  const time = formatAppointmentTime(input.scheduledAt);
  const investment = formatMoney(input.price);
  const firstName = input.patientName?.trim().split(/\s+/)[0];
  const hello = firstName ? `Hola ${firstName}` : "Hola";

  let msg = `${hello}, ${greetingForNow().toLowerCase()} 🌿

Te escribe ${PRACTICE.professionalName}, ${PRACTICE.title.toLowerCase()}.

Preparé un espacio de cuidado para ti. Entra al link para ver los detalles de tu cita y confirmar tu asistencia con calma.

🗓️ ${day}
⏰ ${time}
🩺 ${input.serviceName}
💰 Inversión: ${investment}`;

  if (input.confirmUrl) {
    msg += `

Tu espacio está aquí:
${input.confirmUrl}`;
  }

  msg += `

Si tienes alguna duda, respóndeme por este mismo chat.
Estoy aquí para ti. ¡Mil gracias! 🤍`;

  return msg;
}

export function whatsappLink(phone: string, text: string) {
  const digits = phoneDigits(phone);
  const withCountry = digits.startsWith("57") ? digits : `57${digits}`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(text)}`;
}

export function patientPhoneToWhatsApp(phone: string) {
  return whatsappLink(phone, "");
}

export function buildPatientReminderMessage(input: {
  patientName: string;
  scheduledAt: Date;
  serviceName: string;
  address: string;
  confirmUrl?: string;
}) {
  const day = formatAppointmentDate(input.scheduledAt);
  const time = formatAppointmentTime(input.scheduledAt);
  const first = input.patientName.split(" ")[0];
  let msg = `Hola ${first} 🌿

Te recuerdo con cariño tu cita con ${PRACTICE.professionalName}.

🗓️ ${day}
⏰ ${time}
📍 ${input.address}
🩺 ${input.serviceName}

¿Me confirmas tu asistencia?`;

  if (input.confirmUrl) {
    msg += `\n\nPuedes confirmar aquí:\n${input.confirmUrl}`;
  }

  msg += `\n\n¡Te espero!`;
  return msg;
}

export function buildEdwinSelfReminderMessage(input: {
  title: string;
  dueAt: Date;
  notes?: string | null;
}) {
  const day = formatAppointmentDate(input.dueAt);
  const time = formatAppointmentTime(input.dueAt);
  return `Recordatorio

${input.title}
🗓️ ${day}
⏰ ${time}${input.notes ? `\n📝 ${input.notes}` : ""}`;
}

export function buildEdwinPatientAlertMessage(input: {
  patientName: string;
  paymentMethod: string;
  scheduledAt: Date;
  serviceName: string;
  address?: string;
  price?: number;
  patientPhone?: string;
}) {
  const day = formatAppointmentDate(input.scheduledAt);
  const time = formatAppointmentTime(input.scheduledAt);
  const first = input.patientName.split(" ")[0];
  const method =
    input.paymentMethod === "EFECTIVO"
      ? "confirmó en efectivo"
      : "eligió Nequi y enviará el comprobante";

  let msg = `Hola 🌿

${first} ${method}.

🩺 ${input.serviceName}
🗓️ ${day}
⏰ ${time}`;

  if (input.address) msg += `\n📍 ${input.address}`;
  if (input.patientPhone) msg += `\n📱 ${formatPhoneDisplay(input.patientPhone)}`;

  msg += `\n\nYa quedó en tu agenda. ¡Buen trabajo acompañando!`;
  return msg;
}

export function buildPatientToEdwinConfirmMessage(input: {
  patientName: string;
  paymentMethod: string;
  scheduledAt: Date;
  serviceName: string;
  address?: string;
}) {
  const day = formatAppointmentDate(input.scheduledAt);
  const time = formatAppointmentTime(input.scheduledAt);
  const method =
    input.paymentMethod === "EFECTIVO"
      ? "efectivo"
      : "Nequi (te envío el pantallazo)";

  return `Hola ${PRACTICE.professionalName.split(" ")[0]}, confirmo mi cita 🤍

Soy ${input.patientName}.
🩺 ${input.serviceName}
🗓️ ${day}
⏰ ${time}
💳 ${method}${input.address ? `\n📍 ${input.address}` : ""}

¡Mil gracias por tu acompañamiento!`;
}

/** WhatsApp #2: solo cuando Edwin ya confirmó en el panel. */
export function buildEdwinConfirmedPatientMessage(input: {
  patientName: string;
  scheduledAt: Date;
  serviceName: string;
  address: string;
  neighborhood: string;
}) {
  const first = input.patientName.split(" ")[0];
  const day = formatAppointmentDate(input.scheduledAt);
  const time = formatAppointmentTime(input.scheduledAt);

  return `Hola ${first} 🌿

${PRACTICE.professionalName} confirmó tu cita.

Este es un espacio pensado para ti: de escucha, cuidado y acompañamiento. Estoy dispuesto a ayudarte en lo que necesites.

🗓️ ${day}
⏰ ${time}
🩺 ${input.serviceName}
📍 ${input.address}
🏙️ ${input.neighborhood}

Recuerda ser puntual para aprovechar bien nuestro encuentro.
Si algo se cruza, avísame con tiempo por este chat.

Te espero con calma.
— ${PRACTICE.professionalName}`;
}

/** Link Calendar para el PACIENTE — solo datos cálidos, sin panel ni pagos. */
export function buildPatientGoogleCalendarUrl(input: {
  patientName: string;
  scheduledAt: Date;
  serviceName: string;
  address: string;
  neighborhood: string;
}) {
  const first = input.patientName.split(" ")[0];
  const day = formatAppointmentDate(input.scheduledAt);
  const time = formatAppointmentTime(input.scheduledAt);

  return buildGoogleCalendarUrl({
    title: `Cita con ${PRACTICE.professionalName}`,
    start: input.scheduledAt,
    location: `${input.address}, ${input.neighborhood}`,
    details: [
      `Hola ${first} 🌿`,
      ``,
      `Tu espacio de cuidado con ${PRACTICE.professionalName}.`,
      ``,
      `🩺 ${input.serviceName}`,
      `🗓️ ${day}`,
      `⏰ ${time}`,
      `📍 ${input.address}`,
      ``,
      `Te espero con calma. Si necesitas algo, escríbeme por WhatsApp.`,
      `— ${PRACTICE.professionalName}`,
    ].join("\n"),
  });
}

export function buildGoogleCalendarUrl(input: {
  title: string;
  start: Date;
  durationMinutes?: number;
  details: string;
  location: string;
}) {
  const start = input.start;
  const end = new Date(start.getTime() + (input.durationMinutes ?? 60) * 60 * 1000);

  const toCal = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates: `${toCal(start)}/${toCal(end)}`,
    details: input.details,
    location: input.location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
