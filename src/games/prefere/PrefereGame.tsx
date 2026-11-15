"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Piece } from "@/brand/Piece";
import { themeLabel } from "@/content/library";
import type { PrefereChallenge } from "@/content/types";
import { useGameContent, useThemeIds } from "@/content/useGameContent";
import type { Player } from "@/engine/core";
import { createPrefere, DEFAULT_PREFERE_CONFIG, PREFERE_MIN, reducePrefere, tallyPrefere, type PrefereAction, type PrefereChoice, type PrefereConfig, type PrefereState } from "@/engine/prefere";
import { EndActions, MatchFrame, SetupShell, Unavailable, type NightLink } from "@/ui/frame";
import { PlayersEditor, toPlayers, usePlayerNames } from "@/ui/players";
import { ChipGroup, ErrorNote, PhaseStage, Podium, Progress, Stepper, Toggle, useEngine, useTone } from "@/ui/play";
import { useSound } from "@/ui/sound";

export function PrefereGame() {
  const [names, setNames] = usePlayerNames();
  const [config, setConfig] = useState<PrefereConfig>(DEFAULT_PREFERE_CONFIG);
  const content = useGameContent("voce-prefere");
  const all = useThemeIds(content.challenges, content.themes);
  const [themes, setThemes] = useState<string[]>(all);
  useEffect(() => setThemes(all), [all]);
  useEffect(() => {
    if (content.settings) setConfig((c) => ({ ...c, rounds: content.settings!.defaultRounds }));
  }, [content.settings]);
  const [match, setMatch] = useState<{ key: number; players: Player[]; pool: PrefereChallenge[] } | null>(null);
  const start = () => setMatch({ key: Date.now(), players: toPlayers(names), pool: content.challenges.filter((c) => themes.includes(c.theme)) });

  if (content.settings && !content.settings.enabled) return <Unavailable />;
  if (match) return <PrefereMatch key={match.key} config={config} players={match.players} pool={match.pool} onRematch={start} onSetup={() => setMatch(null)} />;

  return (
    <SetupShell title="Você Prefere?" subtitle="Cada um escolhe em segredo; o anfitrião registra. Depois, tudo aparece junto." canStart={names.length >= PREFERE_MIN} onStart={start} hint={`Precisa de pelo menos ${PREFERE_MIN} pessoas.`}>
      <PlayersEditor names={names} onChange={setNames} min={PREFERE_MIN} />
      <ChipGroup
        label="Temas"
        multi
        options={all.map((id) => ({ value: id, label: themeLabel(id) }))}
        value={themes}
        onToggle={(id) => setThemes((t) => (t.includes(id) ? (t.length === 1 ? t : t.filter((x) => x !== id)) : [...t, id]))}
      />
      <Stepper label="Rodadas" value={config.rounds} min={1} max={20} onChange={(rounds) => setConfig((c) => ({ ...c, rounds }))} />
      <Toggle checked={config.scoreMajority} onChange={(scoreMajority) => setConfig((c) => ({ ...c, scoreMajority }))}>
        Dar 1 ponto para quem ficar com a maioria
      </Toggle>
    </SetupShell>
  );
}

export function PrefereMatch({ config, players, pool, onRematch, onSetup, night }: { config: PrefereConfig; players: Player[]; pool: PrefereChallenge[]; onRematch: () => void; onSetup: () => void; night?: NightLink }) {
  const { state: s, dispatch, error } = useEngine<PrefereState, PrefereAction>(() => createPrefere(config, players, pool, Math.random), (st, a, rng) => reducePrefere(st, a, pool, rng));
  const { play } = useSound();
  const reduce = useReducedMotion();
  const [cursor, setCursor] = useState(0);
  useTone(s.phase === "reveal" ? "noite" : null);
  useEffect(() => setCursor(0), [s.round, s.phase]);
  const P = (id: string) => s.players.find((p) => p.id === id)!;
  const t = tallyPrefere(s.votes);

  let body: React.ReactNode;
  switch (s.phase) {
    case "question":
      body = (
        <>
          <Progress round={s.round} total={s.config.rounds} />
          <h1 className="text-center">Você prefere…</h1>
          <Dilemma a={s.dilemma.a} b={s.dilemma.b} />
          <p className="muted text-center">Pensem em silêncio. Ninguém fala a resposta ainda.</p>
          <div className="grid gap-1.5">
            <button className="btn" onClick={() => dispatch({ type: "open-vote" }) && play("start")}>
              Registrar as escolhas
            </button>
            <button className="py-2.5 text-[15px] font-semibold text-[var(--fg-2)] underline underline-offset-4" onClick={() => dispatch({ type: "swap" })}>
              Trocar o dilema
            </button>
          </div>
        </>
      );
      break;
    case "vote": {
      const current = s.players[cursor];
      const all = Object.keys(s.votes).length === s.players.length;
      const choose = (c: PrefereChoice) => {
        if (!current || !dispatch({ type: "vote", playerId: current.id, choice: c })) return;
        play("confirm");
        const next = s.players.findIndex((p, i) => i > cursor && s.votes[p.id] === undefined);
        setCursor(next >= 0 ? next : s.players.length);
      };
      body = (
        <>
          <Progress round={s.round} total={s.config.rounds} />
          {current ? (
            <>
              <div className="flex items-center gap-3.5">
                <Piece kind={current.piece} size={52} alive />
                <div>
                  <span className="muted">Escolha de</span>
                  <br />
                  <b className="font-display text-[26px] font-black">{current.name}</b>
                </div>
              </div>
              <div className="grid gap-3" role="group" aria-label={`Escolha de ${current.name}`}>
                <button className="btn btn-rosa min-h-[88px] text-left text-[19px] leading-snug" onClick={() => choose("a")}>
                  {s.dilemma.a}
                </button>
                <button className="btn min-h-[88px] text-left text-[19px] leading-snug" style={{ ["--c" as string]: "var(--color-ceu)", ["--cd" as string]: "var(--color-ceu-d)", ["--t" as string]: "var(--color-tinta)" }} onClick={() => choose("b")}>
                  {s.dilemma.b}
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3.5">
              <Piece kind="meialua" mood="wow" size={56} alive />
              <h2>Todo mundo escolheu.</h2>
            </div>
          )}
          <ul className="flex flex-wrap gap-2" aria-label="Quem já escolheu">
            {s.players.map((p, i) => (
              <li key={p.id}>
                <button onClick={() => setCursor(i)} className={`inline-flex items-center gap-1.5 rounded-full border-2 bg-[var(--card)] py-[3px] pr-3 pl-1 font-semibold ${i === cursor ? "border-[var(--color-tinta)]" : "border-[var(--line)]"}`}>
                  <Piece kind={p.piece} size={28} />
                  {p.name}
                  <span className={`font-display text-[13px] font-extrabold ${s.votes[p.id] ? "text-[var(--color-ok)]" : "text-[var(--fg-2)]"}`}>{s.votes[p.id] ? "pronto" : "…"}</span>
                </button>
              </li>
            ))}
          </ul>
          <button className={`btn ${all ? "btn-gema" : ""}`} disabled={!all} onClick={() => dispatch({ type: "reveal" }) && play("reveal")}>
            {all ? "Revelar" : `Faltam ${s.players.length - Object.keys(s.votes).length}`}
          </button>
        </>
      );
      break;
    }
    case "reveal":
      body = (
        <div className="grid gap-5">
          <PrefereSplit dilemma={s.dilemma} votes={s.votes} players={s.players} />
          <button className="btn btn-gema" onClick={() => dispatch({ type: "next" }) && play(s.round >= s.config.rounds ? "win" : "tap")}>
            {s.round >= s.config.rounds ? "Ver resumo" : "Próximo dilema"}
          </button>
        </div>
      );
      break;
    case "end":
      body = <PrefereEnd s={s} actions={<EndActions onRematch={onRematch} onSetup={onSetup} night={night} result={{ game: "voce-prefere", gameName: "Você Prefere?", scored: s.config.scoreMajority, unit: "pts", players: s.players.map((p) => ({ id: p.id, name: p.name, score: s.scores[p.id] ?? 0 })) }} />} />;
      break;
  }

  return (
    <MatchFrame onExit={onSetup}>
      <PhaseStage phaseKey={`${s.round}-${s.phase}`}>
        {body}
        <ErrorNote message={error} />
      </PhaseStage>
    </MatchFrame>
  );
}

/** Revelação: as duas opções, quantos foram para cada lado e quem. */
export function PrefereSplit({ dilemma, votes, players }: { dilemma: { a: string; b: string }; votes: Record<string, PrefereChoice>; players: Player[] }) {
  const reduce = useReducedMotion();
  const t = tallyPrefere(votes);
  const total = t.a + t.b || 1;
  const verdict = t.majority === null ? "Empate. A turma está rachada ao meio." : t.a === 0 || t.b === 0 ? "Unanimidade!" : `A maioria prefere ${t.majority === "a" ? "a primeira" : "a segunda"}.`;
  const side = (c: PrefereChoice) => players.filter((p) => votes[p.id] === c);
  return (
    <>
      <h1 className="text-center text-[clamp(26px,7vw,36px)]">{verdict}</h1>
      {(["a", "b"] as const).map((c, i) => {
            const n = c === "a" ? t.a : t.b;
            const win = t.majority === c;
            return (
              <div key={c} className="grid gap-2">
                <div className="flex items-baseline justify-between gap-3">
                  <b className="font-display text-lg leading-snug font-extrabold">{c === "a" ? dilemma.a : dilemma.b}</b>
                  <span className={`num text-3xl ${win ? "text-[var(--color-gema)]" : ""}`}>{n}</span>
                </div>
                <div className="h-4 overflow-hidden rounded-full bg-[var(--color-noite-3)]">
                  <motion.i
                    className="block h-full rounded-full"
                    style={{ background: c === "a" ? "var(--color-chiclete)" : "var(--color-ceu)" }}
                    initial={{ width: reduce ? `${(n / total) * 100}%` : 0 }}
                    animate={{ width: `${(n / total) * 100}%` }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.3 + i * 0.25 }}
                  />
                </div>
                <motion.ul className="flex flex-wrap gap-1.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0 : 1.2 + i * 0.2 }}>
                  {side(c).map((p) => (
                    <li key={p.id} className="inline-flex items-center gap-1 rounded-full bg-[var(--card)] py-0.5 pr-2.5 pl-1 text-sm font-semibold">
                      <Piece kind={p.piece} size={22} mood={win ? "happy" : "sus"} />
                      {p.name}
                    </li>
                  ))}
                </motion.ul>
              </div>
            );
          })}
    </>
  );
}

/** Resumo final: pódio de quem ficou com a maioria (ou pontos) e quem é do contra. */
export function PrefereEnd({ s, actions }: { s: Pick<PrefereState, "players" | "config" | "scores" | "withMajority">; actions: React.ReactNode }) {
  const P = (id: string) => s.players.find((p) => p.id === id)!;
      const entries = s.players.map((p) => ({ id: p.id, name: p.name, piece: p.piece, score: s.config.scoreMajority ? (s.scores[p.id] ?? 0) : (s.withMajority[p.id] ?? 0) }));
      const sorted = [...entries].sort((a, b) => b.score - a.score);
      const contra = sorted[sorted.length - 1]!;
      return (
        <>
          <h1 className="text-center">{s.config.scoreMajority ? (sorted[0]!.score === 0 ? "Ninguém pontuou" : sorted[1]?.score === sorted[0]!.score ? "Empate no topo!" : `${sorted[0]!.name} levou!`) : "Quem pensa como a turma"}</h1>
          <Podium entries={entries} unit={s.config.scoreMajority ? "pts" : "com a maioria"} />
          {sorted.length > 1 && (
            <div className="card flex items-center gap-3.5 rounded-[20px] p-4">
              <Piece kind={P(contra.id).piece} mood="sus" size={52} alive />
              <div>
                <div className="text-[13.5px] font-semibold text-[var(--fg-2)]">Do contra</div>
                <div className="font-display text-xl font-black">{contra.name}</div>
              </div>
            </div>
          )}
          {actions}
        </>
      );
}

export function Dilemma({ a, b }: { a: string; b: string }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative grid gap-3">
      <motion.div className="font-display rounded-[24px] bg-[var(--color-chiclete)] p-5 text-[clamp(22px,6vw,30px)] leading-tight font-black text-[var(--color-tinta)] shadow-[0_5px_0_var(--color-chiclete-d)]" initial={reduce ? false : { x: -40, opacity: 0, rotate: -3 }} animate={{ x: 0, opacity: 1, rotate: -1 }} transition={{ type: "spring", stiffness: 380, damping: 22 }}>
        {a}
      </motion.div>
      <span className="num absolute top-1/2 left-1/2 z-10 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[var(--color-tinta)] text-base text-white" aria-hidden="true">
        ou
      </span>
      <motion.div className="font-display rounded-[24px] bg-[var(--color-ceu)] p-5 text-[clamp(22px,6vw,30px)] leading-tight font-black text-[var(--color-tinta)] shadow-[0_5px_0_var(--color-ceu-d)]" initial={reduce ? false : { x: 40, opacity: 0, rotate: 3 }} animate={{ x: 0, opacity: 1, rotate: 1 }} transition={{ type: "spring", stiffness: 380, damping: 22, delay: 0.12 }}>
        {b}
      </motion.div>
    </div>
  );
}
