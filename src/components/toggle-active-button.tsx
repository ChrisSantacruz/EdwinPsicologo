"use client";

import { useTransition } from "react";

export function ToggleActiveButton({
  active,
  action,
  activeLabel = "Desactivar",
  inactiveLabel = "Activar",
}: {
  active: boolean;
  action: () => Promise<{ error?: string; ok?: boolean }>;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className="text-sm font-semibold text-burgundy disabled:opacity-50"
      onClick={() =>
        startTransition(() => {
          void action();
        })
      }
    >
      {pending ? "…" : active ? activeLabel : inactiveLabel}
    </button>
  );
}
