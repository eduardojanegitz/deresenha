"use client";

import { animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Piece } from "@/brand/Piece";
import { themeLabel } from "@/content/library";
import { sortLimiteThemes } from "@/content/limite";
import type { LimiteChallenge } from "@/content/types";
import { useGameContent, useThemeIds } from "@/content/useGameContent";
import type { Player } from "@/engine/core";
import {
  createLimite,
  DEFAULT_LIMITE_CONFIG,
  formatNumber,
  isNear,
  LIMITE_MIN,
  limiteDistances,
  parseGuess,
  reduceLimite,
  type LimiteAction,
  type LimiteConfig,
  type LimiteState,
} from "@/engine/limite";
import { EndActions, MatchFrame, SetupShell, Unavailable, type NightLink } from "@/ui/frame";
import { PlayersEditor, toPlayers, usePlayerNames } from "@/ui/players";
import { ChipGroup, ErrorNote, PassPhone, PhaseStage, Podium, Progress, RestOfPodium, Stepper, useEngine, useTone } from "@/ui/play";
import { useSound } from "@/ui/sound";

export function LimiteGame() {
  const [names, setNames] = usePlayerNames();
  const [config, setConfig] = useState<LimiteConfig>(DEFAULT_LIMITE_CONFIG);
  const content = useGameContent("limite");
  const ids = useThemeIds(content.challenges, content.themes);
  const all = useMemo(() => sortLimiteThemes(ids), [ids]);
  const [themes, setThemes] = useState<string[]>(all);
  useEffect(() => setThemes(all), [all]);
  useEffect(() => {
    if (content.settings) setConfig((c) => ({ ...c, rounds: content.settings!.defaultRounds }));
  }, [content.settings]);
  const [match, setMatch] = useState<{ key: number; players: Player[]; pool: LimiteChallenge[] } | null>(null);
  const start = () => setMatch({ key: Date.now(), players: toPlayers(names), pool: content.challenges.filter((c) => themes.includes(c.theme)) });

  if (content.settings && !content.settings.enabled) return <Unavailable />;
  if (match) return <LimiteMatch key={match.key} config={config} players={match.players} pool={match.pool} onRematch={start} onSetup={() => setMatch(null)} />;

  return (
    <SetupShell title="Jogo do Limite" subtitle="Ninguém sabe a resposta. Cada um chuta em segredo e ganha quem chegar mais perto." canStart={names.length >= LIMITE_MIN} onStart={start} hint={`Precisa de pelo menos ${LIMITE_MIN} pessoas.`}>
      <PlayersEditor names={names} onChange={setNames} min={LIMITE_MIN} />
      <ChipGroup
        label="Temas"
        multi
        options={all.map((id) => ({ value: id, label: themeLabel(id) }))}
        value={themes}
        onToggle={(id) => setThemes((t) => (t.includes(id) ? (t.length === 1 ? t : t.filter((x) => x !== id)) : [...t, id]))}
      />
      <Stepper label="Perguntas" value={config.rounds} min={1} max={20} onChange={(rounds) => setConfig((c) => ({ ...c, rounds }))} />
    </SetupShell>
  );
}

/** Num celular só: a pergunta aparece para todos, depois o celular passa de mão em mão para os chutes. */
type Step = { kind: "intro" } | { kind: "pass"; i: number } | { kind: "input"; i: number } | { kind: "done" };

export function LimiteMatch({ config, players, pool, onRematch, onSetup, night }: { config: LimiteConfig; players: Player[]; pool: LimiteChallenge[]; onRematch: () => void; onSetup: () => void; night?: NightLink }) {
  const { state: s, dispatch, error } = useEngine<LimiteState, LimiteAction>(() => createLimite(config, players, pool, Math.random), (st, a, rng) => reduceLimite(st, a, pool, rng));
  const { play } = useSound();
  const [step, setStep] = useState<Step>({ kind: "intro" });
  useTone(s.phase === "reveal" ? "noite" : null);
  useEffect(() => setStep({ kind: "intro" }), [s.round]);
  const after = (i: number): Step => (i + 1 < s.players.length ? { kind: "pass", i: i + 1 } : { kind: "done" });

  let body: React.ReactNode;
  if (s.phase === "guess") {
    if (step.kind === "intro") {
      body = (
        <>
          <Progress round={s.round} total={s.config.rounds} label="Pergunta" />
          <LimiteQuestion theme={s.item.theme} question={s.item.question} />
          <p className="muted text-center">Leiam juntos em voz alta. Depois, cada um chuta escondido.</p>
          <div className="grid gap-1.5">
            <button className="btn btn-gema" onClick={() => (setStep({ kind: "pass", i: 0 }), play("start"))}>
              Começar os chutes
            </button>
            <button className="py-2.5 text-[15px] font-semibold text-[var(--fg-2)] underline underline-offset-4" onClick={() => dispatch({ type: "swap" })}>
              Trocar a pergunta
            </button>
          </div>
        </>
      );
    } else if (step.kind === "pass") {
      body = <PassPhone player={s.players[step.i]!} note="Só essa pessoa deve olhar a próxima tela. O chute fica escondido até a revelação." onReady={() => setStep({ kind: "input", i: step.i })} />;
    } else if (step.kind === "input") {
      const p = s.players[step.i]!;
      body = (
        <>
          <div className="flex items-center gap-3.5">
            <Piece kind={p.piece} size={52} alive />
            <div>
              <span className="muted">Chute de</span>
              <br />
              <b className="font-display text-[26px] font-black">{p.name}</b>
            </div>
          </div>
          <LimiteQuestion theme={s.item.theme} question={s.item.question} compact />
          <GuessForm
            key={`${s.round}-${p.id}`}
            unit={s.item.unit}
            onSubmit={(value) => {
              if (dispatch({ type: "guess", playerId: p.id, value })) {
                play("confirm");
                setStep(after(step.i));
              }
            }}
          />
        </>
      );
    } else {
      body = (
        <div className="grid justify-items-center gap-5 pt-6 text-center">
          <Piece kind="meialua" mood="wow" size={96} alive />
          <h1 className="text-[clamp(28px,7vw,40px)]">Todo mundo chutou</h1>
          <p className="muted max-w-[32ch]">Coloquem o celular no meio da roda. Qual é o valor de verdade?</p>
          <div className="w-full max-w-[420px]">
            <button className="btn btn-gema" onClick={() => dispatch({ type: "reveal" }) && play("reveal")}>
              Revelar a resposta
            </button>
          </div>
        </div>
      );
    }
  } else if (s.phase === "reveal") {
    body = (
      <>
        <Progress round={s.round} total={s.config.rounds} label="Pergunta" />
        <LimiteReveal question={s.item.question} unit={s.item.unit} answer={s.item.answer} fact={s.item.fact ?? null} guesses={s.guesses} players={s.players} winners={s.winners} gained={s.gained} />
        <button className="btn btn-gema" onClick={() => dispatch({ type: "next" }) && play(s.round >= s.config.rounds ? "win" : "tap")}>
          {s.round >= s.config.rounds ? "Ver o resultado" : "Próxima pergunta"}
        </button>
      </>
    );
  } else {
    body = (
      <LimiteEnd
        s={s}
        actions={<EndActions onRematch={onRematch} onSetup={onSetup} night={night} result={{ game: "limite", gameName: "Jogo do Limite", scored: true, unit: "pts", players: s.players.map((p) => ({ id: p.id, name: p.name, score: s.scores[p.id] ?? 0 })) }} />}
      />
    );
  }

  return (
    <MatchFrame onExit={onSetup}>
      <PhaseStage phaseKey={`${s.round}-${s.phase}-${step.kind}-${"i" in step ? step.i : ""}`}>
        {body}
        <ErrorNote message={error} />
      </PhaseStage>
    </MatchFrame>
  );
}

/* ---------- peças compartilhadas com o Modo Sala ---------- */

export function LimiteQuestion({ theme, question, compact = false }: { theme: string; question: string; compact?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={`relative overflow-hidden rounded-[26px] bg-[var(--color-gema)] text-[var(--color-tinta)] shadow-[0_6px_0_var(--color-gema-d)] ${compact ? "p-4" : "px-5 pt-5 pb-6"}`}
      initial={reduce ? false : { y: 18, opacity: 0, rotate: -1.5 }}
      animate={{ y: 0, opacity: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 24 }}
    >
      <span className="text-[13.5px] font-bold opacity-75">{themeLabel(theme)}</span>
      <p className={`font-display mt-1 leading-[1.15] font-black ${compact ? "text-[19px]" : "text-[clamp(24px,6.6vw,32px)]"}`}>{question}</p>
    </motion.div>
  );
}

/** Campo do chute: aceita "1.500", "2,5" e mostra como o número foi entendido. */
export function GuessForm({ unit, initial, onSubmit, submitLabel = "Confirmar chute", disabled = false }: { unit: string; initial?: number | null; onSubmit: (value: number) => void; submitLabel?: string; disabled?: boolean }) {
  const [raw, setRaw] = useState(initial != null ? formatNumber(initial) : "");
  const [touched, setTouched] = useState(false);
  const value = parseGuess(raw);
  const invalid = raw.trim() !== "" && value === null;
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <form
      className="grid gap-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (value !== null && !disabled) onSubmit(value);
      }}
    >
      <label className="grid min-w-0 gap-2">
        <span className="label">Seu chute{unit ? ` (em ${unit})` : ""}</span>
        <span className="flex min-w-0 items-center gap-2 rounded-[20px] border-[2.5px] border-[var(--line)] bg-white px-4 focus-within:border-[var(--color-tinta)] focus-within:shadow-[0_0_0_3px_var(--color-gema)]">
          <input
            ref={ref}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            inputMode="decimal"
            size={1}
            autoComplete="off"
            enterKeyHint="done"
            placeholder="0"
            aria-invalid={invalid}
            aria-describedby="chute-ajuda"
            className="num h-[68px] w-full min-w-0 flex-1 bg-transparent text-[34px] text-[var(--color-tinta)] outline-none placeholder:text-[#b9c6bd]"
          />
          {unit && <span className="shrink-0 text-[17px] font-bold text-[var(--fg-2)]">{unit}</span>}
        </span>
      </label>
      <p id="chute-ajuda" className={`min-h-[22px] text-[15px] ${invalid && touched ? "font-semibold text-[var(--color-erro)]" : "text-[var(--fg-2)]"}`}>
        {invalid ? "Use só números. Para casas decimais, use vírgula: 2,5." : value !== null && raw.trim() !== formatNumber(value) ? `Entendi: ${formatNumber(value)}${unit ? ` ${unit}` : ""}` : "Na dúvida, chute. Ninguém sabe mesmo."}
      </p>
      <button className="btn btn-gema" disabled={value === null || disabled}>
        {submitLabel}
      </button>
    </form>
  );
}

/** Número que corre até o valor real, com o mesmo número de casas decimais da resposta. */
function useCountUp(target: number, run: boolean) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce || !run ? target : 0);
  const [done, setDone] = useState(!!reduce || !run);
  useEffect(() => {
    if (reduce || !run) return;
    const c = animate(0, target, { duration: 1.6, ease: [0.16, 1, 0.3, 1], onUpdate: setN, onComplete: () => setDone(true) });
    return () => c.stop();
  }, [target, run, reduce]);
  const decimals = (String(target).split(".")[1] ?? "").length;
  return { text: n.toLocaleString("pt-BR", { minimumFractionDigits: done ? 0 : decimals, maximumFractionDigits: decimals }), done };
}

/** Onde cada chute cai na régua: no meio o valor real, nas pontas 10 vezes menos ou mais. */
const rulerX = (answer: number, value: number) => {
  if (value <= 0) return 0;
  const r = Math.log10(value / answer);
  return 50 + Math.max(-1, Math.min(1, r)) * 46;
};

export function LimiteReveal({
  question,
  unit,
  answer,
  fact,
  guesses,
  players,
  winners,
  gained,
}: {
  question: string;
  unit: string;
  answer: number;
  fact: string | null;
  guesses: Record<string, number>;
  players: Player[];
  winners: string[];
  gained: Record<string, number>;
}) {
  const reduce = useReducedMotion();
  const { text, done } = useCountUp(answer, true);
  const { play } = useSound();
  const played = useRef(false);
  useEffect(() => {
    if (done && !played.current) {
      played.current = true;
      play("reveal");
    }
  }, [done, play]);
  const P = (id: string) => players.find((p) => p.id === id) ?? ({ id, name: "?", piece: "bolota" } as Player);
  const rows = limiteDistances(answer, guesses);
  const nobody = players.filter((p) => guesses[p.id] === undefined);
  const farthest = rows.length > 2 ? rows[rows.length - 1] : undefined;
  const headline = winners.length === 0 ? "Ninguém chutou" : rows[0]!.diff === 0 ? "Na mosca!" : winners.length > 1 ? "Empate no mais perto!" : `${P(winners[0]!).name} chegou mais perto`;

  return (
    <div className="grid gap-5">
      <p className="text-[17px] leading-snug text-[var(--fg-2)]">{question}</p>
      <div className="grid justify-items-center gap-1 text-center" role="status" aria-live="polite">
        <span className="text-[15px] font-semibold text-[var(--fg-2)]">O valor real é</span>
        <span className="num text-[clamp(48px,15vw,84px)] leading-none text-[var(--color-gema)]" aria-hidden={!done}>
          {text}
        </span>
        {unit && <span className="font-display text-xl font-extrabold">{unit}</span>}
        <span className="sr-only">{done ? `${formatNumber(answer)} ${unit}` : ""}</span>
      </div>

      {/* A régua: o valor real no meio, cada peça onde a pessoa chutou. */}
      <div className="relative mt-2 h-[92px]" aria-hidden="true">
        <div className="absolute inset-x-0 top-[58px] h-2 rounded-full bg-[var(--color-noite-3)]" />
        <div className="absolute top-[44px] left-1/2 h-9 w-1.5 -translate-x-1/2 rounded-full bg-[var(--color-gema)]" />
        <span className="absolute top-[74px] left-0 text-[12px] font-bold text-[var(--fg-2)]">10× menos</span>
        <span className="absolute top-[74px] right-0 text-[12px] font-bold text-[var(--fg-2)]">10× mais</span>
        {rows.map((r, k) => {
          const win = winners.includes(r.id);
          return (
            <motion.div
              key={r.id}
              className="absolute top-[14px] -translate-x-1/2"
              style={{ zIndex: win ? 5 : 1 }}
              initial={reduce ? false : { left: "50%", y: -40, opacity: 0 }}
              animate={{ left: `${rulerX(answer, r.value)}%`, y: k % 2 === 0 ? 0 : -10, opacity: 1 }}
              transition={{ type: "spring", stiffness: 160, damping: 18, delay: reduce ? 0 : 1.7 + k * 0.08 }}
            >
              <Piece kind={P(r.id).piece} mood={win ? "happy" : "sus"} size={win ? 38 : 30} />
            </motion.div>
          );
        })}
      </div>

      <motion.h2 className="text-center text-[clamp(24px,6.4vw,32px)]" initial={reduce ? false : { opacity: 0, scale: 0.9 }} animate={{ opacity: done ? 1 : 0, scale: done ? 1 : 0.9 }}>
        {headline}
      </motion.h2>

      <motion.ol className="grid gap-2" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: done ? 1 : 0 }} transition={{ delay: reduce ? 0 : 0.5 }} aria-label="Chutes, do mais perto ao mais longe">
        {rows.map((r) => {
          const win = winners.includes(r.id);
          const near = isNear(answer, r.value);
          const g = gained[r.id] ?? 0;
          return (
            <li key={r.id} className={`flex items-center gap-3 rounded-[18px] px-3 py-2.5 ${win ? "bg-[var(--color-gema)] text-[var(--color-tinta)]" : "bg-[var(--card)]"}`}>
              <Piece kind={P(r.id).piece} mood={win ? "happy" : near ? "neutral" : "sus"} size={34} />
              <span className="grid min-w-0 flex-1">
                <b className="truncate">{P(r.id).name}</b>
                <span className={`text-[14px] ${win ? "" : "text-[var(--fg-2)]"}`}>
                  chutou <b className="num">{formatNumber(r.value)}</b>
                  {r.diff === 0 ? " · exato" : ` · errou por ${formatNumber(Number(r.diff.toPrecision(4)))}`}
                </span>
              </span>
              {g > 0 && <span className="num shrink-0 text-xl">+{g}</span>}
            </li>
          );
        })}
        {nobody.map((p) => (
          <li key={p.id} className="flex items-center gap-3 rounded-[18px] bg-[var(--card)] px-3 py-2.5 opacity-60">
            <Piece kind={p.piece} mood="sleep" size={34} />
            <b className="flex-1">{p.name}</b>
            <span className="text-[14px]">não chutou</span>
          </li>
        ))}
      </motion.ol>

      {farthest && done && !winners.includes(farthest.id) && (
        <p className="text-center text-[15px] text-[var(--fg-2)]">
          Mais longe: <b>{P(farthest.id).name}</b>, com {formatNumber(farthest.value)}.
        </p>
      )}

      {fact && (
        <motion.div className="grid gap-1 rounded-[22px] border-2 border-dashed border-[var(--color-gema)] px-4 py-3.5" initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: done ? 1 : 0, y: done ? 0 : 10 }} transition={{ delay: reduce ? 0 : 0.9 }}>
          <b className="font-display text-[15px] font-extrabold text-[var(--color-gema)]">Curiosidade</b>
          <p className="text-[16px] leading-snug">{fact}</p>
        </motion.div>
      )}
    </div>
  );
}

export function LimiteEnd({ s, actions }: { s: Pick<LimiteState, "players" | "scores" | "wins" | "config">; actions: React.ReactNode }) {
  const entries = s.players.map((p) => ({ id: p.id, name: p.name, piece: p.piece, score: s.scores[p.id] ?? 0 }));
  const sorted = [...entries].sort((a, b) => b.score - a.score);
  return (
    <>
      <h1 className="text-center">{sorted[0]!.score === 0 ? "Ninguém pontuou" : sorted[1]?.score === sorted[0]!.score ? "Empate no topo!" : `${sorted[0]!.name} sabe das coisas!`}</h1>
      <Podium entries={entries} />
      <RestOfPodium entries={entries} />
      <ul className="grid gap-2" aria-label="Rodadas levadas">
        {sorted.map((e) => (
          <li key={e.id} className="card flex items-center gap-3 rounded-[18px] px-3 py-2">
            <Piece kind={e.piece} size={32} />
            <b className="flex-1">{e.name}</b>
            <span className="muted text-[15px]">
              mais perto em {s.wins[e.id] ?? 0} de {s.config.rounds}
            </span>
            <span className="num">{e.score}</span>
          </li>
        ))}
      </ul>
      {actions}
    </>
  );
}
