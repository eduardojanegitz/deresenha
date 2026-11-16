"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Piece } from "@/brand/Piece";
import { themeLabel } from "@/content/library";
import { sortMentiraThemes } from "@/content/mentira";
import type { MentiraChallenge } from "@/content/types";
import { useGameContent, useThemeIds } from "@/content/useGameContent";
import type { Player } from "@/engine/core";
import { createMentira, DEFAULT_MENTIRA_CONFIG, MENTIRA_MIN, reduceMentira, votersOf, type MentiraAction, type MentiraConfig, type MentiraState, type MentiraVote } from "@/engine/mentira";
import { EndActions, MatchFrame, SetupShell, Unavailable, type NightLink } from "@/ui/frame";
import { PlayersEditor, toPlayers, usePlayerNames } from "@/ui/players";
import { ChipGroup, ErrorNote, HoldToReveal, PassPhone, PhaseStage, Podium, Progress, PromptCard, RestOfPodium, Stepper, useEngine, useTone, Who } from "@/ui/play";
import { useSound } from "@/ui/sound";

export function MentiraGame() {
  const [names, setNames] = usePlayerNames();
  const [config, setConfig] = useState<MentiraConfig>(DEFAULT_MENTIRA_CONFIG);
  const content = useGameContent("mentira");
  const ids = useThemeIds(content.challenges, content.themes);
  const all = useMemo(() => sortMentiraThemes(ids), [ids]);
  const [themes, setThemes] = useState<string[]>(all);
  useEffect(() => setThemes(all), [all]);
  const [match, setMatch] = useState<{ key: number; players: Player[]; pool: MentiraChallenge[] } | null>(null);
  const start = () => setMatch({ key: Date.now(), players: toPlayers(names), pool: content.challenges.filter((c) => themes.includes(c.theme)) });

  if (content.settings && !content.settings.enabled) return <Unavailable />;
  if (match) return <MentiraMatch key={match.key} config={config} players={match.players} pool={match.pool} onRematch={start} onSetup={() => setMatch(null)} />;

  return (
    <SetupShell title="Mentira Sincera" subtitle="Na sua vez, o app diz em segredo se você conta a verdade ou inventa. A turma tenta descobrir." canStart={names.length >= MENTIRA_MIN} onStart={start} hint={`Precisa de pelo menos ${MENTIRA_MIN} pessoas.`}>
      <PlayersEditor names={names} onChange={setNames} min={MENTIRA_MIN} />
      <ChipGroup
        label="Temas"
        multi
        options={all.map((id) => ({ value: id, label: themeLabel(id) }))}
        value={themes}
        onToggle={(id) => setThemes((t) => (t.includes(id) ? (t.length === 1 ? t : t.filter((x) => x !== id)) : [...t, id]))}
      />
      <Stepper label="Histórias por pessoa" value={config.turns} min={1} max={3} onChange={(turns) => setConfig((c) => ({ ...c, turns }))} />
    </SetupShell>
  );
}

export function MentiraMatch({ config, players, pool, onRematch, onSetup, night }: { config: MentiraConfig; players: Player[]; pool: MentiraChallenge[]; onRematch: () => void; onSetup: () => void; night?: NightLink }) {
  const { state: s, dispatch, error } = useEngine<MentiraState, MentiraAction>(() => createMentira(config, players, pool, Math.random), (st, a, rng) => reduceMentira(st, a, pool, rng));
  const { play } = useSound();
  const [peeking, setPeeking] = useState(false);
  useTone(s.phase === "reveal" ? "noite" : null);
  useEffect(() => setPeeking(false), [s.round]);
  const P = (id: string) => s.players.find((p) => p.id === id)!;
  const teller = P(s.tellerId);
  const voters = votersOf(s);

  let body: React.ReactNode;
  switch (s.phase) {
    case "secret":
      body = !peeking ? (
        <PassPhone player={teller} note="Só essa pessoa olha a próxima tela: ela vai ver a pergunta e a missão secreta." onReady={() => setPeeking(true)} />
      ) : (
        <>
          <Progress round={s.round} total={s.totalRounds} label="História" />
          <PromptCard tag={themeLabel(s.prompt.theme)} text={s.prompt.text} />
          <HoldToReveal secret={<Mission truth={s.truth} />} srText={s.truth ? "Sua missão: contar a verdade." : "Sua missão: inventar uma mentira."} onPeek={() => s.seen || dispatch({ type: "seen", playerId: teller.id })} />
          <div className="grid gap-1.5">
            <button className="btn" disabled={!s.seen} onClick={() => dispatch({ type: "start-telling" }) && play("start")}>
              {s.seen ? "Pronto, vou contar" : "Segure para ver a missão"}
            </button>
            <button className="py-2.5 text-[15px] font-semibold text-[var(--fg-2)] underline underline-offset-4" onClick={() => dispatch({ type: "swap" })}>
              Não tenho história para essa. Trocar a pergunta
            </button>
          </div>
        </>
      );
      break;

    case "tell":
      body = (
        <>
          <Progress round={s.round} total={s.totalRounds} label="História" />
          <Who player={teller} caption="Quem conta agora" mood="sus" />
          <PromptCard tag={themeLabel(s.prompt.theme)} text={s.prompt.text} flip />
          <TellTips />
          <button className="btn btn-gema" onClick={() => dispatch({ type: "open-vote" }) && play("tap")}>
            Terminou de contar. Votar
          </button>
        </>
      );
      break;

    case "vote": {
      const done = Object.keys(s.votes).length;
      body = (
        <>
          <Progress round={s.round} total={s.totalRounds} label="História" />
          <h1 className="text-center">Verdade ou mentira?</h1>
          <p className="muted text-center">No três, todo mundo mostra o polegar: para cima é verdade, para baixo é mentira. Depois, marque o voto de cada um.</p>
          <ul className="grid gap-2.5" aria-label="Votos">
            {voters.map((p) => (
              <li key={p.id} className="card flex items-center gap-2.5 rounded-[20px] py-2 pr-2 pl-3">
                <Piece kind={p.piece} size={34} />
                <b className="min-w-0 flex-1 truncate">{p.name}</b>
                <VoteToggle value={s.votes[p.id] ?? null} onPick={(choice) => dispatch({ type: "vote", playerId: p.id, choice }) && play("confirm")} compact />
              </li>
            ))}
          </ul>
          <button className={`btn ${done === voters.length ? "btn-gema" : ""}`} disabled={done < voters.length} onClick={() => dispatch({ type: "reveal" }) && play("reveal")}>
            {done === voters.length ? "Revelar a missão" : `Faltam ${voters.length - done}`}
          </button>
        </>
      );
      break;
    }

    case "reveal":
      body = (
        <>
          <Progress round={s.round} total={s.totalRounds} label="História" />
          <MentiraReveal truth={s.truth} teller={teller} voters={voters} votes={s.votes} gained={s.gained} />
          <button className="btn btn-gema" onClick={() => dispatch({ type: "next" }) && play(s.round >= s.totalRounds ? "win" : "tap")}>
            {s.round >= s.totalRounds ? "Ver o resultado" : "Próxima história"}
          </button>
        </>
      );
      break;

    case "end":
      body = <MentiraEnd s={s} actions={<EndActions onRematch={onRematch} onSetup={onSetup} night={night} result={{ game: "mentira", gameName: "Mentira Sincera", scored: true, unit: "pts", players: s.players.map((p) => ({ id: p.id, name: p.name, score: s.scores[p.id] ?? 0 })) }} />} />;
      break;
  }

  return (
    <MatchFrame onExit={onSetup}>
      <PhaseStage phaseKey={`${s.round}-${s.phase}-${peeking}`}>
        {body}
        <ErrorNote message={error} />
      </PhaseStage>
    </MatchFrame>
  );
}

/* ---------- peças compartilhadas com o Modo Sala ---------- */

/** A missão secreta, como um carimbo. */
export function Mission({ truth, size = "md" }: { truth: boolean; size?: "sm" | "md" }) {
  return (
    <div className="grid justify-items-center gap-2 text-center">
      <span className="text-[13px] font-bold opacity-75">Sua missão</span>
      <span
        className={`font-display -rotate-3 rounded-2xl border-[4px] px-3 py-1 leading-none font-black tracking-wide ${size === "sm" ? "text-[26px]" : "text-[clamp(30px,9vw,40px)]"}`}
        style={{ color: truth ? "#0d6b4c" : "#b3123d", borderColor: truth ? "#0d6b4c" : "#b3123d" }}
      >
        {truth ? "VERDADE" : "MENTIRA"}
      </span>
      <span className="text-[14px] leading-snug font-semibold">{truth ? "Conte uma história que aconteceu de verdade." : "Invente uma história e conte como se fosse real."}</span>
    </div>
  );
}

export function TellTips() {
  return (
    <ul className="grid gap-1.5 text-[15px] text-[var(--fg-2)]">
      <li>• A turma pode interromper e fazer perguntas sobre os detalhes.</li>
      <li>• Cara de paisagem: quem conta não pode rir nem entregar.</li>
    </ul>
  );
}

export function VoteToggle({ value, onPick, disabled = false, compact = false }: { value: MentiraVote | null; onPick: (v: MentiraVote) => void; disabled?: boolean; compact?: boolean }) {
  const opt = (v: MentiraVote) => {
    const on = value === v;
    const st = v === "verdade" ? { bg: "var(--color-menta)", d: "var(--color-menta-d)" } : { bg: "var(--color-chiclete)", d: "var(--color-chiclete-d)" };
    return (
      <button
        key={v}
        role="radio"
        aria-checked={on}
        disabled={disabled}
        onClick={() => onPick(v)}
        className={`font-display rounded-[16px] font-extrabold text-[var(--color-tinta)] transition-[transform,opacity] active:translate-y-1 ${compact ? "min-h-[46px] px-3 text-[15px]" : "min-h-[96px] px-4 text-[24px]"}`}
        style={{ background: st.bg, boxShadow: on ? `inset 0 0 0 3px var(--color-tinta), 0 4px 0 ${st.d}` : `0 4px 0 ${st.d}`, opacity: value && !on ? 0.45 : 1 }}
      >
        {v === "verdade" ? "👍 Verdade" : "👎 Mentira"}
      </button>
    );
  };
  return (
    <div className={`grid grid-cols-2 ${compact ? "gap-1.5" : "gap-3"}`} role="radiogroup" aria-label="Verdade ou mentira">
      {opt("verdade")}
      {opt("mentira")}
    </div>
  );
}

/** Revelação: o carimbo da missão, quem caiu e quem desconfiou. */
export function MentiraReveal({ truth, teller, voters, votes, gained }: { truth: boolean; teller: Player; voters: Player[]; votes: Record<string, MentiraVote>; gained: Record<string, number> }) {
  const reduce = useReducedMotion();
  const right: MentiraVote = truth ? "verdade" : "mentira";
  const hit = voters.filter((p) => votes[p.id] === right);
  const fell = voters.filter((p) => votes[p.id] !== undefined && votes[p.id] !== right);
  const fooled = gained[teller.id] ?? 0;
  const verdict = Object.keys(votes).length === 0 ? `${teller.name} não chegou a contar.` : fell.length === 0 ? "Ninguém caiu!" : hit.length === 0 ? `${teller.name} enganou todo mundo!` : `${teller.name} enganou ${fell.length} ${fell.length === 1 ? "pessoa" : "pessoas"}`;
  const group = (title: string, list: Player[], mood: "happy" | "sad") =>
    list.length > 0 && (
      <div className="grid gap-2">
        <b className="font-display text-[15px] font-extrabold text-[var(--fg-2)]">{title}</b>
        <ul className="flex flex-wrap gap-1.5">
          {list.map((p) => (
            <li key={p.id} className="inline-flex items-center gap-1 rounded-full bg-[var(--card)] py-0.5 pr-2.5 pl-1 text-sm font-semibold">
              <Piece kind={p.piece} size={24} mood={mood} />
              {p.name}
              {mood === "happy" && <span className="num text-[13px]">+{gained[p.id] ?? 0}</span>}
            </li>
          ))}
        </ul>
      </div>
    );
  return (
    <div className="grid gap-6">
      <div className="grid justify-items-center gap-4 pt-2 text-center">
        <Piece kind={teller.piece} mood={fell.length > 0 ? "happy" : "sad"} size={84} alive />
        <span className="text-[15px] font-semibold text-[var(--fg-2)]">A história de {teller.name} era</span>
        <motion.span
          className="font-display rounded-[20px] border-[5px] px-5 py-1.5 text-[clamp(40px,13vw,64px)] leading-none font-black tracking-wide"
          style={{ color: truth ? "var(--color-menta)" : "var(--color-chiclete)", borderColor: truth ? "var(--color-menta)" : "var(--color-chiclete)" }}
          initial={reduce ? false : { scale: 2.6, rotate: -18, opacity: 0 }}
          animate={{ scale: 1, rotate: -4, opacity: 1 }}
          transition={{ type: "spring", stiffness: 520, damping: 18, delay: 0.35 }}
          role="status"
        >
          {truth ? "VERDADE" : "MENTIRA"}
        </motion.span>
      </div>
      <motion.div className="grid gap-5" initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduce ? 0 : 1 }}>
        <h2 className="text-center text-[clamp(22px,6vw,30px)]">
          {verdict}
          {fooled > 0 && <span className="num ml-2 text-[var(--color-gema)]">+{fooled}</span>}
        </h2>
        {group("Sacaram tudo", hit, "happy")}
        {group(truth ? "Acharam que era mentira" : "Caíram na história", fell, "sad")}
      </motion.div>
    </div>
  );
}

export function MentiraEnd({ s, actions }: { s: Pick<MentiraState, "players" | "scores" | "fooled" | "hits">; actions: React.ReactNode }) {
  const entries = s.players.map((p) => ({ id: p.id, name: p.name, piece: p.piece, score: s.scores[p.id] ?? 0 }));
  const sorted = [...entries].sort((a, b) => b.score - a.score);
  const best = (rec: Record<string, number>) => {
    const max = Math.max(0, ...s.players.map((p) => rec[p.id] ?? 0));
    return max === 0 ? null : { list: s.players.filter((p) => (rec[p.id] ?? 0) === max), max };
  };
  const liar = best(s.fooled);
  const detector = best(s.hits);
  const award = (title: string, b: { list: Player[]; max: number } | null, note: (n: number) => string, mood: "happy" | "sus") =>
    b && (
      <div className="card flex items-center gap-3.5 rounded-[20px] p-4">
        <Piece kind={b.list[0]!.piece} mood={mood} size={52} alive />
        <div>
          <div className="text-[13.5px] font-semibold text-[var(--fg-2)]">{title}</div>
          <div className="font-display text-xl font-black">{b.list.map((p) => p.name).join(" e ")}</div>
          <div className="muted text-[14px]">{note(b.max)}</div>
        </div>
      </div>
    );
  return (
    <>
      <h1 className="text-center">{sorted[0]!.score === 0 ? "Ninguém pontuou" : sorted[1]?.score === sorted[0]!.score ? "Empate no topo!" : `${sorted[0]!.name} levou!`}</h1>
      <Podium entries={entries} />
      <RestOfPodium entries={entries} />
      {award("Cara de pau da noite", liar, (n) => `enganou ${n} ${n === 1 ? "vez" : "vezes"}`, "sus")}
      {award("Detector de mentira", detector, (n) => `acertou ${n} ${n === 1 ? "vez" : "vezes"}`, "happy")}
      {actions}
    </>
  );
}
