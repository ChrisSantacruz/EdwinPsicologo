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
  phone: process.env.PRACTICE_PHONE ?? "3028124298",
  nequi: process.env.NEQUI_NUMBER ?? "3005116999",
  city: "Pasto, Nariño – Colombia",
};
