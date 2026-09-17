import { redirect } from "next/navigation";
import { getValidSession } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { BrandMark } from "@/components/brand";
import { BRAND } from "@/lib/brand";

export default async function LoginPage() {
  const session = await getValidSession();
  if (session) redirect("/admin");

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <div className="ios-card fade-up overflow-hidden">
        <div className="hero-arc h-36" />
        <div className="relative z-10 -mt-10 space-y-6 px-6 pb-8 pt-2 sm:px-8">
          <div className="flex flex-col items-center text-center">
            <BrandMark size={96} />
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-burgundy">
              {BRAND.tagline}
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Tu agenda</h1>
            <p className="mt-2 max-w-xs text-sm text-muted">
              Citas, pacientes y confirmaciones en un solo lugar.
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
