"use client";

import { useActionState } from "react";
import { createThemeAction, type FormState } from "../../actions";

export function NewThemeForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createThemeAction, undefined);
  return (
    <form action={action} className="card grid gap-3 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
      <label className="grid gap-2">
        <span className="label">Nome do tema</span>
        <input name="label" className="input" maxLength={40} placeholder="Viagem de fim de ano" required />
      </label>
      <label className="grid gap-2">
        <span className="label">Identificador</span>
        <input name="id" className="input" maxLength={30} placeholder="viagem-fim-de-ano" pattern={"[a-z0-9\-]{2,30}"} required />
      </label>
      <button className="btn btn-small h-[52px]" disabled={pending}>
        Criar tema
      </button>
      <p role="status" className={`text-[15px] font-semibold md:col-span-3 ${state?.error ? "text-[var(--color-erro)]" : "text-[var(--color-ok)]"}`}>
        {state?.error ?? state?.ok}
      </p>
    </form>
  );
}
