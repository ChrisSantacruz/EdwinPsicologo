"use client";

import { useState, useTransition } from "react";

export function ClearPastAppointmentsButton({
  count,
  action,
}: {
  count: number;
  action: () => Promise<{ ok?: boolean; deleted?: number; error?: string }>;
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        className="ios-btn ios-btn-secondary disabled:opacity-60"
        onClick={() => {
          if (
            !window.confirm(
              `¿Eliminar ${count} cita${count === 1 ? "" : "s"} pasada${count === 1 ? "" : "s"} del panel?`,
            )
          ) {
            return;
          }
          startTransition(async () => {
            const res = await action();
            if (res.error) {
              setMsg(res.error);
              return;
            }
            setMsg(`Se eliminaron ${res.deleted ?? 0}`);
          });
        }}
      >
        {pending ? "Limpiando…" : `Limpiar pasadas (${count})`}
      </button>
      {msg ? <p className="text-xs text-muted">{msg}</p> : null}
    </div>
  );
}
