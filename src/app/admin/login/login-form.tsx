"use client";

import { useState, useTransition } from "react";
import { loginAction } from "@/app/actions";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      action={(formData) => {
        startTransition(async () => {
          const res = await loginAction(formData);
          if (res?.error) setError(res.error);
        });
      }}
    >
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-brown">Correo</span>
        <input
          className="ios-input"
          type="email"
          name="email"
          required
          autoComplete="username"
          placeholder="Tu correo"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-brown">Contraseña</span>
        <input
          className="ios-input"
          type="password"
          name="password"
          required
          autoComplete="current-password"
        />
      </label>
      {error ? <p className="text-sm text-burgundy">{error}</p> : null}
      <button type="submit" disabled={pending} className="ios-btn ios-btn-primary w-full disabled:opacity-60">
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
