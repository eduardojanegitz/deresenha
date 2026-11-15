"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { ChallengeRow } from "@/server/admin/repo";
import { saveChallengeAction, type FormState } from "../../actions";

const GAMES = [
  ["nota", "Jogo da Nota"],
  ["mimica", "Mímica"],
  ["infiltrado", "Infiltrado"],
  ["ranking", "Ranking às Cegas"],
  ["voce-prefere", "Você Prefere?"],
  ["quem-sou-eu", "Quem Sou Eu?"],
  ["quiz", "Quiz Relâmpago"],
] as const;

/** Alternativas do quiz com a correta primeiro, como o formulário espera. */
function quizLines(d: Record<string, unknown>) {
  const opts = Array.isArray(d.options) ? (d.options as string[]) : [];
  const a = Number(d.answer ?? 0);
  return [opts[a], ...opts.filter((_, i) => i !== a)].filter(Boolean).join("\n");
}

type Game = (typeof GAMES)[number][0];

export function ChallengeForm({ initial, themes, defaultGame }: { initial: ChallengeRow | null; themes: { id: string; label: string; active: boolean }[]; defaultGame?: Game }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveChallengeAction, undefined);
  const [game, setGame] = useState<Game>(initial?.game ?? defaultGame ?? "nota");
  const d = initial?.data ?? {};
  const field = "grid gap-2";
  return (
    <form action={action} className="card grid gap-5 p-5">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div className="grid gap-4 md:grid-cols-2">
        <label className={field}>
          <span className="label">Jogo</span>
          <select name="game" className="input" value={game} onChange={(e) => setGame(e.target.value as Game)}>
            {GAMES.map(([id, l]) => (
              <option key={id} value={id}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className={field}>
          <span className="label">Tema</span>
          <select name="theme" className="input" defaultValue={initial?.theme ?? ""} required>
            <option value="" disabled>
              Escolha um tema
            </option>
            {themes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
                {t.active ? "" : " (inativo)"}
              </option>
            ))}
          </select>
        </label>
      </div>

      {game === "nota" && (
        <>
          <fieldset className="grid gap-2">
            <legend className="label mb-2">Modo</legend>
            <div className="flex flex-wrap gap-4 text-[15px]">
              <label className="flex items-center gap-2">
                <input type="radio" name="kind" value="secreta" defaultChecked={d.kind !== "avaliacao"} /> Nota Secreta (uma categoria para dar exemplos)
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="kind" value="avaliacao" defaultChecked={d.kind === "avaliacao"} /> Avaliação (uma situação para dar nota)
              </label>
            </div>
          </fieldset>
          <label className={field}>
            <span className="label">Texto</span>
            <input name="text" className="input" defaultValue={String(d.text ?? "")} maxLength={140} placeholder="Lugares para um primeiro encontro" required />
          </label>
        </>
      )}
      {game === "mimica" && (
        <label className={field}>
          <span className="label">Palavra ou situação</span>
          <input name="text" className="input" defaultValue={String(d.text ?? "")} maxLength={60} placeholder="Pegar ônibus lotado" required />
        </label>
      )}
      {game === "infiltrado" && (
        <div className="grid gap-4 md:grid-cols-2">
          <label className={field}>
            <span className="label">Palavra da maioria</span>
            <input name="major" className="input" defaultValue={String(d.major ?? "")} maxLength={40} placeholder="Praia" required />
          </label>
          <label className={field}>
            <span className="label">Palavra do infiltrado</span>
            <input name="impostor" className="input" defaultValue={String(d.impostor ?? "")} maxLength={40} placeholder="Piscina" required />
            <span className="muted text-[13px]">Parecida, mas diferente. Próxima demais fica impossível; distante demais, óbvia.</span>
          </label>
        </div>
      )}
      {game === "ranking" && (
        <>
          <label className={field}>
            <span className="label">Título</span>
            <input name="title" className="input" defaultValue={String(d.title ?? "")} maxLength={80} placeholder="Melhores lugares para viajar" required />
          </label>
          <label className={field}>
            <span className="label">Itens, um por linha (5 a 20)</span>
            <textarea name="items" className="input h-auto min-h-48 py-3" defaultValue={Array.isArray(d.items) ? (d.items as string[]).join("\n") : ""} rows={8} required />
            <span className="muted text-[13px]">A cada rodada sorteamos 5 itens desta lista.</span>
          </label>
        </>
      )}

      {game === "voce-prefere" && (
        <div className="grid gap-4 md:grid-cols-2">
          <label className={field}>
            <span className="label">Opção A</span>
            <input name="a" className="input" defaultValue={String(d.a ?? "")} maxLength={100} placeholder="Falar com animais" required />
          </label>
          <label className={field}>
            <span className="label">Opção B</span>
            <input name="b" className="input" defaultValue={String(d.b ?? "")} maxLength={100} placeholder="Falar todos os idiomas" required />
          </label>
        </div>
      )}

      {game === "quem-sou-eu" && (
        <label className={field}>
          <span className="label">Identidade secreta</span>
          <input name="name" className="input" defaultValue={String(d.name ?? "")} maxLength={40} placeholder="Bicho-preguiça" required />
          <span className="muted text-[13px]">Algo que a turma conheça e dê para descobrir com perguntas de sim ou não.</span>
        </label>
      )}

      {game === "quiz" && (
        <>
          <label className={field}>
            <span className="label">Pergunta</span>
            <input name="question" className="input" defaultValue={String(d.question ?? "")} maxLength={160} placeholder="Qual é o maior planeta do Sistema Solar?" required />
          </label>
          <label className={field}>
            <span className="label">Alternativas, uma por linha (2 a 4)</span>
            <textarea name="options" className="input h-auto min-h-36 py-3" defaultValue={quizLines(d)} rows={4} required />
            <span className="muted text-[13px]">Escreva a correta na primeira linha. No jogo, a ordem é embaralhada.</span>
          </label>
        </>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <label className={field}>
          <span className="label">Dificuldade</span>
          <select name="difficulty" className="input" defaultValue={initial?.difficulty ?? "medio"}>
            <option value="facil">Fácil</option>
            <option value="medio">Médio</option>
            <option value="dificil">Difícil</option>
          </select>
        </label>
        <label className={field}>
          <span className="label">Idade mínima (opcional)</span>
          <input name="minAge" type="number" min={0} max={21} className="input" defaultValue={initial?.min_age ?? ""} placeholder="Livre" />
        </label>
        <label className={field}>
          <span className="label">Situação</span>
          <select name="status" className="input" defaultValue={initial?.status ?? "published"}>
            <option value="published">Publicado (aparece nos jogos)</option>
            <option value="draft">Rascunho</option>
            <option value="archived">Arquivado</option>
          </select>
        </label>
      </div>

      <p role="alert" className="text-[15px] font-semibold text-[var(--color-erro)]">
        {state?.error}
      </p>
      <div className="flex flex-wrap gap-3">
        <button className="btn btn-gema w-auto px-8" disabled={pending}>
          {pending ? "Salvando…" : initial ? "Salvar alterações" : "Criar desafio"}
        </button>
        <Link href="/admin/desafios" className="btn btn-ghost w-auto">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
