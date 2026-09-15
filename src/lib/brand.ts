import { PRACTICE } from "./constants";

export const BRAND = {
  tagline: "Atención psicológica especializada",
  slogan: "Acompañamiento profesional para tu bienestar emocional y desarrollo personal.",
  priority: "Tu bienestar es una prioridad.",
  closing:
    "Escucha, comprensión y herramientas para tu bienestar emocional. Estoy aquí para acompañarte.",
  cta: "Agenda tu cita hoy mismo",
  city: PRACTICE.city,
  colors: {
    burgundy: "#7A1F2B",
    burgundyDeep: "#5C1520",
    brown: "#5C3535",
    cream: "#F7F2F0",
    gold: "#E8A838",
    orange: "#D96B2F",
  },
} as const;
