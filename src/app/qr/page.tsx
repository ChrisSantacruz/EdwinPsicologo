import Link from "next/link";
import { BrandMark } from "@/components/brand";

export const metadata = {
  title: "WhatsApp — Edwin Citas",
};

/** Si alguien llega a /qr por error, lo guiamos al panel (sin jerga técnica). */
export default function QrHintPage() {
  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col items-center justify-center gap-5 px-4 py-16 text-center">
      <BrandMark size={72} />
      <h1 className="font-display text-3xl font-semibold text-ink">Vincula WhatsApp aquí</h1>
      <p className="text-sm leading-relaxed text-muted">
        Para conectar tu celular y enviar mensajes a tus pacientes, usa la sección WhatsApp del
        panel.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/admin/whatsapp" className="ios-btn ios-btn-primary">
          Ir a WhatsApp
        </Link>
        <Link href="/admin" className="ios-btn ios-btn-secondary">
          Ir a la agenda
        </Link>
      </div>
    </main>
  );
}
