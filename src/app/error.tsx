"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="font-display text-3xl font-semibold text-ink">Algo salió mal</h1>
      <p className="mt-2 text-sm text-muted">Intenta de nuevo. Si continúa, reinicia la app.</p>
      <button type="button" className="ios-btn ios-btn-primary mt-6" onClick={reset}>
        Reintentar
      </button>
    </main>
  );
}
