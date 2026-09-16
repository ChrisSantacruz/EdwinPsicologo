import Link from "next/link";
import { BrandMark } from "@/components/brand";
import { PRACTICE } from "@/lib/constants";
import { formatPhoneDisplay, whatsappLink } from "@/lib/format";

export default function NotFound() {
  const wa = whatsappLink(
    PRACTICE.phone,
    "Hola, llegué a un enlace de cita que no funciona. ¿Me ayudas a reprogramar?",
  );

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <BrandMark size={72} />
      <h1 className="mt-6 font-display text-3xl font-semibold text-ink">Enlace no disponible</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Puede que la cita ya no exista o el enlace haya vencido. Si llegaste por un mensaje de
        confirmación, escribe a {PRACTICE.professionalName.split(" ")[0]} por WhatsApp.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <a href={wa} target="_blank" rel="noreferrer" className="ios-btn ios-btn-primary">
          WhatsApp · {formatPhoneDisplay(PRACTICE.phone)}
        </a>
        <Link href="/admin/login" className="ios-btn ios-btn-secondary">
          Soy el profesional
        </Link>
      </div>
    </main>
  );
}
