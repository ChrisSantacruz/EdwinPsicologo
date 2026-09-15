import Link from "next/link";
import { getGoogleAuthUrl, isGoogleConnected } from "@/lib/calendar";
import { PRACTICE } from "@/lib/constants";
import { formatPhoneDisplay } from "@/lib/format";
import { isWhatsAppConfigured } from "@/lib/whatsapp";

export default async function AjustesPage() {
  const connected = await isGoogleConnected();
  const authUrl = getGoogleAuthUrl();
  const googleConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
  const waConfigured = isWhatsAppConfigured();
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const webhookUrl = `${appUrl}/api/whatsapp/webhook`;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h2 className="font-display text-3xl font-semibold text-ink">Ajustes</h2>
        <p className="mt-1 text-sm text-muted">Integraciones del consultorio</p>
      </div>

      <div className="ios-card space-y-3 p-5">
        <h3 className="font-semibold text-ink">Consultorio</h3>
        <p className="text-sm text-muted">Profesional: {PRACTICE.professionalName}</p>
        <p className="text-sm text-muted">WhatsApp / Nequi: {formatPhoneDisplay(PRACTICE.phone)}</p>
        <p className="text-sm text-muted">Ciudad: {PRACTICE.city}</p>
      </div>

      <div className="ios-card space-y-4 p-5">
        <h3 className="font-semibold text-ink">WhatsApp Cloud API (recomendado · gratis)</h3>
        {waConfigured ? (
          <p className="rounded-2xl bg-success/10 px-4 py-3 text-sm font-medium text-success">
            Credenciales detectadas · puedes enviar desde cada cita
          </p>
        ) : (
          <p className="rounded-2xl bg-canvas px-4 py-3 text-sm text-muted">
            Sin configurar · el sistema usa “Abrir en WhatsApp” (wa.me) mientras tanto.
          </p>
        )}

        <div className="space-y-2 text-sm leading-relaxed text-muted">
          <p className="font-medium text-ink">Por qué esta y no Evolution / Baileys</p>
          <ul className="list-disc space-y-1 pl-4">
            <li>Oficial de Meta → estable en Vercel/hosting serverless</li>
            <li>Cuota gratuita mensual suficiente para un consultorio</li>
            <li>Evolution/Baileys necesitan VPS 24/7, QR y se banean fácil</li>
          </ul>
          <p className="font-medium text-ink pt-2">Setup rápido</p>
          <ol className="list-decimal space-y-1 pl-4">
            <li>
              Entra a{" "}
              <a
                className="font-semibold text-burgundy underline"
                href="https://developers.facebook.com/apps"
                target="_blank"
                rel="noreferrer"
              >
                Meta for Developers
              </a>{" "}
              → app → WhatsApp → API Setup
            </li>
            <li>Copia Temporary/Permanent Access Token y Phone number ID</li>
            <li>
              Pégalos en <code>.env</code> como <code>WHATSAPP_TOKEN</code> y{" "}
              <code>WHATSAPP_PHONE_NUMBER_ID</code>
            </li>
            <li>
              Webhook (opcional pero útil): <code className="break-all text-burgundy">{webhookUrl}</code>
            </li>
            <li>
              Verify token: el mismo valor de <code>WHATSAPP_VERIFY_TOKEN</code>
            </li>
            <li>
              Para escribir primero al paciente (fuera de 24h), crea una plantilla en Meta y pon{" "}
              <code>WHATSAPP_TEMPLATE_NAME</code>
            </li>
          </ol>
        </div>
      </div>

      <div className="ios-card space-y-4 p-5">
        <h3 className="font-semibold text-ink">Google Calendar (Gmail personal)</h3>
        <p className="text-sm leading-relaxed text-muted">
          Aquí viven los recordatorios de Edwin. Conecta tu Gmail para crear/actualizar eventos al
          agendar.
        </p>

        {!googleConfigured ? (
          <div className="rounded-2xl bg-canvas p-4 text-sm text-muted">
            <p className="font-medium text-ink">Configuración pendiente</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4">
              <li>Google Cloud → Calendar API</li>
              <li>OAuth Client (Web)</li>
              <li>
                Redirect: <code className="text-burgundy">http://localhost:3000/api/google/callback</code>
              </li>
              <li>
                Pega <code>GOOGLE_CLIENT_ID</code> y <code>GOOGLE_CLIENT_SECRET</code> en{" "}
                <code>.env</code>
              </li>
            </ol>
          </div>
        ) : connected ? (
          <p className="rounded-2xl bg-success/10 px-4 py-3 text-sm font-medium text-success">
            Calendar conectado correctamente
          </p>
        ) : authUrl ? (
          <a href={authUrl} className="ios-btn ios-btn-primary w-full">
            Conectar Google Calendar
          </a>
        ) : null}

        <Link href="/admin" className="ios-btn ios-btn-secondary w-full">
          Volver a la agenda
        </Link>
      </div>
    </div>
  );
}
