import Link from "next/link";
import { BrandMark } from "@/components/brand";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <BrandMark size={72} />
      <h1 className="mt-6 font-display text-3xl font-semibold text-ink">Página no encontrada</h1>
      <p className="mt-2 text-sm text-muted">
        El enlace puede haber expirado o la cita ya no existe.
      </p>
      <div className="mt-6 flex gap-2">
        <Link href="/admin" className="ios-btn ios-btn-primary">
          Ir al panel
        </Link>
        <Link href="/manual" className="ios-btn ios-btn-secondary">
          Manual
        </Link>
      </div>
    </main>
  );
}
