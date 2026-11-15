"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Piece } from "@/brand/Piece";
import { themeLabel } from "@/content/library";
import type { Player } from "@/engine/core";
import type { QuizView } from "@/engine/quiz";
import type { RoomView } from "@/rooms/room";
import { ErrorNote, PhaseStage, Podium, Progress, Scoreboard } from "@/ui/play";
import { useSound } from "@/ui/sound";
import { DeadlineRing, useDeadline, type Room } from "./RoomScreen";

/** Cores e marcas das alternativas: a forma ajuda quem não distingue bem as cores. */
const OPTION_STYLE = [
  { bg: "var(--color-gema)", shadow: "var(--color-gema-d)", mark: "●" },
  { bg: "var(--color-chiclete)", shadow: "var(--color-chiclete-d)", mark: "▲" },
  { bg: "var(--color-ceu)", shadow: "var(--color-ceu-d)", mark: "■" },
  { bg: "var(--color-menta)", shadow: "var(--color-menta-d)", mark: "◆" },
];

/**
 * Quiz Relâmpago: cada um responde no próprio celular. O servidor mede o tempo de cada
 * resposta e só manda a alternativa correta depois que a pergunta fecha.
 */
export function QuizRoom({ view, room }: { view: RoomView; room: Room }) {
  const s = (view.match as { game: "quiz"; state: QuizView }).state;
  const amHost = view.me === view.hostId;
  const hostName = view.players.find((p) => p.id === view.hostId)?.nickname ?? "quem comanda";
  const P = (id: string) => s.players.find((p) => p.id === id) ?? ({ id, name: "?", piece: "bolota" } as Player);
  const offline = new Set(view.players.filter((p) => p.left || !p.online).map((p) => p.id));
  const { play } = useSound();
  const reduce = useReducedMotion();
  useDeadline(view, room);
  const left = useQuestionClock(s, room);
  const game = (action: { type: "answer"; choice: number } | { type: "close" } | { type: "next" }) => room.act({ type: "game", action });
  const total = s.config.questions;

  let body: React.ReactNode;
  switch (s.phase) {
    case "question": {
      const mine = s.myAnswer?.choice;
      const done = mine !== undefined;
      body = (
        <>
          <div className="flex items-center justify-between gap-3">
            <Progress round={s.index} total={total} label="Pergunta" />
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
            <div className="grid gap-2">
              <span className="text-sm font-bold text-[var(--fg-2)]">{themeLabel(s.question.theme)}</span>
              <h1 className="text-[clamp(24px,6.4vw,32px)] leading-[1.15]">{s.question.text}</h1>
            </div>
            <div className="scale-[.8] sm:scale-100">
              <DeadlineRing left={left} total={s.config.seconds} />
            </div>
          </div>
          <div className="grid gap-3" role="radiogroup" aria-label="Alternativas">
            {s.question.options.map((opt, i) => {
              const st = OPTION_STYLE[i]!;
              const chosen = mine === i;
              return (
                <motion.button
                  key={`${s.index}-${i}`}
                  role="radio"
                  aria-checked={chosen}
                  disabled={done || left === 0 || room.pending}
                  initial={reduce ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: done && !chosen ? 0.45 : 1, y: 0 }}
                  transition={{ delay: reduce ? 0 : 0.06 * i, type: "spring", stiffness: 420, damping: 30 }}
                  onClick={() => game({ type: "answer", choice: i }).then((ok) => ok && play("confirm"))}
                  className="flex min-h-[64px] items-center gap-3 rounded-[20px] px-4 py-3 text-left text-[var(--color-tinta)] transition-transform active:translate-y-1 disabled:cursor-default"
                  style={{ background: st.bg, boxShadow: chosen ? `inset 0 0 0 3px var(--color-tinta), 0 5px 0 ${st.shadow}` : `0 5px 0 ${st.shadow}` }}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/55 text-[15px]" aria-hidden="true">
                    {st.mark}
                  </span>
                  <span className="font-display text-[19px] leading-tight font-extrabold">{opt}</span>
                </motion.button>
              );
            })}
          </div>
          <p className="muted text-center text-[15px]" role="status">
            {done ? "Resposta registrada. Não dá para mudar." : left === 0 ? "Tempo esgotado." : "Responda rápido: quanto antes, mais pontos."}
          </p>
          <AnsweredList ids={s.players.map((p) => p.id)} done={s.answered} P={P} offline={offline} />
          {amHost && s.answered.length > 0 && s.answered.length < s.players.length && (
            <button className="btn btn-ghost" onClick={() => game({ type: "close" })}>
              Fechar a pergunta agora
            </button>
          )}
        </>
      );
      break;
    }

    case "reveal": {
      const answers = s.answers ?? {};
      const right = s.question.answer!;
      const mine = answers[view.me];
      const gained = s.gained[view.me] ?? 0;
      body = (
        <>
          <Progress round={s.index} total={total} label="Pergunta" />
          <h1 className="text-[clamp(22px,5.6vw,28px)] leading-[1.2]">{s.question.text}</h1>
          <motion.div
            initial={reduce ? false : { scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="card flex items-center gap-3 rounded-[22px] p-4"
            role="status"
          >
            <Piece kind="capsula" mood={gained ? "happy" : mine ? "sad" : "sleep"} size={52} />
            <span className="grid">
              <b className="font-display text-2xl font-black">{gained ? `+${gained} pontos` : mine ? "Errou essa" : "Não respondeu"}</b>
              {mine && <span className="muted text-[15px]">Você respondeu em {(mine.ms / 1000).toFixed(1).replace(".", ",")} s</span>}
            </span>
          </motion.div>
          <ul className="grid gap-2.5" aria-label="Respostas da turma">
            {s.question.options.map((opt, i) => {
              const st = OPTION_STYLE[i]!;
              const who = s.players.filter((p) => answers[p.id]?.choice === i);
              const ok = i === right;
              return (
                <li
                  key={i}
                  className={`grid gap-2 rounded-[20px] px-4 py-3 ${ok ? "text-[var(--color-tinta)]" : "border-2 border-[var(--line)] bg-[var(--card)] opacity-75"}`}
                  style={ok ? { background: st.bg, boxShadow: `0 5px 0 ${st.shadow}` } : undefined}
                >
                  <span className="flex items-center gap-2.5">
                    <span aria-hidden="true">{st.mark}</span>
                    <b className="font-display flex-1 text-lg leading-tight font-extrabold">{opt}</b>
                    {ok && <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-[13px] font-bold">Correta</span>}
                  </span>
                  {who.length > 0 && (
                    <span className="flex flex-wrap gap-1.5">
                      {who.map((p) => (
                        <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-white/60 py-0.5 pr-2.5 pl-0.5 text-[14px] font-semibold text-[var(--color-tinta)]">
                          <Piece kind={p.piece} size={22} />
                          {p.name}
                          {ok && <span className="num text-[13px]">+{s.gained[p.id] ?? 0}</span>}
                        </span>
                      ))}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <Scoreboard players={s.players} scores={s.scores} unit="pts" />
          {amHost ? (
            <button className="btn btn-gema" onClick={() => game({ type: "next" }).then((ok) => ok && play(s.index >= total ? "win" : "start"))}>
              {s.index >= total ? "Ver o resultado" : "Próxima pergunta"}
            </button>
          ) : (
            <p className="muted py-2 text-center">Esperando {hostName} passar para a próxima.</p>
          )}
        </>
      );
      break;
    }

    case "end": {
      const entries = s.players.map((p) => ({ id: p.id, name: p.name, piece: p.piece, score: s.scores[p.id] ?? 0 }));
      const sorted = [...entries].sort((a, b) => b.score - a.score);
      body = (
        <>
          <h1 className="text-center">{sorted[0]!.score === 0 ? "Ninguém pontuou" : sorted[1]?.score === sorted[0]!.score ? "Empate no topo!" : `${sorted[0]!.name} levou!`}</h1>
          <Podium entries={entries} />
          <ul className="grid gap-2" aria-label="Acertos">
            {sorted.map((e) => (
              <li key={e.id} className="card flex items-center gap-3 rounded-[18px] px-3 py-2">
                <Piece kind={e.piece} size={32} />
                <b className="flex-1">{e.name}</b>
                <span className="muted text-[15px]">
                  {s.correct[e.id] ?? 0} de {total} certas
                </span>
                <span className="num">{e.score}</span>
              </li>
            ))}
          </ul>
          {amHost ? (
            <div className="mt-2 grid gap-2.5">
              <button className="btn btn-gema" onClick={() => room.act({ type: "back-to-lobby" })}>
                Jogar de novo com a turma
              </button>
              <button className="btn btn-ghost" onClick={() => room.act({ type: "close" })}>
                Encerrar a sala
              </button>
            </div>
          ) : (
            <p className="muted py-2 text-center">Esperando {hostName} decidir a revanche.</p>
          )}
        </>
      );
      break;
    }
  }

  return (
    <>
      <PhaseStage phaseKey={`${s.index}-${s.phase}`}>
        {body}
        <ErrorNote message={room.actionError} />
      </PhaseStage>
      {!amHost && view.players.find((p) => p.id === view.hostId && !p.online) && (
        <button className="btn btn-ghost mt-6" onClick={() => room.act({ type: "claim-host" })}>
          {hostName} está sem sinal. Assumir o comando
        </button>
      )}
    </>
  );
}

/** Segundos que faltam na pergunta, no relógio do servidor (sem a folga de rede). */
function useQuestionClock(s: QuizView, room: Room) {
  const end = s.startedAt + s.config.seconds * 1000;
  const calc = () => Math.max(0, Math.ceil((end - room.serverNow()) / 1000));
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    if (s.phase !== "question") return;
    setLeft(calc());
    const id = window.setInterval(() => setLeft(calc()), 200);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [end, s.phase]);
  return left;
}

function AnsweredList({ ids, done, P, offline }: { ids: string[]; done: string[]; P: (id: string) => Player; offline: Set<string> }) {
  return (
    <ul className="flex flex-wrap justify-center gap-2" aria-label="Quem já respondeu">
      {ids.map((id) => {
        const ok = done.includes(id);
        return (
          <motion.li key={id} layout animate={ok ? { scale: [1, 1.12, 1] } : {}} className={`inline-flex items-center gap-1.5 rounded-full border-2 bg-[var(--card)] py-[3px] pr-3 pl-1 font-semibold ${ok ? "border-[var(--color-ok)]" : "border-[var(--line)]"} ${offline.has(id) ? "opacity-50" : ""}`}>
            <Piece kind={P(id).piece} size={26} />
            {P(id).name}
            <span className={`font-display text-[13px] font-extrabold ${ok ? "text-[var(--color-ok)]" : "text-[var(--fg-2)]"}`}>{ok ? "respondeu" : offline.has(id) ? "sem sinal" : "…"}</span>
          </motion.li>
        );
      })}
    </ul>
  );
}
