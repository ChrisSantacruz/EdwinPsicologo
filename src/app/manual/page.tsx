import Link from "next/link";
import { BrandMark } from "@/components/brand";
import { BRAND } from "@/lib/brand";

export default function ManualPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 flex items-center gap-3">
        <BrandMark size={52} />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-burgundy">
            {BRAND.tagline}
          </p>
          <h1 className="font-display text-3xl font-semibold text-ink">Manual rápido</h1>
        </div>
      </div>

      <div className="ios-card space-y-5 p-6 text-sm leading-relaxed text-brown">
        <section>
          <h2 className="font-semibold text-ink">1. Crear una cita</h2>
          <p className="mt-1">
            Panel → <strong>Nueva cita</strong> → paciente, servicio, precio, sede, fecha y hora. Se
            genera el mensaje y el link del paciente. El recordatorio para Edwin va en{" "}
            <strong>Google Calendar</strong>.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-ink">2. Enviar por WhatsApp</h2>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>
              <strong>API configurada:</strong> botón “Enviar por WhatsApp API” (automático).
            </li>
            <li>
              <strong>Sin API:</strong> “Abrir en WhatsApp” (wa.me, gratis, un toque).
            </li>
          </ul>
        </section>
        <section>
          <h2 className="font-semibold text-ink">3. Confirmación del paciente</h2>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>
              <strong>Efectivo:</strong> se confirma sola · alerta en el panel.
            </li>
            <li>
              <strong>Nequi:</strong> pantallazo al chat · Edwin confirma en la cita.
            </li>
          </ul>
        </section>
        <section>
          <h2 className="font-semibold text-ink">4. Contactos</h2>
          <p className="mt-1">
            Importa CSV de Google Contacts o agrégalos a mano. Cada cita guarda el paciente.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-ink">5. Google Calendar</h2>
          <p className="mt-1">
            En <strong>Ajustes</strong> conecta Gmail. Ahí Edwin maneja recordatorios y agenda.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-ink">6. WhatsApp Cloud API</h2>
          <p className="mt-1">
            Oficial de Meta, cuota gratis. No uses Evolution/Baileys en Vercel: necesitan VPS y se
            caen. Guía en Ajustes.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-ink">7. App en el celular</h2>
          <p className="mt-1">Safari/Chrome → “Agregar a pantalla de inicio” (PWA).</p>
        </section>
      </div>

      <div className="mt-6 flex gap-2">
        <Link href="/admin" className="ios-btn ios-btn-primary">
          Ir al panel
        </Link>
        <Link href="/admin/ajustes" className="ios-btn ios-btn-secondary">
          Ajustes
        </Link>
      </div>
    </main>
  );
}
