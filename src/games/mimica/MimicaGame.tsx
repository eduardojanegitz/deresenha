"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState, useEffect } from "react";
import { Piece } from "@/brand/Piece";
import { themeLabel } from "@/content/library";
import { useGameContent, useThemeIds } from "@/content/useGameContent";
import type { Difficulty, MimicaChallenge } from "@/content/types";
import type { Player } from "@/engine/core";
import { createMimica, currentActor, currentTeam, DEFAULT_MIMICA_CONFIG, reduceMimica, totalTurns, type MimicaAction, type MimicaConfig, type MimicaState } from "@/engine/mimica";
import { EndActions, MatchFrame, SetupShell, Unavailable } from "@/ui/frame";
import { PlayersEditor, toPlayers, usePlayerNames } from "@/ui/players";
import { ChipGroup, ErrorNote, PassPhone, PhaseStage, Podium, Progress, Scoreboard, Stepper, Timer, useEngine, useTone } from "@/ui/play";
import { useSound } from "@/ui/sound";

const DIFF: { value: Difficulty; label: string }[] = [
  { value: "facil", label: "Fácil" },
  { value: "medio", label: "Médio" },
  { value: "dificil", label: "Difícil" },
];
const TEAM_PIECE = ["bolota", "tijolo", "meialua", "pino"] as const;

export function MimicaGame() {
  const [names, setNames] = usePlayerNames();
  const [config, setConfig] = useState<MimicaConfig>(DEFAULT_MIMICA_CONFIG);
  const content = useGameContent("mimica");
  const all = useThemeIds(content.challenges, content.themes);
  const [themes, setThemes] = useState<string[]>(all);
  useEffect(() => setThemes(all), [all]);
  useEffect(() => {
    if (content.settings) setConfig((c) => ({ ...c, turnsPerTeam: Math.min(10, content.settings!.defaultRounds) }));
  }, [content.settings]);
  const [match, setMatch] = useState<{ key: number; players: Player[]; pool: MimicaChallenge[] } | null>(null);
  const set = (p: Partial<MimicaConfig>) => setConfig((c) => ({ ...c, ...p }));
  const min = config.teams === "individual" ? 2 : config.teams * 2;
  const start = () => setMatch({ key: Date.now(), players: toPlayers(names), pool: content.challenges.filter((c) => themes.includes(c.theme)) });

  if (content.settings && !content.settings.enabled) return <Unavailable />;
  if (match) return <MimicaMatch key={match.key} config={config} players={match.players} pool={match.pool} onRematch={start} onSetup={() => setMatch(null)} />;

  return (
    <SetupShell title="Mímica" subtitle="Quem representa olha a palavra. O resto do time adivinha." canStart={names.length >= min} onStart={start} hint={`Precisa de pelo menos ${min} pessoas.`}>
      <PlayersEditor names={names} onChange={setNames} min={min} />
      <ChipGroup
        label="Como jogar"
        options={[
          { value: "individual", label: "Cada um por si" },
          { value: "2", label: "2 times" },
          { value: "3", label: "3 times" },
          { value: "4", label: "4 times" },
        ]}
        value={[String(config.teams)]}
        onToggle={(v) => set({ teams: v === "individual" ? "individual" : (Number(v) as 2 | 3 | 4) })}
      />
      <ChipGroup
        label="Dificuldade"
        multi
        options={DIFF}
        value={config.difficulties}
        onToggle={(d) => {
          const cur = config.difficulties;
          if (cur.includes(d) && cur.length === 1) return;
          set({ difficulties: cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d] });
        }}
      />
      <ChipGroup
        label="Temas"
        multi
        options={all.map((id) => ({ value: id, label: themeLabel(id) }))}
        value={themes}
        onToggle={(id) => setThemes((t) => (t.includes(id) ? (t.length === 1 ? t : t.filter((x) => x !== id)) : [...t, id]))}
      />
      <ChipGroup label="Tempo por vez" options={[45, 60, 90].map((v) => ({ value: v, label: `${v} s` }))} value={[config.turnSec]} onToggle={(turnSec) => set({ turnSec })} />
      <Stepper label={config.teams === "individual" ? "Vezes por pessoa" : "Vezes por time"} value={config.turnsPerTeam} min={1} max={10} onChange={(turnsPerTeam) => set({ turnsPerTeam })} />
      <ChipGroup label="Pulos por vez" options={[{ value: 1, label: "1" }, { value: 3, label: "3" }, { value: -1, label: "Sem limite" }]} value={[config.skipsPerTurn]} onToggle={(skipsPerTurn) => set({ skipsPerTurn })} />
    </SetupShell>
  );
}

function MimicaMatch({ config, players, pool, onRematch, onSetup }: { config: MimicaConfig; players: Player[]; pool: MimicaChallenge[]; onRematch: () => void; onSetup: () => void }) {
  const { state: s, dispatch, error } = useEngine<MimicaState, MimicaAction>(() => createMimica(config, players, pool, Math.random), (st, a, rng) => reduceMimica(st, a, pool, rng));
  const [peek, setPeek] = useState(false);
  const { play } = useSound();
  const reduce = useReducedMotion();
  useTone(s.phase === "acting" ? "noite" : null);
  const team = s.phase !== "end" ? currentTeam(s) : null;
  const actor = s.phase !== "end" ? currentActor(s) : null;
  const teamIdx = team ? s.teams.indexOf(team) : 0;
  const individual = s.config.teams === "individual";
  const total = totalTurns(s);
  const P = (id: string) => s.players.find((p) => p.id === id) as Player;

  let body: React.ReactNode = null;
  if (s.phase === "ready" && actor && team) {
    body = !peek ? (
      <>
        <Progress round={s.turn + 1} total={total} label="Vez" />
        {!individual && (
          <div className="card grid gap-1 rounded-[22px] p-4">
            <span className="text-sm font-bold text-[var(--fg-2)]">Vez do</span>
            <b className="font-display text-2xl font-black">{team.name}</b>
            <span className="muted text-[15px]">Adivinham: {team.playerIds.filter((id) => id !== actor.id).map((id) => P(id).name).join(", ")}</span>
          </div>
        )}
        <PassPhone player={actor} note={individual ? "Todo mundo adivinha. Cada acerto vale um ponto para quem representou." : "Só quem representa olha a palavra."} cta={`Sou ${actor.name}`} onReady={() => setPeek(true)} />
      </>
    ) : (
      <div className="grid justify-items-center gap-5 pt-4 text-center">
        <h1 className="text-[clamp(28px,7vw,38px)]">Pronto, {actor.name}?</h1>
        <p className="muted max-w-[32ch]">Quando tocar em começar, a primeira palavra aparece e o tempo corre. Vire a tela para você e represente sem falar.</p>
        <div className="w-full max-w-[420px]">
          <button
            className="btn btn-gema"
            onClick={() => {
              setPeek(false);
              if (dispatch({ type: "start-turn" })) play("start");
            }}
          >
            Começar a vez
          </button>
        </div>
      </div>
    );
  } else if (s.phase === "acting" && s.word && actor) {
    const hits = s.turnLog.filter((l) => l.result === "hit").length;
    body = (
      <div className="grid gap-5">
        <div className="flex items-center justify-between">
          <span className="font-display text-lg font-extrabold">{individual ? actor.name : team?.name}</span>
          <span className="num text-2xl text-[var(--color-gema)]" aria-label={`${hits} acertos nesta vez`}>
            {hits} ✓
          </span>
        </div>
        <Timer seconds={s.config.turnSec} onDone={() => dispatch({ type: "time-up" })} size={120} />
        <div className="grid min-h-[200px] place-items-center rounded-[28px] bg-[var(--color-noite-2)] px-5 py-8 text-center" aria-live="polite">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p
              key={s.word.id}
              className="font-display text-[clamp(38px,11vw,64px)] leading-[1.05] font-black text-balance text-white"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40, rotate: -4 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -40, rotate: 4 }}
              transition={{ type: "spring", stiffness: 420, damping: 26 }}
            >
              {s.word.text}
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="grid grid-cols-[1fr_1.4fr] gap-3">
          <button className="btn btn-ghost min-h-[72px]" disabled={s.skipsLeft === 0} onClick={() => dispatch({ type: "skip" }) && play("tap")}>
            Pular{s.skipsLeft > 0 ? ` (${s.skipsLeft})` : s.skipsLeft === 0 ? " (0)" : ""}
          </button>
          <button className="btn btn-menta min-h-[72px] text-[22px]" onClick={() => dispatch({ type: "hit" }) && play("hit")}>
            Acertou!
          </button>
        </div>
      </div>
    );
  } else if (s.phase === "turn-end" && actor) {
    const hits = s.turnLog.filter((l) => l.result === "hit");
    body = (
      <>
        <Progress round={s.turn + 1} total={total} label="Vez" />
        <div className="grid justify-items-center gap-3 text-center">
          <Piece kind={individual ? actor.piece : TEAM_PIECE[teamIdx]!} mood={hits.length ? "happy" : "sad"} size={88} alive className={hits.length ? "hop" : ""} />
          <h1>Tempo!</h1>
          <p className="font-display text-[22px] font-extrabold">
            {hits.length === 0 ? "Nenhum acerto desta vez." : hits.length === 1 ? "1 acerto." : `${hits.length} acertos.`}
          </p>
        </div>
        {s.turnLog.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {s.turnLog.map((l, i) => (
              <li key={i} className={`rounded-full px-3 py-1.5 text-[15px] font-semibold ${l.result === "hit" ? "bg-[var(--color-menta-t)] text-[var(--color-tinta)]" : "bg-[var(--color-sup-2)] text-[var(--color-tinta-2)] line-through"}`}>
                {l.word}
              </li>
            ))}
          </ul>
        )}
        <Scoreboard players={s.teams.map((t, i) => ({ id: t.id, name: t.name, piece: individual ? P(t.playerIds[0]!).piece : TEAM_PIECE[i]! }))} scores={s.teamScores} />
        <button className="btn" onClick={() => dispatch({ type: "next-turn" }) && play(s.turn + 1 >= total ? "win" : "tap")}>
          {s.turn + 1 >= total ? "Ver resultado" : "Próxima vez"}
        </button>
      </>
    );
  } else if (s.phase === "end") {
    const entries = s.teams.map((t, i) => ({ id: t.id, name: t.name, piece: individual ? P(t.playerIds[0]!).piece : TEAM_PIECE[i]!, score: s.teamScores[t.id] ?? 0 }));
    const sorted = [...entries].sort((a, b) => b.score - a.score);
    const top = sorted[0]!;
    body = (
      <>
        <h1 className="text-center">{top.score === 0 ? "Ninguém acertou. Revanche?" : sorted[1]?.score === top.score ? "Empate!" : `${top.name} venceu!`}</h1>
        <Podium entries={entries} unit={entries.some((e) => e.score !== 1) ? "acertos" : "acerto"} />
        <EndActions onRematch={onRematch} onSetup={onSetup} />
      </>
    );
  }

  return (
    <MatchFrame onExit={onSetup}>
      <PhaseStage phaseKey={`${s.turn}-${s.phase}-${peek}`}>
        {body}
        <ErrorNote message={error} />
      </PhaseStage>
    </MatchFrame>
  );
}


