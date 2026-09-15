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

export function fancyNequiNumber(phone: string) {
  return phoneDigits(phone)
    .split("")
    .map((n) => {
      const map: Record<string, string> = {
        "0": "0️⃣",
        "1": "1️⃣",
        "2": "2️⃣",
        "3": "3️⃣",
        "4": "4️⃣",
        "5": "5️⃣",
        "6": "6️⃣",
        "7": "7️⃣",
        "8": "8️⃣",
        "9": "9️⃣",
      };
      return map[n] ?? n;
    })
    .join("");
}

type MessageInput = {
  scheduledAt: Date;
  address: string;
  neighborhood: string;
  serviceName: string;
  price: number;
  confirmUrl?: string;
};

export function buildConfirmationMessage(input: MessageInput) {
  const day = formatAppointmentDate(input.scheduledAt);
  const time = formatAppointmentTime(input.scheduledAt);
  const investment = formatMoney(input.price).replace(/\s/g, "");
  const nequiFancy = fancyNequiNumber(PRACTICE.nequi);

  let msg = `▪️CONFIRMO CITA:

Buenos días. 
✅${PRACTICE.professionalName}
${PRACTICE.title} 
Confirma cita para el día: 
🗓️${day}
📍Dirección: ${input.address} 
🏙️Barrio: ${input.neighborhood}
⏰Hora: ${time} 
Actividad: ${input.serviceName} 
Inversión: ${investment}
Para agendarle su cita es tan amable de transferir por Nequi al número                📱${nequiFancy}y enviar vía WhatsApp comprobante del mismo y así confirmar su asistencia.
Mil Gracias❗️

<Mensaje de agendamiento electrónico TEAM 〽️> para ${formatBogota(input.scheduledAt, "yyyy")}.`;

  if (input.confirmUrl) {
    msg += `

🔗 Confirma tu cita y método de pago aquí:
${input.confirmUrl}`;
  }

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
  let msg = `Hola ${input.patientName.split(" ")[0]}, te recuerdo tu cita con ${PRACTICE.professionalName} (${PRACTICE.title}).

🗓️ ${day}
⏰ ${time}
📍 ${input.address}
🩺 ${input.serviceName}

¿Nos confirmas tu asistencia?
Mil gracias ❗️`;

  if (input.confirmUrl) {
    msg += `\n\n🔗 Confirma aquí: ${input.confirmUrl}`;
  }
  return msg;
}

export function buildEdwinSelfReminderMessage(input: {
  title: string;
  dueAt: Date;
  notes?: string | null;
}) {
  const day = formatAppointmentDate(input.dueAt);
  const time = formatAppointmentTime(input.dueAt);
  return `🔔 Recuérdame

${input.title}
🗓️ ${day}
⏰ ${time}${input.notes ? `\n📝 ${input.notes}` : ""}`;
}

export function buildEdwinPatientAlertMessage(input: {
  patientName: string;
  paymentMethod: string;
  scheduledAt: Date;
  serviceName: string;
  adminUrl?: string;
  calendarUrl?: string;
  address?: string;
  price?: number;
  patientPhone?: string;
}) {
  const day = formatAppointmentDate(input.scheduledAt);
  const time = formatAppointmentTime(input.scheduledAt);
  const method =
    input.paymentMethod === "EFECTIVO"
      ? "Efectivo — cita CONFIRMADA"
      : input.paymentMethod === "NEQUI" && input.adminUrl
        ? "Nequi — esperando comprobante"
        : "Nequi";

  let msg = `🤖 BOT · Confirmación de cita

Paciente: ${input.patientName}${input.patientPhone ? `\nWhatsApp: ${input.patientPhone}` : ""}
🩺 ${input.serviceName}
🗓️ ${day}
⏰ ${time}
💳 ${method}`;

  if (input.address) msg += `\n📍 ${input.address}`;
  if (input.price) msg += `\n💰 ${formatMoney(input.price)}`;
  if (input.calendarUrl) msg += `\n\n📅 Abrir en Google Calendar:\n${input.calendarUrl}`;
  if (input.adminUrl) msg += `\n\n🖥️ Ver en el panel:\n${input.adminUrl}`;

  return msg;
}

/** Mensaje que el paciente le envía a Edwin al confirmar. */
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
      ? "Efectivo"
      : "Nequi (envío comprobante)";

  return `✅ Hola Edwin, confirmo mi cita

Paciente: ${input.patientName}
🩺 ${input.serviceName}
🗓️ ${day}
⏰ ${time}
💳 ${method}${input.address ? `\n📍 ${input.address}` : ""}

Quedo atento/a. ¡Mil gracias!`;
}

/** Link “Agregar a Google Calendar” (no requiere OAuth). */
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
