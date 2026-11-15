"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { Piece } from "@/brand/Piece";
import { useGameContent } from "@/content/useGameContent";
import { addChampionship } from "@/engine/championship";
import type { Player } from "@/engine/core";
import { DEFAULT_INFILTRADO_CONFIG, INFILTRADO_MIN } from "@/engine/infiltrado";
import { DEFAULT_MIMICA_CONFIG } from "@/engine/mimica";
import { DEFAULT_NOTA_CONFIG } from "@/engine/nota";
import { DEFAULT_PREFERE_CONFIG } from "@/engine/prefere";
import { DEFAULT_RANKING_CONFIG } from "@/engine/ranking";
import { InfiltradoMatch } from "@/games/infiltrado/InfiltradoGame";
import { MimicaMatch } from "@/games/mimica/MimicaGame";
import { NotaMatch } from "@/games/nota/NotaGame";
import { PrefereMatch } from "@/games/prefere/PrefereGame";
import { RankingMatch } from "@/games/ranking/RankingGame";
import { SetupShell } from "@/ui/frame";
import { PlayersEditor, toPlayers, usePlayerNames } from "@/ui/players";
import { Podium, Scoreboard, Stepper, Toggle, useTone } from "@/ui/play";
import { useSound } from "@/ui/sound";

/**
 * Noite de Jogos: a turma escolhe uma sequência de minigames e disputa um campeonato.
 * Cada jogo vira 0–100 pontos relativos ao melhor da partida (pontuação normalizada),
 * para que jogos com números grandes não pesem mais que os outros.
 */
type Stage = "nota" | "mimica" | "infiltrado" | "voce-prefere" | "ranking";
const STAGES: { id: Stage; name: string; piece: Player["piece"]; min: number; scored: boolean; note: string }[] = [
  { id: "nota", name: "Nota Secreta", piece: "tijolo", min: 3, scored: true, note: "Cada um pensa uma vez por rodada." },
  { id: "mimica", name: "Mímica", piece: "capsula", min: 2, scored: true, note: "Cada um por si." },
  { id: "infiltrado", name: "Infiltrado", piece: "pino", min: INFILTRADO_MIN, scored: true, note: "A partir de 4 pessoas." },
  { id: "voce-prefere", name: "Você Prefere?", piece: "bolota", min: 2, scored: true, note: "Ficar com a maioria pontua." },
  { id: "ranking", name: "Ranking às Cegas", piece: "meialua", min: 1, scored: false, note: "Só para rir: não conta pontos." },
];
const stageOf = (id: Stage) => STAGES.find((s) => s.id === id)!;

interface Played {
  stage: Stage;
  raw: Record<string, number>;
}

export function NightGame() {
  const [names, setNames] = usePlayerNames();
  const [title, setTitle] = useState("Noite de Jogos");
  const [picked, setPicked] = useState<Stage[]>(["nota", "voce-prefere", "mimica"]);
  const [rounds, setRounds] = useState(2);
  const [ranked, setRanked] = useState(true);
  const [run, setRun] = useState<{ players: Player[]; seq: Stage[]; index: number; playing: boolean; total: Record<string, number>; played: Played[]; key: number } | null>(null);

  const nota = useGameContent("nota");
  const mimica = useGameContent("mimica");
  const infiltrado = useGameContent("infiltrado");
  const prefere = useGameContent("voce-prefere");
  const ranking = useGameContent("ranking");

  const toggle = (id: Stage) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const invalid = picked.find((id) => names.length < stageOf(id).min);
  const canStart = picked.length >= 2 && names.length >= 2 && !invalid;

  const start = () => {
    const players = toPlayers(names);
    setRun({ players, seq: picked, index: 0, playing: false, total: Object.fromEntries(players.map((p) => [p.id, 0])), played: [], key: Date.now() });
  };

  if (!run) {
    return (
      <SetupShell
        title="Noite de Jogos"
        subtitle="Escolham os jogos e disputem um campeonato. Cada jogo vale até 100 pontos para o melhor da partida."
        canStart={canStart}
        onStart={start}
        startLabel="Começar a noite"
        hint={picked.length < 2 ? "Escolha pelo menos 2 jogos." : invalid ? `${stageOf(invalid).name} precisa de pelo menos ${stageOf(invalid).min} pessoas.` : "Coloque pelo menos 2 pessoas."}
      >
        <label className="grid gap-2">
          <span className="label">Nome da noite</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value.slice(0, 40))} maxLength={40} />
        </label>
        <PlayersEditor names={names} onChange={setNames} min={2} />
        <div className="grid gap-2.5">
          <span className="label" id="seq">
            Jogos, na ordem em que você tocar
          </span>
          <ul className="grid gap-2" aria-labelledby="seq">
            {STAGES.map((st) => {
              const pos = picked.indexOf(st.id);
              return (
                <li key={st.id}>
                  <button
                    onClick={() => toggle(st.id)}
                    aria-pressed={pos >= 0}
                    className={`card flex w-full items-center gap-3 rounded-[18px] px-3 py-2.5 text-left ${pos >= 0 ? "ring-[3px] ring-[var(--color-tinta)]" : ""}`}
                  >
                    <span className={`num grid size-8 place-items-center rounded-xl text-base ${pos >= 0 ? "bg-[var(--color-tinta)] text-white" : "bg-[var(--color-sup-2)] text-[var(--fg-2)]"}`}>{pos >= 0 ? pos + 1 : ""}</span>
                    <Piece kind={st.piece} size={36} />
                    <span className="flex-1">
                      <b>{st.name}</b>
                      <span className="block text-[13px] text-[var(--fg-2)]">{st.note}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <Stepper label="Rodadas por jogo" value={rounds} min={1} max={6} onChange={setRounds} />
        <Toggle checked={ranked} onChange={setRanked}>
          Com classificação geral (desligado, a noite é só pela diversão)
        </Toggle>
      </SetupShell>
    );
  }

  const stage = run.seq[run.index];
  const last = run.index === run.seq.length - 1;
  const exit = () => setRun(null);
  const finishGame = (raw: Record<string, number>) => {
    setRun((r) => {
      if (!r) return r;
      const st = r.seq[r.index]!;
      const total = ranked && stageOf(st).scored ? addChampionship(r.total, raw) : r.total;
      return { ...r, total, played: [...r.played, { stage: st, raw }], index: r.index + 1, playing: false };
    });
  };

  if (!stage) return <NightFinal title={title} run={run} ranked={ranked} onNew={exit} />;

  if (!run.playing) return <Interlude title={title} run={run} ranked={ranked} onStart={() => setRun({ ...run, playing: true, key: Date.now() })} onExit={exit} />;

  const night = { name: title, onContinue: finishGame, last };
  const k = `${run.key}-${run.index}`;
  const common = { players: run.players, onRematch: () => {}, onSetup: exit, night };
  const by = <C extends { theme: string }>(list: C[]) => list; // todos os temas publicados (e os da turma)
  switch (stage) {
    case "nota":
      return <NotaMatch key={k} {...common} config={{ ...DEFAULT_NOTA_CONFIG, mode: "secreta", rounds: Math.min(rounds, run.players.length) }} pool={by(nota.challenges).filter((c) => c.kind === "secreta")} />;
    case "mimica":
      return <MimicaMatch key={k} {...common} config={{ ...DEFAULT_MIMICA_CONFIG, teams: "individual", turnsPerTeam: rounds }} pool={by(mimica.challenges)} />;
    case "infiltrado":
      return <InfiltradoMatch key={k} {...common} config={{ ...DEFAULT_INFILTRADO_CONFIG, rounds }} pool={by(infiltrado.challenges)} />;
    case "voce-prefere":
      return <PrefereMatch key={k} {...common} config={{ ...DEFAULT_PREFERE_CONFIG, rounds: rounds * 2, scoreMajority: true }} pool={by(prefere.challenges)} />;
    case "ranking":
      return <RankingMatch key={k} {...common} config={{ ...DEFAULT_RANKING_CONFIG, rounds: Math.min(rounds, run.players.length) }} pool={by(ranking.challenges)} />;
  }
}

type Run = { players: Player[]; seq: Stage[]; index: number; total: Record<string, number>; played: Played[] };

function Interlude({ title, run, ranked, onStart, onExit }: { title: string; run: Run; ranked: boolean; onStart: () => void; onExit: () => void }) {
  const st = stageOf(run.seq[run.index]!);
  const reduce = useReducedMotion();
  const { play } = useSound();
  return (
    <div className="mx-auto grid max-w-[560px] gap-6 px-4 pt-4 pb-16">
      <div className="grid justify-items-center gap-3 text-center">
        <span className="muted">
          {title}: jogo {run.index + 1} de {run.seq.length}
        </span>
        <motion.div initial={reduce ? false : { y: -40, opacity: 0, rotate: -8 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 380, damping: 16 }}>
          <Piece kind={st.piece} mood="happy" size={110} alive />
        </motion.div>
        <h1>{st.name}</h1>
        <p className="muted">{st.note}</p>
      </div>
      <ol className="flex flex-wrap justify-center gap-2" aria-label="Sequência da noite">
        {run.seq.map((s, i) => (
          <li key={i} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${i < run.index ? "bg-[var(--color-menta-t)] line-through" : i === run.index ? "bg-[var(--color-tinta)] text-white" : "bg-[var(--color-sup-2)] text-[var(--fg-2)]"}`}>
            {stageOf(s).name}
          </li>
        ))}
      </ol>
      {ranked && run.index > 0 && (
        <section className="grid gap-2.5">
          <h2>Classificação da noite</h2>
          <Scoreboard players={run.players} scores={run.total} />
        </section>
      )}
      <button
        className="btn btn-gema"
        onClick={() => {
          play("start");
          onStart();
        }}
      >
        Começar {st.name}
      </button>
      <button className="text-[15px] font-semibold text-[var(--fg-2)] underline underline-offset-4" onClick={onExit}>
        Encerrar a noite
      </button>
    </div>
  );
}

function NightFinal({ title, run, ranked, onNew }: { title: string; run: Run; ranked: boolean; onNew: () => void }) {
  useTone("noite");
  const entries = useMemo(() => run.players.map((p) => ({ id: p.id, name: p.name, piece: p.piece, score: run.total[p.id] ?? 0 })), [run]);
  const sorted = [...entries].sort((a, b) => b.score - a.score);
  const champ = sorted[0]!;
  const tie = sorted[1] && sorted[1].score === champ.score;
  return (
    <div className="mx-auto grid max-w-[560px] gap-6 px-4 pt-4 pb-16">
      <div className="text-center">
        <span className="muted">{title}</span>
        <h1 className="mt-1">{!ranked ? "Fim da noite!" : champ.score === 0 ? "Ninguém pontuou" : tie ? "Empate no topo!" : `${champ.name} é campeão da noite!`}</h1>
      </div>
      {ranked && <Podium entries={entries} />}
      {ranked && (
        <section className="grid gap-2.5">
          <h2>Por jogo</h2>
          <div className="card overflow-x-auto p-1">
            <table className="w-full min-w-[420px] border-collapse text-[15px]">
              <thead>
                <tr className="text-left text-[13px] text-[var(--fg-2)]">
                  <th className="px-3 py-2 font-semibold">Quem</th>
                  {run.played.map((g, i) => (
                    <th key={i} className="px-3 py-2 text-right font-semibold">
                      {stageOf(g.stage).name}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => (
                  <tr key={p.id} className="border-t border-[var(--line)]">
                    <td className="px-3 py-2 font-semibold">{p.name}</td>
                    {run.played.map((g, i) => (
                      <td key={i} className="num px-3 py-2 text-right">
                        {stageOf(g.stage).scored ? (g.raw[p.id] ?? 0) : "–"}
                      </td>
                    ))}
                    <td className="num px-3 py-2 text-right text-lg text-[var(--color-gema)]">{p.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted text-[13px]">Os números por jogo são os pontos de cada partida. O total soma até 100 por jogo para quem foi melhor naquela partida.</p>
        </section>
      )}
      <button className="btn btn-gema" onClick={onNew}>
        Nova noite
      </button>
      <Link href="/historico" className="btn btn-ghost">
        Ver histórico
      </Link>
    </div>
  );
}
