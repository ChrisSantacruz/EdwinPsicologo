import Link from "next/link";
import { BrandMark } from "@/components/brand";

export const metadata = {
  title: "QR WhatsApp — servicio incorrecto",
};

/**
 * Si alguien abre /qr en Vercel o en un Render mal configurado (panel Next),
 * explica que el bot vive en otro rootDir.
 */
export default function QrHintPage() {
  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col items-center justify-center gap-5 px-4 py-16 text-center">
      <BrandMark size={72} />
      <h1 className="font-display text-3xl font-semibold text-ink">Este no es el bot</h1>
      <p className="text-sm leading-relaxed text-muted">
        Estás en el <strong>panel de citas</strong> (Next.js). El QR de WhatsApp solo existe en el
        servicio de Render cuyo <strong>Root Directory</strong> es{" "}
        <code className="text-burgundy">whatsapp-bot</code>.
      </p>
      <ol className="w-full list-decimal space-y-2 rounded-2xl bg-canvas px-5 py-4 text-left text-sm text-muted">
        <li>Render → tu servicio → Settings</li>
        <li>
          Root Directory → <code className="text-burgundy">whatsapp-bot</code>
        </li>
        <li>
          Build: <code>npm install</code> · Start: <code>npm start</code>
        </li>
        <li>Health Check Path: <code>/health</code></li>
        <li>Manual Deploy → Clear build cache & deploy</li>
        <li>
          Abre de nuevo <code className="text-burgundy">/qr</code> en ese servicio
        </li>
      </ol>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/admin" className="ios-btn ios-btn-primary">
          Ir al panel
        </Link>
        <a
          href="https://dashboard.render.com"
          target="_blank"
          rel="noreferrer"
          className="ios-btn ios-btn-secondary"
        >
          Abrir Render
        </a>
      </div>
    </main>
  );
}
