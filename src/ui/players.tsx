"use client";

import { useEffect, useId, useState } from "react";
import { Piece } from "@/brand/Piece";
import { PIECE_KINDS, type Player } from "@/engine/core";
import { IconX } from "./Icons";

const KEY = "deresenha:players";
const DEFAULT = ["Ana", "Beto", "Caio", "Duda"];
export const MAX_PLAYERS = 12;

/** Nomes ficam só neste aparelho (localStorage), para não precisar digitar de novo na revanche. */
export function usePlayerNames() {
  const [names, setNames] = useState<string[]>(DEFAULT);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed) && parsed.every((n) => typeof n === "string")) setNames(parsed.slice(0, MAX_PLAYERS));
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(names));
    } catch {}
  }, [names, loaded]);
  return [names, setNames] as const;
}

export const toPlayers = (names: string[]): Player[] => names.map((name, i) => ({ id: `p${i + 1}`, name, piece: PIECE_KINDS[i % PIECE_KINDS.length]! }));

export function validateName(name: string, existing: string[]): string | null {
  if (!name) return "Escreva um nome antes de adicionar.";
  if (name.length > 16) return "Use até 16 letras.";
  if (existing.some((n) => n.toLowerCase() === name.toLowerCase())) return `Já tem alguém chamado ${name}. Use um apelido diferente.`;
  if (existing.length >= MAX_PLAYERS) return `O limite é de ${MAX_PLAYERS} pessoas por partida.`;
  return null;
}

export function PlayersEditor({ names, onChange, min }: { names: string[]; onChange: (n: string[]) => void; min: number }) {
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const id = useId();
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const name = draft.trim().replace(/\s+/g, " ");
    const problem = validateName(name, names);
    setErr(problem);
    if (problem) return;
    onChange([...names, name]);
    setDraft("");
  };
  const full = names.length >= MAX_PLAYERS;
  return (
    <div className="grid gap-2.5">
      <span className="label" id={`${id}-l`}>
        Quem joga ({names.length})
      </span>
      <ul className="flex flex-wrap gap-2" aria-labelledby={`${id}-l`}>
        {names.map((n, i) => (
          <li key={n} className="inline-flex items-center gap-1.5 rounded-full bg-white py-1 pr-1 pl-1.5 font-semibold text-[var(--color-tinta)] shadow-[0_3px_0_var(--color-linha)]">
            <Piece kind={PIECE_KINDS[i % 5]!} size={30} />
            {n}
            <button className="grid size-[30px] place-items-center rounded-full bg-[var(--color-sup-2)]" onClick={() => onChange(names.filter((_, k) => k !== i))} aria-label={`Remover ${n}`}>
              <IconX />
            </button>
          </li>
        ))}
      </ul>
      <form className="flex gap-2" onSubmit={add}>
        <label className="sr-only" htmlFor={`${id}-i`}>
          Nome de quem joga
        </label>
        <input id={`${id}-i`} className="input w-full min-w-0 flex-1" size={1} maxLength={16} autoComplete="off" placeholder="Nome de quem joga" value={draft} onChange={(e) => setDraft(e.target.value)} disabled={full} />
        <button className="btn btn-ghost btn-small" type="submit" disabled={full}>
          Adicionar
        </button>
      </form>
      <p role="alert" className="text-[15px] font-semibold text-[var(--color-erro)]">
        {err ?? (names.length < min ? `Precisa de pelo menos ${min} pessoas.` : "")}
      </p>
    </div>
  );
}
