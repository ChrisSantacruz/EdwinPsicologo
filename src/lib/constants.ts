export const STATUS = {
  PENDING_PATIENT: "PENDING_PATIENT",
  AWAITING_PROOF: "AWAITING_PROOF",
  AWAITING_EDWIN: "AWAITING_EDWIN",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
} as const;

export type AppointmentStatus = (typeof STATUS)[keyof typeof STATUS];

export const PAYMENT = {
  EFECTIVO: "EFECTIVO",
  NEQUI: "NEQUI",
} as const;

export type PaymentMethod = (typeof PAYMENT)[keyof typeof PAYMENT];

export const STATUS_LABEL: Record<string, string> = {
  PENDING_PATIENT: "Esperando al paciente",
  AWAITING_PROOF: "Nequi · revisar pantallazo",
  AWAITING_EDWIN: "Efectivo · por confirmar",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
};

export const PRACTICE = {
  professionalName: "Edwin Mideros Meza",
  title: "Psicólogo Clínico",
  /** WhatsApp de contacto (paciente → consultorio). Pruebas: 3028124298 */
  phone: process.env.PRACTICE_PHONE?.trim() || "3028124298",
  nequi: process.env.NEQUI_NUMBER?.trim() || "3005116999",
  city: "Pasto, Nariño – Colombia",
};

/**
 * Destino del mensaje/enlace de invitación (admin → paciente).
 * En pruebas WHATSAPP_INVITE_TO fuerza el número de test.
 */
export function whatsappInviteRecipient(patientPhone: string) {
  const testTo = process.env.WHATSAPP_INVITE_TO?.trim();
  if (testTo) return testTo;
  return patientPhone;
}
