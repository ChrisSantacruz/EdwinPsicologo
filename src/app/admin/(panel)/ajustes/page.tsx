import Link from "next/link";
import {
  getGoogleAuthUrl,
  getGoogleRedirectUri,
  isGoogleConnected,
} from "@/lib/calendar";
import { PRACTICE } from "@/lib/constants";
import { formatPhoneDisplay } from "@/lib/format";
import { isWhatsAppBotConfigured, isWhatsAppConfigured } from "@/lib/whatsapp";

export default async function AjustesPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string }>;
}) {
  const { google } = await searchParams;
  const calendarOk = await isGoogleConnected();
  const authUrl = getGoogleAuthUrl();
  const googleReady = Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
  const redirectUri = getGoogleRedirectUri();
  const waReady = isWhatsAppConfigured();
  const botReady = isWhatsAppBotConfigured();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h2 className="font-display text-3xl font-semibold text-ink">Ajustes</h2>
        <p className="mt-1 text-sm text-muted">Conecta tu agenda y tu WhatsApp</p>
      </div>

      {google === "connected" ? (
        <p className="rounded-2xl bg-success/10 px-4 py-3 text-sm font-medium text-success">
          ¡Listo! Tu Google Calendar quedó conectado.
        </p>
      ) : null}
      {google === "error" ? (
        <p className="rounded-2xl bg-burgundy/10 px-4 py-3 text-sm font-medium text-burgundy">
          No se pudo conectar Calendar. En Google Cloud, en tu cliente OAuth, agrega exactamente
          esta dirección de redirección:
          <code className="mt-2 block break-all rounded-xl bg-white px-3 py-2 text-xs">{redirectUri}</code>
        </p>
      ) : null}

      <div className="ios-card space-y-3 p-5">
        <h3 className="font-semibold text-ink">Tu consultorio</h3>
        <p className="text-sm text-muted">{PRACTICE.professionalName}</p>
        <p className="text-sm text-muted">WhatsApp / Nequi: {formatPhoneDisplay(PRACTICE.phone)}</p>
        <p className="text-sm text-muted">{PRACTICE.city}</p>
      </div>

      <div className="ios-card space-y-4 p-5">
        <h3 className="font-semibold text-ink">WhatsApp</h3>
        <p className="text-sm text-muted">
          Vincula el celular desde el panel, sin entrar a páginas técnicas.
        </p>
        {waReady || botReady ? (
          <p className="rounded-2xl bg-success/10 px-4 py-3 text-sm font-medium text-success">
            Listo para enviar mensajes a tus pacientes
          </p>
        ) : (
          <p className="rounded-2xl bg-canvas px-4 py-3 text-sm text-muted">
            Aún no está vinculado. Usa el botón de abajo.
          </p>
        )}
        <Link href="/admin/whatsapp" className="ios-btn ios-btn-primary w-full">
          Conectar o revisar WhatsApp
        </Link>
      </div>

      <div className="ios-card space-y-4 p-5">
        <h3 className="font-semibold text-ink">Google Calendar</h3>
        <p className="text-sm text-muted">
          Las citas se agregan solas a tu calendario, con avisos antes de cada sesión.
        </p>

        {!googleReady ? (
          <p className="rounded-2xl bg-canvas px-4 py-3 text-sm text-muted">
            Falta configurar Google en el hosting. Pide ayuda a quien te instaló el sistema.
          </p>
        ) : calendarOk ? (
          <p className="rounded-2xl bg-success/10 px-4 py-3 text-sm font-medium text-success">
            Calendar conectado
          </p>
        ) : authUrl ? (
          <div className="space-y-3">
            <a href={authUrl} className="ios-btn ios-btn-primary w-full">
              Conectar mi Google Calendar
            </a>
            <p className="text-xs leading-relaxed text-muted">
              Si Google dice que la solicitud no es válida, agrega esta URL en la consola de Google
              (URI de redirección):
              <code className="mt-1 block break-all rounded-xl bg-canvas px-3 py-2 text-burgundy">
                {redirectUri}
              </code>
            </p>
          </div>
        ) : null}
      </div>

      <div className="ios-card space-y-3 p-5">
        <h3 className="font-semibold text-ink">Notificaciones en el celular</h3>
        <p className="text-sm text-muted">
          Con el panel abierto, el navegador puede avisarte cuando un paciente confirma. Activa el
          permiso si te aparece el banner arriba.
        </p>
      </div>

      <Link href="/admin" className="ios-btn ios-btn-secondary w-full">
        Volver a la agenda
      </Link>
    </div>
  );
}
