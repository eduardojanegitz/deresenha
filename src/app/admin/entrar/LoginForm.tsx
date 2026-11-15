"use client";

import { useActionState } from "react";
import { loginAction, type FormState } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, undefined);
  return (
    <form action={action} className="card grid gap-4 p-5">
      <label className="grid gap-2">
        <span className="label">Senha</span>
        <input className="input" type="password" name="password" autoComplete="current-password" required maxLength={200} autoFocus />
      </label>
      <p role="alert" className="text-[15px] font-semibold text-[var(--color-erro)]">
        {state?.error}
      </p>
      <button className="btn" disabled={pending}>
        {pending ? "Entrando…" : "Entrar no painel"}
      </button>
    </form>
  );
}
