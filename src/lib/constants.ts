export const STATUS = {
  PENDING_PATIENT: "PENDING_PATIENT",
  AWAITING_PROOF: "AWAITING_PROOF",
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
  PENDING_PATIENT: "Pendiente paciente",
  AWAITING_PROOF: "Esperando comprobante",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
};

export const PRACTICE = {
  professionalName: "Edwin Mideros Meza",
  title: "Psicólogo",
  phone: process.env.PRACTICE_PHONE ?? "3005116999",
  nequi: process.env.NEQUI_NUMBER ?? "3005116999",
  city: "Pasto, Nariño – Colombia",
};
