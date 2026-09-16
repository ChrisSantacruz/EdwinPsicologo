import Link from "next/link";
import {
  getGoogleAuthUrl,
  getGoogleRedirectUri,
  isGoogleConnected,
} from "@/lib/calendar";
import { PRACTICE } from "@/lib/constants";
import { formatPhoneDisplay } from "@/lib/format";
import { isWhatsAppConfigured } from "@/lib/whatsapp";
import { getAppUrl } from "@/lib/app-url";

export default async function AjustesPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string }>;
}) {
  const { google } = await searchParams;
  const connected = await isGoogleConnected();
  const authUrl = getGoogleAuthUrl();
  const googleConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
  const redirectUri = getGoogleRedirectUri();
  const waConfigured = isWhatsAppConfigured();
  const appUrl = getAppUrl();
  const webhookUrl = `${appUrl}/api/whatsapp/webhook`;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h2 className="font-display text-3xl font-semibold text-ink">Ajustes</h2>
        <p className="mt-1 text-sm text-muted">Integraciones del consultorio</p>
      </div>

      {google === "connected" ? (
        <p className="rounded-2xl bg-success/10 px-4 py-3 text-sm font-medium text-success">
          Google Calendar conectado. Las citas nuevas se sincronizan solas.
        </p>
      ) : null}
      {google === "error" ? (
        <p className="rounded-2xl bg-burgundy/10 px-4 py-3 text-sm font-medium text-burgundy">
          No se pudo conectar Google. Revisa Client ID/Secret, el redirect URI y que el Gmail esté
          como usuario de prueba.
        </p>
      ) : null}

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
            Cloud API lista · puedes enviar desde cada cita sin abrir WhatsApp
          </p>
        ) : (
          <p className="rounded-2xl bg-canvas px-4 py-3 text-sm text-muted">
            Cloud API no configurada (normal en prueba). El panel usa{" "}
            <strong className="text-ink">Abrir en WhatsApp (wa.me)</strong> hacia{" "}
            {formatPhoneDisplay(PRACTICE.phone)}. El bot de Render es aparte (
            <code className="text-burgundy">/qr</code>).
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
        <h3 className="font-semibold text-ink">Notificaciones del sitio</h3>
        <p className="text-sm leading-relaxed text-muted">
          Con el panel abierto en{" "}
          <a className="font-semibold text-burgundy underline" href={appUrl}>
            {appUrl}
          </a>
          , el navegador muestra alertas cuando un paciente confirma o elige Nequi. Activa el permiso
          con el banner superior o desde la barra de direcciones del navegador.
        </p>
      </div>

      <div className="ios-card space-y-4 p-5">
        <h3 className="font-semibold text-ink">Google Calendar (Gmail personal)</h3>
        <p className="text-sm leading-relaxed text-muted">
          Aquí viven los recordatorios de Edwin. Conecta tu Gmail para crear/actualizar eventos al
          agendar (zona America/Bogota · avisos 60 y 15 min antes).
        </p>

        {!googleConfigured ? (
          <div className="rounded-2xl bg-canvas p-4 text-sm text-muted">
            <p className="font-medium text-ink">Configuración pendiente en Google Cloud</p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-4">
              <li>
                Abre{" "}
                <a
                  className="font-semibold text-burgundy underline"
                  href="https://console.cloud.google.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Google Cloud Console
                </a>{" "}
                → crea proyecto (ej. Edwin Citas)
              </li>
              <li>APIs y servicios → Biblioteca → activa <strong>Google Calendar API</strong></li>
              <li>
                Pantalla de consentimiento OAuth → External → agrega el Gmail de Edwin como{" "}
                <strong>usuario de prueba</strong>
              </li>
              <li>
                Credenciales → Crear credenciales → ID de cliente OAuth → tipo{" "}
                <strong>Aplicación web</strong>
              </li>
              <li>
                URI de redirección autorizada (cópiala exacta):
                <code className="mt-1 block break-all rounded-xl bg-white px-3 py-2 text-burgundy">
                  {redirectUri}
                </code>
              </li>
              <li>
                En Vercel pega <code>GOOGLE_CLIENT_ID</code> y <code>GOOGLE_CLIENT_SECRET</code> →
                redeploy
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

        {googleConfigured ? (
          <p className="text-xs text-muted">
            Redirect URI en uso: <code className="break-all text-burgundy">{redirectUri}</code>
          </p>
        ) : null}

        <Link href="/admin" className="ios-btn ios-btn-secondary w-full">
          Volver a la agenda
        </Link>
      </div>
    </div>
  );
}
