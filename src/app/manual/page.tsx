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
          <h1 className="font-display text-3xl font-semibold text-ink">Cómo usar tu agenda</h1>
        </div>
      </div>

      <div className="ios-card space-y-5 p-6 text-sm leading-relaxed text-brown">
        <section>
          <h2 className="font-semibold text-ink">1. Crear una cita</h2>
          <p className="mt-1">
            Entra a <strong>Nueva cita</strong>, elige paciente, tipo de consulta, sede, día y hora.
            El sistema prepara el mensaje y el link para que la persona confirme.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-ink">2. Enviar el mensaje</h2>
          <p className="mt-1">
            En la cita, toca <strong>Enviar mensaje</strong>. Si WhatsApp está vinculado, se envía
            solo. Si no, usa <strong>Abrir en WhatsApp</strong> y envías tú el texto.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-ink">3. Confirmación del paciente</h2>
          <p className="mt-1">
            La persona abre el link, elige <strong>efectivo</strong> (queda confirmada) o{" "}
            <strong>Nequi</strong> (te envía el comprobante y tú confirmas en el panel).
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-ink">4. Calendar y WhatsApp</h2>
          <p className="mt-1">
            En <strong>Ajustes</strong> conectas tu Google Calendar. En{" "}
            <strong>WhatsApp</strong> vinculas el celular escaneando el código desde esta misma
            página.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-ink">5. Alertas en el celular</h2>
          <p className="mt-1">
            En Safari: Compartir → Agregar a pantalla de inicio. Abre la app desde el ícono y
            activa las alertas para que te avise cuando un paciente confirme.
          </p>
        </section>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/admin" className="ios-btn ios-btn-primary">
          Ir a la agenda
        </Link>
        <Link href="/admin/whatsapp" className="ios-btn ios-btn-secondary">
          Conectar WhatsApp
        </Link>
      </div>
    </main>
  );
}
