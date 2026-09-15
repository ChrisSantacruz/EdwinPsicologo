/**
 * URL pública de la app. Tolera APP_URL vacío (Vercel a veces lo deja en "").
 */
export function getAppUrl() {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return vercel.startsWith("http") ? vercel.replace(/\/$/, "") : `https://${vercel}`;
  }

  return "http://localhost:3000";
}
