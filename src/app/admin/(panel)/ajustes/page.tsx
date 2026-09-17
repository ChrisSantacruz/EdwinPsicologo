import Link from "next/link";
import {
  getGoogleRedirectUri,
  isGoogleConnected,
} from "@/lib/calendar";
import { PRACTICE } from "@/lib/constants";
import { formatPhoneDisplay } from "@/lib/format";
import { isWhatsAppBotConfigured, isWhatsAppConfigured } from "@/lib/whatsapp";
import { PushTestButton } from "@/components/push-test-button";
import { requireAdmin } from "@/lib/auth";
import { disconnectGoogleAction } from "@/app/actions";
import { redirect } from "next/navigation";

export default async function AjustesPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string }>;
}) {
  const auth = await requireAdmin();
  if (!auth) redirect("/admin/login");

  const { google } = await searchParams;
  const calendarOk = await isGoogleConnected();
  const googleReady = Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
  const waReady = isWhatsAppConfigured();
  const botReady = isWhatsAppBotConfigured();
  const redirectUri = getGoogleRedirectUri();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h2 className="font-display text-3xl font-semibold text-ink">Ajustes</h2>
        <p className="mt-1 text-sm text-muted">Tu consultorio, Calendar y WhatsApp</p>
      </div>

      {google === "connected" ? (
        <p className="rounded-2xl bg-success/10 px-4 py-3 text-sm font-medium text-success">
          ¡Listo! Tu Google Calendar quedó conectado.
        </p>
      ) : null}
      {google === "disconnected" ? (
        <p className="rounded-2xl bg-canvas px-4 py-3 text-sm text-muted">
          Calendar desconectado. Puedes volver a vincularlo con el correo del consultorio.
        </p>
      ) : null}
      {google === "denied" ? (
        <p className="rounded-2xl bg-burgundy/10 px-4 py-3 text-sm font-medium text-burgundy">
          Google bloqueó el acceso para este correo. En la pantalla de Google elige{" "}
          <strong>{auth.admin.email}</strong> (no otro Gmail). Si sigue fallando, hay que
          autorizar ese correo en Google Cloud (usuarios de prueba).
        </p>
      ) : null}
      {google === "error" ? (
        <p className="rounded-2xl bg-burgundy/10 px-4 py-3 text-sm font-medium text-burgundy">
          No se pudo conectar Calendar. Usa el correo <strong>{auth.admin.email}</strong> y
          vuelve a intentar.
        </p>
      ) : null}

      <div className="ios-card space-y-3 p-5">
        <h3 className="font-semibold text-ink">Tu consultorio</h3>
        <p className="text-sm text-muted">{PRACTICE.professionalName}</p>
        <p className="text-sm text-muted">Correo panel: {auth.admin.email}</p>
        <p className="text-sm text-muted">WhatsApp / Nequi: {formatPhoneDisplay(PRACTICE.phone)}</p>
        <p className="text-sm text-muted">{PRACTICE.city}</p>
      </div>

      <div className="ios-card space-y-4 p-5">
        <h3 className="font-semibold text-ink">WhatsApp</h3>
        <p className="text-sm text-muted">
          Vincula tu celular una vez. Después puedes enviar invitaciones desde cada cita.
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
          Conéctalo con <strong className="text-ink">{auth.admin.email}</strong>. Las citas se
          agregan solas a esa agenda, con avisos antes de cada sesión.
        </p>

        {!googleReady ? (
          <p className="rounded-2xl bg-canvas px-4 py-3 text-sm text-muted">
            Calendar aún no está disponible. Pide ayuda a quien te instaló el sistema.
          </p>
        ) : calendarOk ? (
          <div className="space-y-3">
            <p className="rounded-2xl bg-success/10 px-4 py-3 text-sm font-medium text-success">
              Calendar conectado
            </p>
            <form action={disconnectGoogleAction}>
              <button type="submit" className="ios-btn ios-btn-secondary w-full">
                Desconectar y volver a vincular
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-3">
            <a href="/api/google/connect" className="ios-btn ios-btn-primary w-full">
              Conectar Google Calendar
            </a>
            <p className="text-xs leading-relaxed text-muted">
              Cuando Google te pregunte, elige <strong>{auth.admin.email}</strong>. Si aparece
              “acceso denegado”, ese correo debe estar como usuario de prueba en Google Cloud.
            </p>
            <p className="break-all rounded-xl bg-canvas px-3 py-2 text-[11px] text-muted">
              URI de redirección: {redirectUri}
            </p>
          </div>
        )}
      </div>

      <div className="ios-card space-y-3 p-5">
        <h3 className="font-semibold text-ink">Consultorio y catálogo</h3>
        <p className="text-sm text-muted">Sedes, tipos de consulta y precios.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Link href="/admin/sedes" className="ios-btn ios-btn-secondary w-full">
            Sedes
          </Link>
          <Link href="/admin/servicios" className="ios-btn ios-btn-secondary w-full">
            Servicios
          </Link>
        </div>
      </div>

      <div className="ios-card space-y-3 p-5">
        <h3 className="font-semibold text-ink">Notificaciones en el celular</h3>
        <p className="text-sm text-muted">
          En el iPhone: Safari → Compartir → Agregar a pantalla de inicio. Abre la app desde el
          ícono y activa las alertas. Así te llegan aunque cierres el panel.
        </p>
        <PushTestButton />
      </div>

      <div className="ios-card space-y-3 p-5">
        <h3 className="font-semibold text-ink">Ayuda</h3>
        <p className="text-sm text-muted">Guía corta del día a día.</p>
        <Link href="/manual" className="ios-btn ios-btn-secondary w-full">
          Cómo usar tu agenda
        </Link>
      </div>

      <Link href="/admin" className="ios-btn ios-btn-secondary w-full">
        Volver a la agenda
      </Link>
    </div>
  );
}
