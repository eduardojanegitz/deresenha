"use client";

import { motion, useReducedMotion } from "motion/react";
import { useMemo, useState, useEffect } from "react";
import { Piece, type Mood } from "@/brand/Piece";
import { themeLabel } from "@/content/library";
import { useGameContent } from "@/content/useGameContent";
import type { NotaChallenge } from "@/content/types";
import type { Player } from "@/engine/core";
import {
  createNota,
  DEFAULT_NOTA_CONFIG,
  guessersOf,
  MIN_PLAYERS,
  pendingGuessers,
  reduceNota,
  type NotaAction,
  type NotaConfig,
  type NotaState,
} from "@/engine/nota";
import { EndActions, MatchFrame, SetupShell, Unavailable, type NightLink } from "@/ui/frame";
import { PlayersEditor, toPlayers, usePlayerNames } from "@/ui/players";
import {
  ChipGroup,
  ErrorNote,
  HoldToReveal,
  NumberPad,
  PhaseStage,
  Podium,
  Progress,
  PromptCard,
  Scoreboard,
  Stepper,
  Timer,
  Toggle,
  useEngine,
  useSuspenseNumber,
  useTone,
  Who,
} from "@/ui/play";
import { useSound } from "@/ui/sound";
import { Track } from "@/ui/Track";

const fmt = (n: number) => (Math.round(n * 10) / 10).toLocaleString("pt-BR");
const LABEL = (d: number) => (d === 0 ? "Na mosca" : d === 1 ? "Quase" : d === 2 ? "Perto" : d === 3 ? "Raspou" : "Longe");

export function NotaGame() {
  const [names, setNames] = usePlayerNames();
  const [config, setConfig] = useState<NotaConfig>(DEFAULT_NOTA_CONFIG);
  const content = useGameContent("nota");
  const allThemes = useMemo(() => {
    const ids = (kind: "secreta" | "avaliacao") => {
      const used = new Set(content.challenges.filter((c) => c.kind === kind).map((c) => c.theme));
      return content.themes.filter((t) => used.has(t.id)).map((t) => t.id);
    };
    return { secreta: ids("secreta"), avaliacao: ids("avaliacao") };
  }, [content.challenges, content.themes]);
  const [themes, setThemes] = useState(allThemes);
  useEffect(() => setThemes(allThemes), [allThemes]);
  useEffect(() => {
    if (content.settings) setConfig((c) => ({ ...c, rounds: content.settings!.defaultRounds }));
  }, [content.settings]);
  const [match, setMatch] = useState<{ key: number; players: Player[]; pool: NotaChallenge[] } | null>(null);

  const start = () => setMatch({ key: Date.now(), players: toPlayers(names), pool: content.challenges.filter((c) => themes[config.mode].includes(c.theme)) });

  if (content.settings && !content.settings.enabled) return <Unavailable />;
  if (match) {
    return <NotaMatch key={match.key} config={config} players={match.players} pool={match.pool} onRematch={start} onSetup={() => setMatch(null)} />;
  }

  const mode = config.mode;
  const min = MIN_PLAYERS[mode];
  const set = (p: Partial<NotaConfig>) => setConfig((c) => ({ ...c, ...p }));
  const toggleTheme = (id: string) =>
    setThemes((t) => {
      const cur = t[mode];
      if (cur.includes(id) && cur.length === 1) return t; // pelo menos um tema
      return { ...t, [mode]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] };
    });

  return (
    <SetupShell
      title="Jogo da Nota"
      subtitle="Num celular só: o anfitrião registra as respostas de todo mundo."
      canStart={names.length >= min}
      onStart={start}
      hint={`Precisa de pelo menos ${min} pessoas.`}
    >
      <div className="grid gap-2.5">
        <span className="label" id="modo">
          Modo
        </span>
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-labelledby="modo">
          {(
            [
              ["secreta", "Nota Secreta", "Alguém recebe uma nota escondida e diz algo que vale exatamente isso. A turma chuta.", "pino"],
              ["avaliacao", "Avaliação", "Uma situação, cada um dá sua nota. Revela tudo junto e vê quem pensa igual.", "tijolo"],
            ] as const
          ).map(([id, title, text, piece]) => (
            <button
              key={id}
              role="radio"
              aria-checked={mode === id}
              onClick={() => set({ mode: id })}
              className={`grid grid-cols-[auto_1fr] items-start gap-3 rounded-[22px] border-[2.5px] bg-[var(--card)] p-4 text-left ${mode === id ? "border-[var(--color-tinta)] shadow-[inset_0_0_0_1.5px_var(--color-tinta)]" : "border-[var(--line)]"}`}
            >
              <Piece kind={piece} mood={id === "secreta" ? "sus" : "neutral"} size={48} />
              <span>
                <b className="font-display mb-1 block text-[19px] font-extrabold">{title}</b>
                <span className="text-[14.5px] leading-snug text-[var(--fg-2)]">{text}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <PlayersEditor names={names} onChange={setNames} min={min} />

      <ChipGroup label="Temas" multi options={allThemes[mode].map((id) => ({ value: id, label: themeLabel(id) }))} value={themes[mode]} onToggle={toggleTheme} />

      <Stepper label="Rodadas" value={config.rounds} min={1} max={12} onChange={(rounds) => set({ rounds })} />

      {mode === "secreta" ? (
        <>
          <ChipGroup
            label="Tempo para pensar na resposta"
            options={[30, 45, 60, 0].map((t) => ({ value: t, label: t ? `${t} s` : "Sem tempo" }))}
            value={[config.timerSec]}
            onToggle={(timerSec) => set({ timerSec })}
          />
          <div className="grid gap-2.5">
            <span className="label">Pontos por palpite</span>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  ["exact", "Na mosca"],
                  ["d1", "Errou por 1"],
                  ["d2", "Errou por 2"],
                  ["d3", "Errou por 3"],
                ] as const
              ).map(([k, l]) => (
                <label key={k} className="grid gap-1.5 text-[13px] font-semibold text-[var(--fg-2)]">
                  {l}
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={999}
                    value={config.table[k]}
                    onChange={(e) => {
                      const v = Math.max(0, Math.min(999, parseInt(e.target.value, 10) || 0));
                      set({ table: { ...config.table, [k]: v } });
                    }}
                    className="num h-12 w-full rounded-[14px] border-2 border-[var(--line)] bg-white text-center text-lg text-[var(--color-tinta)]"
                  />
                </label>
              ))}
            </div>
            <Toggle checked={config.tellerBonus} onChange={(tellerBonus) => set({ tellerBonus })}>
              Quem deu a dica ganha metade da média dos pontos da turma
            </Toggle>
          </div>
        </>
      ) : (
        <div className="grid gap-2">
          <Toggle checked={config.scoreAvaliacao} onChange={(scoreAvaliacao) => set({ scoreAvaliacao })}>
            Dar pontos para quem chegar mais perto da média da turma
          </Toggle>
          <p className="muted text-[15px]">Desligado, o jogo é só pela conversa: sem placar, com estatísticas no fim de cada rodada.</p>
        </div>
      )}
    </SetupShell>
  );
}

/* ---------- partida ---------- */

export function NotaMatch({ config, players, pool, onRematch, onSetup, night }: { config: NotaConfig; players: Player[]; pool: NotaChallenge[]; onRematch: () => void; onSetup: () => void; night?: NightLink }) {
  const { state: s, dispatch, error } = useEngine<NotaState, NotaAction>(
    () => createNota(config, players, pool, Math.random),
    (st, a, rng) => reduceNota(st, a, pool, rng),
  );
  const { play } = useSound();
  useTone(s.phase === "private" || s.phase === "reveal" ? "noite" : null);
  const P = (id: string) => s.players.find((p) => p.id === id) as Player;
  const teller = s.tellerId ? P(s.tellerId) : null;
  const act = (a: NotaAction, sfx?: Parameters<typeof play>[0]) => {
    if (dispatch(a) && sfx) play(sfx);
  };

  let body: React.ReactNode;
  switch (s.phase) {
    case "intro":
      body =
        s.config.mode === "secreta" && teller ? (
          <>
            <Progress round={s.round} total={s.config.rounds} />
            <PromptCard tag={`Tema: ${themeLabel(s.prompt.theme)}`} text={s.prompt.text} flip />
            <Who player={teller} mood="sus" caption="Quem pensa nesta rodada" />
            <div className="grid gap-1.5">
              <button className="btn" onClick={() => act({ type: "open-private" }, "start")}>
                Passar o celular para {teller.name}
              </button>
              <button className="py-2.5 text-[15px] font-semibold text-[var(--fg-2)] underline underline-offset-4" onClick={() => act({ type: "swap-prompt" }, "tap")}>
                Trocar o tema
              </button>
            </div>
          </>
        ) : (
          <>
            <Progress round={s.round} total={s.config.rounds} />
            <PromptCard tag={`Situação: ${themeLabel(s.prompt.theme)}`} text={s.prompt.text} flip />
            <div className="flex items-center gap-3.5">
              <Piece kind="tijolo" size={56} alive />
              <h2 className="text-[21px] leading-snug">De 0 a 10, quanto vale isso? Cada um pensa na sua nota antes de falar.</h2>
            </div>
            <div className="grid gap-1.5">
              <button className="btn" onClick={() => act({ type: "open-guesses" }, "start")}>
                Registrar as notas
              </button>
              <button className="py-2.5 text-[15px] font-semibold text-[var(--fg-2)] underline underline-offset-4" onClick={() => act({ type: "swap-prompt" }, "tap")}>
                Trocar a situação
              </button>
            </div>
          </>
        );
      break;

    case "private":
      body = teller && (
        <div className="grid justify-items-center gap-[18px] text-center">
          <Piece kind="pino" mood="sus" size={56} alive />
          <h1 className="text-[clamp(28px,7vw,38px)]">Só {teller.name} olha agora</h1>
          <p className="muted max-w-[30ch]">
            Tema: <b className="text-white">{s.prompt.text}</b>
          </p>
          <HoldToReveal
            secret={<span className="num text-[clamp(110px,34vw,160px)] leading-none">{s.secret}</span>}
            srText={`Sua nota é ${s.secret}`}
            onPeek={() => dispatch({ type: "peek", playerId: teller.id })}
          />
          <div className="w-full max-w-[420px]">
            <button className="btn btn-ghost" disabled={!s.peeked} onClick={() => act({ type: "confirm-private" }, "confirm")}>
              Já guardei. Devolver para a turma
            </button>
          </div>
        </div>
      );
      break;

    case "answer":
      body = teller && (
        <>
          <Progress round={s.round} total={s.config.rounds} />
          <PromptCard tag={`Tema: ${themeLabel(s.prompt.theme)}`} text={s.prompt.text} />
          <div className="flex items-center gap-3.5">
            <Piece kind={teller.piece} mood="happy" size={56} alive />
            <h2 className="text-[21px] leading-snug">{teller.name}, diga em voz alta algo que vale exatamente a sua nota.</h2>
          </div>
          {s.config.timerSec > 0 && <Timer seconds={s.config.timerSec} />}
          <button className="btn" onClick={() => act({ type: "answered" }, "confirm")}>
            {teller.name} já respondeu
          </button>
        </>
      );
      break;

    case "guess":
      body = <GuessPhase s={s} dispatch={dispatch} P={P} />;
      break;

    case "reveal":
      body = <RevealPhase s={s} P={P} onNext={() => act(s.config.mode === "secreta" ? { type: "show-score" } : { type: "next" }, "tap")} />;
      break;

    case "score":
      body = (
        <>
          <Progress round={s.round} total={s.config.rounds} />
          <h1>Placar</h1>
          <Scoreboard players={s.players} scores={s.scores} />
          <button className={`btn ${s.round >= s.config.rounds ? "btn-gema" : ""}`} onClick={() => act({ type: "next" }, s.round >= s.config.rounds ? "win" : "tap")}>
            {s.round >= s.config.rounds ? "Ver resultado" : "Próxima rodada"}
          </button>
        </>
      );
      break;

    case "end":
      body = <EndPhase s={s} onRematch={onRematch} onSetup={onSetup} night={night} />;
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

function GuessPhase({ s, dispatch, P }: { s: NotaState; dispatch: (a: NotaAction) => boolean; P: (id: string) => Player }) {
  const ids = guessersOf(s);
  const [cursor, setCursor] = useState<string | null>(ids[0] ?? null);
  const [timeUp, setTimeUp] = useState(false);
  const { play } = useSound();
  const pending = pendingGuessers(s);
  const secreta = s.config.mode === "secreta";
  const current = cursor && P(cursor);
  const pickNum = (n: number) => {
    if (!cursor) return;
    if (!dispatch({ type: "guess", playerId: cursor, value: n })) return;
    play("confirm");
    const order = [...ids.slice(ids.indexOf(cursor) + 1), ...ids.slice(0, ids.indexOf(cursor))];
    const next = order.find((id) => s.guesses[id] === undefined && id !== cursor) ?? null;
    setCursor(next);
  };
  const all = pending.length === 0;
  return (
    <>
      <Progress round={s.round} total={s.config.rounds} />
      <div className="card grid gap-1.5 rounded-[28px] px-5 py-[18px]">
        <span className="text-sm font-bold text-[var(--fg-2)]">{secreta && s.tellerId ? `${P(s.tellerId).name} falou sobre` : "Situação"}</span>
        <p className="font-display text-[clamp(21px,5.4vw,26px)] leading-tight font-black">{s.prompt.text}</p>
      </div>
      {current ? (
        <>
          <Who player={current} caption={secreta ? "Palpite de" : "Nota de"} size={48} />
          <NumberPad min={s.config.range.min} max={s.config.range.max} value={s.guesses[current.id]} onPick={pickNum} label={`${secreta ? "Palpite" : "Nota"} de ${current.name}`} />
        </>
      ) : (
        <div className="flex items-center gap-3.5">
          <Piece kind="meialua" mood="wow" size={56} alive />
          <h2>Todo mundo respondeu.</h2>
        </div>
      )}
      <div className="flex flex-wrap gap-2" aria-label="Quem já respondeu">
        {ids.map((id) => {
          const done = s.guesses[id] !== undefined;
          return (
            <motion.button
              key={id}
              layout
              onClick={() => setCursor(id)}
              aria-label={`${P(id).name}: ${done ? "respondeu, toque para mudar" : "falta responder"}`}
              className={`inline-flex items-center gap-1.5 rounded-full border-2 bg-[var(--card)] py-[3px] pr-3 pl-1 font-semibold ${id === cursor ? "border-[var(--color-tinta)] shadow-[inset_0_0_0_1px_var(--color-tinta)]" : "border-[var(--line)]"}`}
              animate={done ? { scale: [1, 1.1, 1] } : { scale: 1 }}
              transition={{ duration: 0.35 }}
            >
              <Piece kind={P(id).piece} size={30} />
              {P(id).name}
              <span className={`font-display text-[13px] font-extrabold ${done ? "text-[var(--color-ok)]" : "text-[var(--fg-2)]"}`}>{done ? "pronto" : "…"}</span>
            </motion.button>
          );
        })}
      </div>
      {s.config.mode === "secreta" && s.config.timerSec > 0 && !all && (
        <details className="text-[15px] text-[var(--fg-2)]">
          <summary className="cursor-pointer font-semibold">Usar cronômetro para os palpites</summary>
          <div className="mt-3">
            <Timer seconds={s.config.timerSec} size={110} onDone={() => setTimeUp(true)} />
          </div>
        </details>
      )}
      <button className={`btn ${all ? "btn-gema" : ""}`} disabled={!all && !(timeUp && pending.length < ids.length)} onClick={() => dispatch({ type: "close-guesses", force: !all })}>
        {all ? (secreta ? "Revelar a nota" : "Revelar as notas") : timeUp ? "Tempo! Revelar com quem respondeu" : `Faltam ${pending.length}`}
      </button>
    </>
  );
}

export function RevealPhase({ s, P, onNext, canAdvance = true }: { s: NotaState; P: (id: string) => Player; onNext: () => void; canAdvance?: boolean }) {
  const r = s.result!;
  const [landed, setLanded] = useState(false);
  const [settled, setSettled] = useState(false);
  const reduce = useReducedMotion();
  const { play } = useSound();
  const final = r.kind === "secreta" ? String(r.secret) : fmt(r.mean);
  const { shown } = useSuspenseNumber(final, true, () => {
    setLanded(true);
    play("reveal");
    window.setTimeout(() => {
      setSettled(true);
      if (r.kind === "secreta" && r.rows.some((x) => x.diff === 0)) play("hit");
    }, reduce ? 0 : 450 + (r.kind === "secreta" ? r.rows.length : r.rows.length) * 180);
  });
  const later = { initial: { opacity: 0, y: 10 }, animate: settled ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 } };

  if (r.kind === "secreta") {
    const items = r.rows.filter((x) => x.guess !== null).map((x) => ({ player: P(x.playerId), value: x.guess as number, mood: (x.diff === 0 ? "happy" : x.diff! <= 1 ? "wow" : x.diff! <= 3 ? "neutral" : "sad") as Mood }));
    const sorted = [...r.rows].sort((a, b) => (a.diff ?? 99) - (b.diff ?? 99));
    return (
      <div className="grid justify-items-center gap-[18px] text-center">
        <h1 className="font-display text-xl font-extrabold text-[var(--fg-2)]">A nota de {P(r.tellerId).name} era</h1>
        <motion.div
          className={`num text-[clamp(130px,42vw,190px)] leading-[.9] ${landed ? "text-[var(--color-gema)]" : "text-white"}`}
          animate={landed && !reduce ? { scale: [1.5, 1] } : { scale: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 14 }}
          aria-live="polite"
        >
          {shown}
        </motion.div>
        <Track items={items} hit={r.secret} show={landed} />
        <motion.ul className="grid w-full max-w-[520px] gap-2 text-left" {...later}>
          {sorted.map((x) => (
            <li key={x.playerId} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[18px] bg-[var(--card)] py-2 pr-3.5 pl-2">
              <Piece kind={P(x.playerId).piece} size={36} />
              <div>
                <b>{P(x.playerId).name}</b>
                <div className="text-sm text-[var(--fg-2)]">{x.guess === null ? "Não chutou a tempo." : `Chutou ${x.guess}. ${LABEL(x.diff!)}.`}</div>
              </div>
              <span className={`num text-[22px] ${x.points ? "text-[var(--color-gema)]" : "text-[var(--fg-2)]"}`}>+{x.points}</span>
            </li>
          ))}
          {s.config.tellerBonus && (
            <li className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[18px] bg-[var(--card)] py-2 pr-3.5 pl-2">
              <Piece kind={P(r.tellerId).piece} size={36} />
              <div>
                <b>{P(r.tellerId).name}</b>
                <div className="text-sm text-[var(--fg-2)]">Deu a dica</div>
              </div>
              <span className={`num text-[22px] ${r.tellerBonus ? "text-[var(--color-gema)]" : "text-[var(--fg-2)]"}`}>+{r.tellerBonus}</span>
            </li>
          )}
        </motion.ul>
        <motion.div className="w-full max-w-[520px]" {...later}>
          {canAdvance ? (
          <button className="btn btn-gema" onClick={onNext} disabled={!settled}>
            Ver placar
          </button>
        ) : (
          <p className="muted py-3">Esperando quem comanda a sala avançar.</p>
        )}
        </motion.div>
      </div>
    );
  }

  const items = r.rows.map((x) => ({ player: P(x.playerId), value: x.value, mood: (Math.abs(x.value - r.mean) <= 1 ? "happy" : Math.abs(x.value - r.mean) >= 4 ? "sus" : "neutral") as "happy" | "sus" | "neutral" }));
  const verdict = r.spread === 0 ? "Unanimidade. Isso nunca acontece." : r.spread <= 2 ? "Turma em sintonia." : r.spread <= 5 ? "Opiniões divididas, mas ninguém brigou. Ainda." : "Isso aqui vai dar discussão.";
  const last = s.round >= s.config.rounds;
  return (
    <div className="grid justify-items-center gap-[18px] text-center">
      <p className="font-display max-w-[28ch] text-lg font-extrabold text-[var(--fg-2)]">{s.prompt.text}</p>
      <motion.div className={`num text-[clamp(90px,28vw,130px)] leading-[.9] ${landed ? "text-[var(--color-gema)]" : "text-white"}`} animate={landed && !reduce ? { scale: [1.4, 1] } : { scale: 1 }} aria-live="polite">
        {shown}
      </motion.div>
      <h1 className="-mt-2.5 font-[var(--font-ui)] text-base font-normal text-[var(--fg-2)]">média da turma</h1>
      <Track items={items} hit={null} show={landed} />
      <motion.p className="font-display max-w-[24ch] text-[clamp(21px,5vw,26px)] leading-tight font-extrabold" {...later}>
        {verdict}
      </motion.p>
      <motion.div className="grid w-full max-w-[520px] grid-cols-2 gap-2.5 text-left" {...later}>
        <Stat k="Mediana" v={fmt(r.median)} />
        <Stat k="Maior diferença" v={String(r.spread)} />
        {r.spread > 0 && <Stat wide k="Lados opostos" v={`${P(r.highest.playerId).name} deu ${r.highest.value}, ${P(r.lowest.playerId).name} deu ${r.lowest.value}`} />}
        <Stat wide k="Mais perto da turma" v={`${P(r.closest.playerId).name}, com ${r.closest.value}`} />
        {s.config.scoreAvaliacao && <Stat wide k="Pontos da rodada" v={r.rows.filter((x) => x.points).map((x) => `${P(x.playerId).name} +${x.points}`).join(", ") || "Ninguém pontuou"} />}
      </motion.div>
      <motion.div className="w-full max-w-[520px]" {...later}>
        {canAdvance ? (
          <button className="btn btn-gema" onClick={onNext} disabled={!settled}>
          {last ? "Ver resumo" : "Próxima situação"}
        </button>
        ) : (
          <p className="muted py-3">Esperando quem comanda a sala avançar.</p>
        )}
      </motion.div>
    </div>
  );
}

function Stat({ k, v, wide = false }: { k: string; v: string; wide?: boolean }) {
  const small = v.length > 6;
  return (
    <div className={`rounded-[20px] bg-[var(--card)] px-4 py-3.5 ${wide ? "col-span-2" : ""}`}>
      <div className="text-[13.5px] font-semibold text-[var(--fg-2)]">{k}</div>
      <div className={`font-display mt-1 font-black ${small ? "text-lg leading-snug" : "text-[30px] leading-tight"}`}>{v}</div>
    </div>
  );
}

export function EndPhase({ s, onRematch, onSetup, actions, night }: { s: NotaState; onRematch?: () => void; onSetup?: () => void; actions?: React.ReactNode; night?: NightLink }) {
  const scoredMatch = s.config.mode === "secreta" || s.config.scoreAvaliacao;
  const footer = actions ?? (
    <EndActions
      onRematch={onRematch ?? (() => {})}
      onSetup={onSetup ?? (() => {})}
      night={night}
      result={{ game: "nota", gameName: s.config.mode === "secreta" ? "Nota Secreta" : "Avaliação", scored: scoredMatch, unit: "pts", players: s.players.map((p) => ({ id: p.id, name: p.name, score: s.scores[p.id] ?? 0 })) }}
    />
  );
  const scored = s.config.mode === "secreta" || s.config.scoreAvaliacao;
  if (scored) {
    const entries = s.players.map((p) => ({ id: p.id, name: p.name, piece: p.piece, score: s.scores[p.id] ?? 0 }));
    const sorted = [...entries].sort((a, b) => b.score - a.score);
    const top = sorted[0]!;
    const title = top.score === 0 ? "Ninguém pontuou. Revanche?" : sorted[1] && sorted[1].score === top.score ? "Empate no topo!" : `${top.name} levou!`;
    return (
      <>
        <h1 className="text-center">{title}</h1>
        <Podium entries={entries} />
        {sorted.length > 3 && <Scoreboard players={s.players} scores={s.scores} skip={3} />}
        {footer}
      </>
    );
  }
  const avg = (id: string) => {
    const d = s.distances[id] ?? [];
    return d.length ? d.reduce((a, b) => a + b, 0) / d.length : 0;
  };
  const ranked = [...s.players].sort((a, b) => avg(a.id) - avg(b.id));
  const aligned = ranked[0]!;
  const contrarian = ranked[ranked.length - 1]!;
  return (
    <>
      <h1 className="text-center">Fim das situações</h1>
      <div className="grid gap-2.5">
        <div className="card flex items-center gap-3.5 rounded-[20px] p-4">
          <Piece kind={aligned.piece} mood="happy" size={56} alive />
          <div>
            <div className="text-[13.5px] font-semibold text-[var(--fg-2)]">Mais alinhado com a turma</div>
            <div className="font-display text-xl font-black">{aligned.name}</div>
          </div>
        </div>
        <div className="card flex items-center gap-3.5 rounded-[20px] p-4">
          <Piece kind={contrarian.piece} mood="sus" size={56} alive />
          <div>
            <div className="text-[13.5px] font-semibold text-[var(--fg-2)]">Do contra</div>
            <div className="font-display text-xl font-black">{contrarian.name}</div>
          </div>
        </div>
      </div>
      <ol className="grid gap-2">
        {s.history.map((h, i) => (
          <li key={i} className="card grid grid-cols-[1fr_auto] items-center gap-3 rounded-[18px] px-4 py-3">
            <span>{h.prompt}</span>
            <span className="num text-2xl">{fmt(h.mean ?? 0)}</span>
          </li>
        ))}
      </ol>
      {footer}
    </>
  );
}
