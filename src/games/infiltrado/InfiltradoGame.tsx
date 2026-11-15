"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Piece } from "@/brand/Piece";
import { themeLabel } from "@/content/library";
import { useGameContent, useThemeIds } from "@/content/useGameContent";
import type { InfiltradoChallenge } from "@/content/types";
import type { Player } from "@/engine/core";
import {
  createInfiltrado,
  DEFAULT_INFILTRADO_CONFIG,
  INFILTRADO_MIN,
  pendingVoters,
  reduceInfiltrado,
  wordFor,
  type InfiltradoAction,
  type InfiltradoConfig,
  type InfiltradoState,
} from "@/engine/infiltrado";
import { EndActions, MatchFrame, SetupShell, Unavailable, type NightLink } from "@/ui/frame";
import { PlayersEditor, toPlayers, usePlayerNames } from "@/ui/players";
import { ChipGroup, ErrorNote, HoldToReveal, PassPhone, PhaseStage, Podium, Progress, Scoreboard, Stepper, useEngine, useTone } from "@/ui/play";
import { useSound } from "@/ui/sound";

export function InfiltradoGame() {
  const [names, setNames] = usePlayerNames();
  const [config, setConfig] = useState<InfiltradoConfig>(DEFAULT_INFILTRADO_CONFIG);
  const content = useGameContent("infiltrado");
  const all = useThemeIds(content.challenges, content.themes);
  const [themes, setThemes] = useState<string[]>(all);
  useEffect(() => setThemes(all), [all]);
  useEffect(() => {
    if (content.settings) setConfig((c) => ({ ...c, rounds: content.settings!.defaultRounds }));
  }, [content.settings]);
  const [match, setMatch] = useState<{ key: number; players: Player[]; pool: InfiltradoChallenge[] } | null>(null);
  const start = () => setMatch({ key: Date.now(), players: toPlayers(names), pool: content.challenges.filter((c) => themes.includes(c.theme)) });

  if (content.settings && !content.settings.enabled) return <Unavailable />;
  if (match) return <InfiltradoMatch key={match.key} config={config} players={match.players} pool={match.pool} onRematch={start} onSetup={() => setMatch(null)} />;

  return (
    <SetupShell title="Infiltrado" subtitle="O celular passa de mão em mão. Cada um vê a própria palavra em segredo." canStart={names.length >= INFILTRADO_MIN} onStart={start} hint={`Precisa de pelo menos ${INFILTRADO_MIN} pessoas.`}>
      <PlayersEditor names={names} onChange={setNames} min={INFILTRADO_MIN} />
      <ChipGroup
        label="Temas"
        multi
        options={all.map((id) => ({ value: id, label: themeLabel(id) }))}
        value={themes}
        onToggle={(id) => setThemes((t) => (t.includes(id) ? (t.length === 1 ? t : t.filter((x) => x !== id)) : [...t, id]))}
      />
      <Stepper label="Rodadas" value={config.rounds} min={1} max={10} onChange={(rounds) => setConfig((c) => ({ ...c, rounds }))} />
      <Stepper label="Voltas de dicas antes de votar" value={config.hintRounds} min={1} max={3} onChange={(hintRounds) => setConfig((c) => ({ ...c, hintRounds }))} />
    </SetupShell>
  );
}

export function InfiltradoMatch({ config, players, pool, onRematch, onSetup, night }: { config: InfiltradoConfig; players: Player[]; pool: InfiltradoChallenge[]; onRematch: () => void; onSetup: () => void; night?: NightLink }) {
  const { state: s, dispatch, error } = useEngine<InfiltradoState, InfiltradoAction>(() => createInfiltrado(config, players, pool, Math.random), (st, a, rng) => reduceInfiltrado(st, a, pool, rng));
  const [privateOpen, setPrivateOpen] = useState(false);
  const [peeked, setPeeked] = useState(false);
  const [choice, setChoice] = useState<string | null>(null);
  const [speaker, setSpeaker] = useState(0);
  const { play } = useSound();
  const P = (id: string) => s.players.find((p) => p.id === id) as Player;
  useTone((privateOpen && (s.phase === "distribute" || s.phase === "vote")) || s.phase === "reveal" ? "noite" : null);

  // Cada troca de pessoa no "passa o celular" zera o estado local.
  const nextToSee = s.players.find((p) => !s.seen.includes(p.id)) ?? null;
  const nextVoter = s.phase === "vote" ? (s.players.find((p) => pendingVoters(s).includes(p.id)) ?? null) : null;
  useEffect(() => {
    setPrivateOpen(false);
    setPeeked(false);
    setChoice(null);
  }, [nextToSee?.id, nextVoter?.id, s.round, s.phase]);

  const order = (() => {
    const i = s.players.findIndex((p) => p.id === s.starterId);
    return [...s.players.slice(i), ...s.players.slice(0, i)];
  })();

  let body: React.ReactNode = null;
  let key = `${s.round}-${s.phase}`;

  if (s.phase === "distribute") {
    if (nextToSee) {
      key += `-${nextToSee.id}-${privateOpen}`;
      body = !privateOpen ? (
        <>
          <Progress round={s.round} total={s.config.rounds} />
          <PassPhone player={nextToSee} note={`Faltam ${s.players.length - s.seen.length} de ${s.players.length}. Só ${nextToSee.name} olha a próxima tela.`} onReady={() => setPrivateOpen(true)} />
        </>
      ) : (
        <div className="grid justify-items-center gap-[18px] text-center">
          <Piece kind="pino" mood="sus" size={56} alive />
          <h1 className="text-[clamp(28px,7vw,38px)]">{nextToSee.name}, esta é sua palavra</h1>
          <p className="muted max-w-[32ch]">Guarde bem. Você pode ser o infiltrado sem saber.</p>
          <HoldToReveal
            secret={<span className="font-display text-[clamp(30px,9vw,44px)] leading-tight font-black text-balance">{wordFor(s, nextToSee.id)}</span>}
            srText={`Sua palavra é ${wordFor(s, nextToSee.id)}`}
            onPeek={() => setPeeked(true)}
          />
          <div className="w-full max-w-[420px]">
            <button className="btn btn-ghost" disabled={!peeked} onClick={() => dispatch({ type: "seen", playerId: nextToSee.id }) && play("confirm")}>
              Já vi. Passar adiante
            </button>
          </div>
        </div>
      );
    } else {
      body = (
        <div className="grid justify-items-center gap-5 pt-4 text-center">
          <Piece kind="bolota" mood="happy" size={88} alive />
          <h1>Todo mundo viu a palavra</h1>
          <p className="muted max-w-[32ch]">Coloquem o celular no meio da roda. Hora das dicas.</p>
          <div className="w-full max-w-[420px]">
            <button className="btn" onClick={() => dispatch({ type: "start-hints" }) && play("start")}>
              Começar as dicas
            </button>
          </div>
        </div>
      );
    }
  } else if (s.phase === "hints") {
    key += `-${s.hintRound}`;
    body = (
      <>
        <Progress round={s.round} total={s.config.rounds} />
        <h1>Dicas{s.config.hintRounds > 1 ? `, volta ${s.hintRound} de ${s.config.hintRounds}` : ""}</h1>
        <p className="muted">Cada um, na ordem, fala uma palavra ou frase curta sobre a sua palavra. Toque em quem acabou de falar para passar a vez.</p>
        <ol className="grid gap-2">
          {order.map((p, i) => (
            <li key={p.id}>
              <button
                onClick={() => setSpeaker(i + 1)}
                className={`card flex w-full items-center gap-3 rounded-[18px] px-3 py-2 text-left transition-opacity ${i < speaker ? "opacity-45" : ""} ${i === speaker ? "ring-[3px] ring-[var(--color-gema)]" : ""}`}
                aria-current={i === speaker ? "step" : undefined}
              >
                <span className="num w-6 text-center text-[var(--fg-2)]">{i + 1}</span>
                <Piece kind={p.piece} size={36} mood={i === speaker ? "wow" : "neutral"} />
                <b className="flex-1">{p.name}</b>
                <span className="text-sm text-[var(--fg-2)]">{i < speaker ? "falou" : i === speaker ? "vez de falar" : ""}</span>
              </button>
            </li>
          ))}
        </ol>
        {s.hintRound < s.config.hintRounds && (
          <button
            className="btn btn-ghost"
            onClick={() => {
              setSpeaker(0);
              dispatch({ type: "next-hint-round" });
            }}
          >
            Mais uma volta de dicas
          </button>
        )}
        <button className="btn btn-gema" onClick={() => dispatch({ type: "open-vote" }) && play("start")}>
          Ir para a votação
        </button>
      </>
    );
  } else if (s.phase === "vote") {
    if (nextVoter) {
      key += `-${nextVoter.id}-${privateOpen}-${s.wentToRevote}`;
      const targets = s.players.filter((p) => p.id !== nextVoter.id && (!s.candidates || s.candidates.includes(p.id)));
      body = !privateOpen ? (
        <>
          {s.wentToRevote && s.candidates && (
            <div className="card grid gap-1 rounded-[22px] p-4">
              <b className="font-display text-xl font-black">Deu empate!</b>
              <span className="muted">Desempate só entre {s.candidates.map((id) => P(id).name).join(" e ")}.</span>
            </div>
          )}
          <PassPhone player={nextVoter} title={`Voto secreto de ${nextVoter.name}`} note={`Faltam ${pendingVoters(s).length} votos. Ninguém mais olha.`} cta={`Sou ${nextVoter.name}, quero votar`} onReady={() => setPrivateOpen(true)} />
        </>
      ) : (
        <>
          <h1 className="text-[clamp(26px,7vw,36px)]">{nextVoter.name}, quem é o infiltrado?</h1>
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Escolha em quem votar">
            {targets.map((p) => (
              <button
                key={p.id}
                role="radio"
                aria-checked={choice === p.id}
                onClick={() => setChoice(p.id)}
                className={`grid justify-items-center gap-2 rounded-[22px] border-[2.5px] bg-[var(--card)] p-4 ${choice === p.id ? "border-[var(--color-gema)] shadow-[inset_0_0_0_1.5px_var(--color-gema)]" : "border-[var(--line)]"}`}
              >
                <Piece kind={p.piece} mood={choice === p.id ? "sus" : "neutral"} size={56} />
                <b>{p.name}</b>
              </button>
            ))}
          </div>
          <button
            className="btn btn-gema"
            disabled={!choice}
            onClick={() => {
              if (choice && dispatch({ type: "vote", voterId: nextVoter.id, targetId: choice })) play("confirm");
            }}
          >
            Confirmar voto
          </button>
        </>
      );
    } else {
      body = (
        <div className="grid justify-items-center gap-5 pt-4 text-center">
          <Piece kind="meialua" mood="wow" size={88} alive />
          <h1>Todos votaram</h1>
          <p className="muted">Celular no meio da roda. Prontos?</p>
          <div className="w-full max-w-[420px]">
            <button className="btn btn-gema" onClick={() => dispatch({ type: "close-vote" }) && play("reveal")}>
              Revelar os votos
            </button>
          </div>
        </div>
      );
    }
  } else if (s.phase === "reveal" && s.result) {
    body = <Reveal s={s} P={P} onNext={() => dispatch({ type: "next" }) && play(s.round >= s.config.rounds ? "win" : "tap")} />;
  } else if (s.phase === "end") {
    const entries = s.players.map((p) => ({ id: p.id, name: p.name, piece: p.piece, score: s.scores[p.id] ?? 0 }));
    const sorted = [...entries].sort((a, b) => b.score - a.score);
    body = (
      <>
        <h1 className="text-center">{sorted[0]!.score === 0 ? "Ninguém pontuou" : sorted[1]?.score === sorted[0]!.score ? "Empate no topo!" : `${sorted[0]!.name} levou!`}</h1>
        <Podium entries={entries} />
        {sorted.length > 3 && <Scoreboard players={s.players.filter((p) => sorted.slice(3).some((x) => x.id === p.id))} scores={s.scores} />}
        <EndActions onRematch={onRematch} onSetup={onSetup} night={night} result={{ game: "infiltrado", gameName: "Infiltrado", scored: true, unit: "pts", players: s.players.map((p) => ({ id: p.id, name: p.name, score: s.scores[p.id] ?? 0 })) }} />
      </>
    );
  }

  return (
    <MatchFrame onExit={onSetup}>
      <PhaseStage phaseKey={key}>
        {body}
        <ErrorNote message={error} />
      </PhaseStage>
    </MatchFrame>
  );
}

export function Reveal({ s, P, onNext, canAdvance = true }: { s: Pick<InfiltradoState, "result" | "players" | "round" | "config">; P: (id: string) => Player; onNext: () => void; canAdvance?: boolean }) {
  const r = s.result!;
  const reduce = useReducedMotion();
  const [step, setStep] = useState(reduce ? 3 : 0);
  const { play } = useSound();
  useEffect(() => {
    if (reduce) return;
    const t1 = window.setTimeout(() => setStep(1), 900);
    const t2 = window.setTimeout(() => {
      setStep(2);
      play(r.caught ? "hit" : "miss");
    }, 2300);
    const t3 = window.setTimeout(() => setStep(3), 3000);
    return () => [t1, t2, t3].forEach(window.clearTimeout);
  }, [reduce, play, r.caught]);
  const imp = P(r.impostorId);
  const max = Math.max(1, ...Object.values(r.tally));
  return (
    <div className="grid justify-items-center gap-5 text-center">
      <h1 className="font-display text-xl font-extrabold text-[var(--fg-2)]">{r.accusedId ? `A turma apontou ${P(r.accusedId).name}` : "Empatou de novo. Ninguém foi apontado."}</h1>

      <div className="h-[210px] w-[200px]" style={{ perspective: 900 }}>
        <motion.div className="relative size-full" style={{ transformStyle: "preserve-3d" }} animate={{ rotateY: step >= 2 ? 180 : 0 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}>
          <div className="absolute inset-0 grid place-items-center rounded-[28px] bg-[var(--color-noite-2)] shadow-[inset_0_0_0_3px_#1E5A48] [backface-visibility:hidden]">
            <motion.div animate={step === 1 && !reduce ? { x: [-10, 10, -6, 6, 0] } : {}} transition={{ duration: 0.8, repeat: step === 1 ? Infinity : 0 }}>
              <Piece kind="meialua" mood="wow" size={96} alive />
            </motion.div>
          </div>
          <div className="absolute inset-0 grid content-center justify-items-center gap-2 rounded-[28px] bg-[var(--color-lilas)] text-[var(--color-tinta)] shadow-[0_6px_0_var(--color-lilas-d)] [backface-visibility:hidden]" style={{ transform: "rotateY(180deg)" }}>
            <Piece kind={imp.piece} mood={r.caught ? "sad" : "happy"} size={80} />
            <span className="text-sm font-bold">O infiltrado era</span>
            <b className="font-display text-[28px] leading-none font-black">{imp.name}</b>
          </div>
        </motion.div>
      </div>
      <p className="sr-only" aria-live="polite">
        {step >= 2 ? `O infiltrado era ${imp.name}. ${r.caught ? "A turma acertou." : "O infiltrado escapou."}` : ""}
      </p>

      <motion.div className="grid w-full max-w-[520px] gap-4" initial={{ opacity: 0, y: 10 }} animate={step >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}>
        <p className="font-display text-[clamp(24px,6vw,30px)] leading-tight font-black">{r.caught ? "Pegaram o infiltrado!" : `${imp.name} escapou!`}</p>
        <div className="grid grid-cols-2 gap-2.5 text-left">
          <div className="rounded-[20px] bg-[var(--card)] px-4 py-3.5">
            <div className="text-[13.5px] font-semibold text-[var(--fg-2)]">A maioria tinha</div>
            <div className="font-display mt-1 text-2xl font-black">{r.major}</div>
          </div>
          <div className="rounded-[20px] bg-[var(--card)] px-4 py-3.5">
            <div className="text-[13.5px] font-semibold text-[var(--fg-2)]">O infiltrado tinha</div>
            <div className="font-display mt-1 text-2xl font-black text-[var(--color-lilas)]">{r.impostor}</div>
          </div>
        </div>
        <ul className="grid gap-2 text-left" aria-label="Votos">
          {s.players
            .filter((p) => r.tally[p.id])
            .sort((a, b) => (r.tally[b.id] ?? 0) - (r.tally[a.id] ?? 0))
            .map((p) => (
              <li key={p.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[18px] bg-[var(--card)] py-2 pr-4 pl-2">
                <Piece kind={p.piece} size={34} />
                <div>
                  <b>{p.name}</b>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--color-noite-3)]">
                    <motion.i className="block h-full rounded-full bg-[var(--color-gema)]" initial={{ width: 0 }} animate={{ width: step >= 3 ? `${((r.tally[p.id] ?? 0) / max) * 100}%` : 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} />
                  </div>
                </div>
                <span className="num text-xl">{r.tally[p.id]}</span>
              </li>
            ))}
        </ul>
        <p className="text-[15px] text-[var(--fg-2)]">
          {Object.entries(r.points)
            .filter(([, v]) => v > 0)
            .map(([id, v]) => `${P(id).name} +${v}`)
            .join(", ") || "Ninguém pontuou nesta rodada."}
        </p>
        {canAdvance ? (
          <button className="btn btn-gema" onClick={onNext}>
            {s.round >= s.config.rounds ? "Ver resultado" : "Próxima rodada"}
          </button>
        ) : (
          <p className="muted py-2">Esperando quem comanda a sala avançar.</p>
        )}
      </motion.div>
    </div>
  );
}
