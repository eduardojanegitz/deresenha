"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Piece } from "@/brand/Piece";
import { themeLabel } from "@/content/library";
import type { QuemChallenge } from "@/content/types";
import { useGameContent, useThemeIds } from "@/content/useGameContent";
import type { Player } from "@/engine/core";
import { createQuem, DEFAULT_QUEM_CONFIG, QUEM_MIN, QUEM_QUESTION_OPTIONS, QUEM_SECONDS_OPTIONS, quemPoints, reduceQuem, type QuemAction, type QuemConfig, type QuemState } from "@/engine/quem";
import { EndActions, MatchFrame, SetupShell, Unavailable, type NightLink } from "@/ui/frame";
import { PlayersEditor, toPlayers, usePlayerNames } from "@/ui/players";
import { ChipGroup, ErrorNote, PhaseStage, Podium, Progress, Scoreboard, Stepper, Timer, useEngine, useTone } from "@/ui/play";
import { useSound } from "@/ui/sound";

export function QuemGame() {
  const [names, setNames] = usePlayerNames();
  const [config, setConfig] = useState<QuemConfig>(DEFAULT_QUEM_CONFIG);
  const content = useGameContent("quem-sou-eu");
  const all = useThemeIds(content.challenges, content.themes);
  const [themes, setThemes] = useState<string[]>(all);
  useEffect(() => setThemes(all), [all]);
  useEffect(() => {
    if (content.settings) setConfig((c) => ({ ...c, rounds: Math.min(5, Math.max(1, content.settings!.defaultRounds)) }));
  }, [content.settings]);
  const [match, setMatch] = useState<{ key: number; players: Player[]; pool: QuemChallenge[] } | null>(null);
  const start = () => setMatch({ key: Date.now(), players: toPlayers(names), pool: content.challenges.filter((c) => themes.includes(c.theme)) });

  if (content.settings && !content.settings.enabled) return <Unavailable />;
  if (match) return <QuemMatch key={match.key} config={config} players={match.players} pool={match.pool} onRematch={start} onSetup={() => setMatch(null)} />;

  return (
    <SetupShell title="Quem Sou Eu?" subtitle="O celular vai na testa de quem adivinha. A turma vê quem é; a pessoa, não." canStart={names.length >= QUEM_MIN} onStart={start} hint={`Precisa de pelo menos ${QUEM_MIN} pessoas.`}>
      <PlayersEditor names={names} onChange={setNames} min={QUEM_MIN} />
      <ChipGroup
        label="Temas"
        multi
        options={all.map((id) => ({ value: id, label: themeLabel(id) }))}
        value={themes}
        onToggle={(id) => setThemes((t) => (t.includes(id) ? (t.length === 1 ? t : t.filter((x) => x !== id)) : [...t, id]))}
      />
      <Stepper label="Voltas (cada um adivinha uma vez por volta)" value={config.rounds} min={1} max={5} onChange={(rounds) => setConfig((c) => ({ ...c, rounds }))} />
      <ChipGroup label="Perguntas por vez" options={QUEM_QUESTION_OPTIONS.map((v) => ({ value: v, label: String(v) }))} value={[config.questions]} onToggle={(questions) => setConfig((c) => ({ ...c, questions }))} />
      <ChipGroup label="Tempo por vez" options={QUEM_SECONDS_OPTIONS.map((v) => ({ value: v, label: v ? `${v / 60 >= 1 && v % 60 === 0 ? `${v / 60} min` : `${v} s`}` : "Sem tempo" }))} value={[config.seconds]} onToggle={(seconds) => setConfig((c) => ({ ...c, seconds }))} />
    </SetupShell>
  );
}

export function QuemMatch({ config, players, pool, onRematch, onSetup, night }: { config: QuemConfig; players: Player[]; pool: QuemChallenge[]; onRematch: () => void; onSetup: () => void; night?: NightLink }) {
  const { state: s, dispatch, error } = useEngine<QuemState, QuemAction>(() => createQuem(config, players, pool, Math.random), (st, a, rng) => reduceQuem(st, a, pool, rng));
  const { play } = useSound();
  const reduce = useReducedMotion();
  const [count, setCount] = useState<number | null>(null);
  useTone(s.phase === "play" ? "noite" : null);
  const P = (id: string) => s.players.find((p) => p.id === id)!;
  const guesser = P(s.guesserId);
  const left = s.config.questions - s.asked;
  const turnLabel = `${s.turn + 1} de ${s.order.length}`;

  // Contagem antes de mostrar a identidade: dá tempo de virar o celular para a turma.
  useEffect(() => {
    if (count === null) return;
    if (count === 0) {
      setCount(null);
      if (dispatch({ type: "start" })) play("start");
      return;
    }
    play("tick");
    const id = window.setTimeout(() => setCount(count - 1), 800);
    return () => window.clearTimeout(id);
  }, [count, dispatch, play]);

  let body: React.ReactNode;
  switch (s.phase) {
    case "pass":
      body = (
        <>
          <Progress round={s.round} total={s.config.rounds} label="Volta" />
          {count === null ? (
            <div className="grid justify-items-center gap-5 pt-4 text-center">
              <Piece kind={guesser.piece} mood="wow" size={96} alive />
              <h1 className="text-[clamp(28px,7vw,40px)]">Vez de {guesser.name}</h1>
              <p className="muted max-w-[34ch]">
                {guesser.name}, segure o celular com a tela virada para a turma, na altura da testa. <b className="text-[var(--fg)]">Não olhe a tela.</b>
              </p>
              <div className="w-full max-w-[420px]">
                <button className="btn btn-gema" onClick={() => setCount(3)}>
                  Estou pronto, pode mostrar
                </button>
              </div>
              <p className="muted text-[15px]">Vez {turnLabel} nesta volta</p>
            </div>
          ) : (
            <div className="grid min-h-[50vh] place-items-center" role="status" aria-live="assertive">
              <motion.span key={count} initial={reduce ? false : { scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="num text-[120px] leading-none">
                {count}
              </motion.span>
              <span className="sr-only">Virando em {count}</span>
            </div>
          )}
        </>
      );
      break;

    case "play":
      body = (
        <div className="grid gap-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-[#A9C9BC]">Para a turma: {guesser.name} é…</span>
            <span className="num text-sm text-[#A9C9BC]">{left === 1 ? "1 pergunta" : `${left} perguntas`}</span>
          </div>
          <motion.div
            initial={reduce ? false : { rotateX: 90, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="grid min-h-[200px] place-items-center rounded-[32px] bg-[var(--color-gema)] p-6 text-center shadow-[0_7px_0_var(--color-gema-d)]"
          >
            <span className="grid gap-1">
              <span className="font-display text-[clamp(40px,13vw,72px)] leading-[1.02] font-black text-[var(--color-tinta)]">{s.identity.name}</span>
              <span className="text-[15px] font-semibold text-[var(--color-tinta-2)]">{themeLabel(s.identity.theme)}</span>
            </span>
          </motion.div>
          {s.config.seconds > 0 && <Timer seconds={s.config.seconds} size={96} onDone={() => dispatch({ type: "timeout" })} />}
          <div className="grid grid-cols-2 gap-3" role="group" aria-label="Responder a pergunta">
            <button className="btn btn-menta min-h-[72px] text-[22px]" disabled={left === 0} onClick={() => dispatch({ type: "answer", value: "sim" }) && play("tap")}>
              Sim
            </button>
            <button className="btn btn-rosa min-h-[72px] text-[22px]" disabled={left === 0} onClick={() => dispatch({ type: "answer", value: "nao" }) && play("tap")}>
              Não
            </button>
          </div>
          <p className="text-center text-[15px] text-[#A9C9BC]" role="status">
            {left === 0 ? `Acabaram as perguntas. ${guesser.name} tem um último chute.` : `Cada resposta conta uma pergunta. Acertando agora: ${quemPoints(s.asked, s.config.questions)} pontos.`}
          </p>
          <div className="grid gap-2.5">
            <button className="btn btn-gema" onClick={() => dispatch({ type: "hit" }) && play("win")}>
              Acertou!
            </button>
            <button className="btn btn-ghost" onClick={() => dispatch({ type: "miss" }) && play("miss")}>
              Errou o chute ou desistiu
            </button>
            {s.asked === 0 && (
              <button className="py-2 text-[15px] font-semibold text-[#A9C9BC] underline underline-offset-4" onClick={() => dispatch({ type: "swap" })}>
                Ninguém conhece? Trocar
              </button>
            )}
          </div>
        </div>
      );
      break;

    case "result": {
      const hit = s.outcome === "hit";
      const lastTurn = s.turn + 1 >= s.order.length && s.round >= s.config.rounds;
      const nextId = s.turn + 1 < s.order.length ? s.order[s.turn + 1]! : s.order[0]!;
      body = (
        <div className="grid justify-items-center gap-5 text-center">
          <Piece kind={guesser.piece} mood={hit ? "happy" : "sad"} size={96} />
          <span className="muted">{guesser.name} era</span>
          <motion.h1 initial={reduce ? false : { scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-[clamp(34px,10vw,56px)]">
            {s.identity.name}
          </motion.h1>
          <p className="text-lg">
            {hit ? (
              <>
                Acertou com {s.asked} {s.asked === 1 ? "pergunta" : "perguntas"}: <b>+{s.gained} pontos</b>.
              </>
            ) : s.outcome === "timeout" ? (
              "O tempo acabou antes do chute certo."
            ) : (
              "Não foi dessa vez."
            )}
          </p>
          <div className="w-full">
            <Scoreboard players={s.players} scores={s.scores} unit="pts" />
          </div>
          <div className="w-full max-w-[420px]">
            <button className="btn btn-gema" onClick={() => dispatch({ type: "next" }) && play(lastTurn ? "win" : "tap")}>
              {lastTurn ? "Ver o resultado" : `Próxima vez: ${P(nextId).name}`}
            </button>
          </div>
        </div>
      );
      break;
    }

    case "end": {
      const entries = s.players.map((p) => ({ id: p.id, name: p.name, piece: p.piece, score: s.scores[p.id] ?? 0 }));
      const sorted = [...entries].sort((a, b) => b.score - a.score);
      body = (
        <>
          <h1 className="text-center">{sorted[0]!.score === 0 ? "Ninguém acertou" : sorted[1]?.score === sorted[0]!.score ? "Empate no topo!" : `${sorted[0]!.name} levou!`}</h1>
          <Podium entries={entries} />
          <ul className="grid gap-2" aria-label="Quem era quem">
            {s.history.map((h, i) => (
              <li key={i} className="card flex items-center gap-3 rounded-[18px] px-3 py-2">
                <Piece kind={P(h.guesserId).piece} size={32} mood={h.outcome === "hit" ? "happy" : "sad"} />
                <span className="flex-1">
                  <b>{P(h.guesserId).name}</b> <span className="muted">era</span> <b>{h.name}</b>
                </span>
                <span className="text-[14px] font-semibold text-[var(--fg-2)]">{h.outcome === "hit" ? `+${h.gained}` : "errou"}</span>
              </li>
            ))}
          </ul>
          <EndActions
            onRematch={onRematch}
            onSetup={onSetup}
            night={night}
            result={{ game: "quem-sou-eu", gameName: "Quem Sou Eu?", scored: true, unit: "pts", players: s.players.map((p) => ({ id: p.id, name: p.name, score: s.scores[p.id] ?? 0 })) }}
          />
        </>
      );
      break;
    }
  }

  return (
    <MatchFrame onExit={onSetup}>
      <PhaseStage phaseKey={`${s.round}-${s.turn}-${s.phase}`}>
        {body}
        <ErrorNote message={error} />
      </PhaseStage>
    </MatchFrame>
  );
}
