/**
 * Apaga avisos del panel + push (pruebas).
 * En Vercel/.env: NOTIFICATIONS_ENABLED=false
 * Quitar la variable o poner true para volver a activar.
 */
export function notificationsEnabled() {
  const v = process.env.NOTIFICATIONS_ENABLED?.trim().toLowerCase();
  if (v === undefined || v === "") return true;
  return v !== "false" && v !== "0" && v !== "off" && v !== "no";
}
