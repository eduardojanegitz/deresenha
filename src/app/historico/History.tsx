"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Piece } from "@/brand/Piece";
import { clearHistory, computeStats, loadHistory, winnersOf, type MatchRecord } from "@/history/history";
import { Sheet } from "@/ui/play";

const GAME_NAME: Record<string, string> = { nota: "Jogo da Nota", mimica: "Mímica", infiltrado: "Infiltrado", ranking: "Ranking às Cegas", "voce-prefere": "Você Prefere?", "quem-sou-eu": "Quem Sou Eu?", quiz: "Quiz Relâmpago" };
const gameName = (g: string) => GAME_NAME[g] ?? g;

export function History() {
  const [list, setList] = useState<MatchRecord[] | null>(null);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => setList(loadHistory()), []);
  if (list === null) return null;
  const stats = computeStats(list);

  return (
    <div className="mx-auto max-w-[720px] px-4 pt-2 pb-16">
      <h1>Histórico</h1>
      <p className="muted mt-2 max-w-[52ch]">As partidas jogadas neste aparelho. Nada sai daqui: não há conta nem servidor guardando isso.</p>

      {list.length === 0 ? (
        <div className="grid justify-items-center gap-3 py-12 text-center">
          <Piece kind="tijolo" mood="sleep" size={84} />
          <p className="muted max-w-[34ch]">Nenhuma partida ainda. Quando a turma terminar um jogo, ele aparece aqui.</p>
          <Link href="/jogos" className="btn w-auto px-8">
            Escolher um jogo
          </Link>
        </div>
      ) : (
        <>
          <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3" aria-label="Estatísticas">
            <Stat label="Partidas" value={String(stats.matches)} />
            <Stat label="Jogo favorito" value={stats.favoriteGame ? gameName(stats.favoriteGame.game) : "–"} sub={stats.favoriteGame ? `${stats.favoriteGame.count} partidas` : undefined} />
            <Stat label="Quem mais venceu" value={stats.topWinner?.name ?? "–"} sub={stats.topWinner ? `${stats.topWinner.wins} ${stats.topWinner.wins === 1 ? "vitória" : "vitórias"}` : "Ainda sem vencedor"} wide />
          </section>

          {stats.regulars.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3">Presença</h2>
              <ul className="flex flex-wrap gap-2">
                {stats.regulars.map((r) => (
                  <li key={r.name} className="card rounded-full px-3 py-1.5 text-[15px]">
                    <b>{r.name}</b> <span className="muted">{r.matches}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-8">
            <h2 className="mb-3">Partidas</h2>
            <ol className="grid gap-2.5">
              {list.map((r) => {
                const w = winnersOf(r);
                return (
                  <li key={r.id} className="card grid gap-1 rounded-[20px] p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <b className="font-display text-lg font-extrabold">{gameName(r.game)}</b>
                      <span className="text-[13px] text-[var(--fg-2)]">{new Date(r.at).toLocaleString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    {r.night && <span className="text-[13px] font-semibold text-[var(--fg-2)]">{r.night}</span>}
                    <p className="text-[15px]">
                      {w.length ? (
                        <>
                          Venceu: <b>{w.join(" e ")}</b>.{" "}
                        </>
                      ) : null}
                      <span className="muted">
                        {r.scored
                          ? [...r.players]
                              .sort((a, b) => b.score - a.score)
                              .map((p) => `${p.name} ${p.score}`)
                              .join(", ")
                          : r.players.map((p) => p.name).join(", ")}
                      </span>
                    </p>
                  </li>
                );
              })}
            </ol>
          </section>

          <div className="mt-8 text-center">
            <button className="text-[15px] font-semibold text-[var(--fg-2)] underline underline-offset-4" onClick={() => setConfirm(true)}>
              Apagar histórico
            </button>
          </div>
        </>
      )}

      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Apagar o histórico?" piece={<Piece kind="meialua" mood="sad" size={44} />}>
        <p className="text-[var(--color-tinta-2)]">Todas as partidas guardadas neste aparelho somem. Não dá para desfazer.</p>
        <div className="grid gap-2.5">
          <button
            className="btn btn-rosa"
            onClick={() => {
              clearHistory();
              setList([]);
              setConfirm(false);
            }}
          >
            Apagar tudo
          </button>
          <button className="btn btn-ghost" onClick={() => setConfirm(false)}>
            Manter
          </button>
        </div>
      </Sheet>
    </div>
  );
}

function Stat({ label, value, sub, wide = false }: { label: string; value: string; sub?: string; wide?: boolean }) {
  return (
    <div className={`card grid gap-1 rounded-[20px] p-4 ${wide ? "col-span-2 md:col-span-1" : ""}`}>
      <span className="text-[13px] font-semibold text-[var(--fg-2)]">{label}</span>
      <span className="font-display text-2xl leading-tight font-black">{value}</span>
      {sub && <span className="text-[13px] text-[var(--fg-2)]">{sub}</span>}
    </div>
  );
}
