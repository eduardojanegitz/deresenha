"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Piece } from "@/brand/Piece";
import { themeLabel } from "@/content/library";
import type { Player } from "@/engine/core";
import type { InfiltradoView } from "@/engine/infiltrado";
import { Reveal } from "@/games/infiltrado/InfiltradoGame";
import type { RoomView } from "@/rooms/room";
import { ErrorNote, PhaseStage, Podium, Progress, Scoreboard, useTone } from "@/ui/play";
import { useSound } from "@/ui/sound";
import type { Room } from "./RoomScreen";

/**
 * Infiltrado com cada um no seu celular: a palavra chega só para o dono, a votação é
 * secreta no próprio aparelho e o servidor apura quando todos os presentes votam.
 */
export function InfiltradoRoom({ view, room }: { view: RoomView; room: Room }) {
  const s = (view.match as { game: "infiltrado"; state: InfiltradoView }).state;
  const amHost = view.me === view.hostId;
  const hostName = view.players.find((p) => p.id === view.hostId)?.nickname ?? "quem comanda";
  const P = (id: string) => s.players.find((p) => p.id === id) ?? ({ id, name: "?", piece: "bolota" } as Player);
  const offline = new Set(view.players.filter((p) => p.left || !p.online).map((p) => p.id));
  const { play } = useSound();
  const reduce = useReducedMotion();
  const [showWord, setShowWord] = useState(false);
  const [choice, setChoice] = useState<string | null>(null);
  useTone(s.phase === "reveal" || (s.phase === "distribute" && showWord) ? "noite" : null);
  const game = (action: Parameters<Room["act"]>[0] extends infer A ? (A extends { type: "game"; action: infer G } ? G : never) : never, quiet = false) =>
    room.act({ type: "game", action }, { quiet });
  const waitHost = <p className="muted py-2 text-center">Esperando {hostName}.</p>;
  const order = (() => {
    const i = s.players.findIndex((p) => p.id === s.starterId);
    return [...s.players.slice(i), ...s.players.slice(0, i)];
  })();
  const iSaw = s.seen.includes(view.me);

  let body: React.ReactNode;
  switch (s.phase) {
    case "distribute":
      body = (
        <>
          <Progress round={s.round} total={s.config.rounds} />
          <div className="grid justify-items-center gap-4 text-center">
            <Piece kind="pino" mood="sus" size={56} alive />
            <h1 className="text-[clamp(26px,7vw,36px)]">Sua palavra</h1>
            <p className="muted max-w-[32ch]">Só você vê. Guarde bem: você pode ser o infiltrado sem saber.</p>
            <button
              className="grid aspect-[5/4] w-[min(80vw,300px)] place-items-center rounded-[28px] p-5 text-center"
              style={{ background: showWord ? "var(--color-gema)" : "var(--color-noite-2)", boxShadow: showWord ? "0 6px 0 var(--color-gema-d)" : "inset 0 0 0 3px #1E5A48" }}
              onClick={() => setShowWord((v) => !v)}
              aria-pressed={showWord}
              aria-label={showWord ? `Sua palavra é ${s.myWord}. Toque para esconder.` : "Toque para ver sua palavra"}
            >
              {showWord ? (
                <motion.span initial={reduce ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-display text-[clamp(32px,10vw,48px)] leading-tight font-black text-[var(--color-tinta)]">
                  {s.myWord}
                </motion.span>
              ) : (
                <span className="font-display text-lg font-extrabold text-[#7FA897]">Toque para ver</span>
              )}
            </button>
            <p className="muted text-[15px]">Tema: {themeLabel(s.theme)}</p>
          </div>
          {iSaw ? (
            <p className="muted text-center" role="status">
              Pronto. Esperando {s.players.length - s.seen.length} {s.players.length - s.seen.length === 1 ? "pessoa" : "pessoas"} verem a palavra.
            </p>
          ) : (
            <button
              className="btn btn-gema"
              onClick={() =>
                game({ type: "seen" }).then((ok) => {
                  if (ok) {
                    setShowWord(false);
                    play("confirm");
                  }
                })
              }
            >
              Já vi minha palavra
            </button>
          )}
          <SeenList ids={s.players.map((p) => p.id)} done={s.seen} P={P} offline={offline} label="Já viram" />
        </>
      );
      break;

    case "hints":
      body = (
        <>
          <Progress round={s.round} total={s.config.rounds} />
          <h1>Dicas{s.config.hintRounds > 1 ? `, volta ${s.hintRound} de ${s.config.hintRounds}` : ""}</h1>
          <p className="muted">Na ordem abaixo, cada um fala em voz alta uma palavra ou frase curta sobre a sua palavra.</p>
          <button className="card flex items-center justify-between rounded-[18px] px-4 py-3 text-left" onClick={() => setShowWord((v) => !v)} aria-pressed={showWord}>
            <span className="text-[15px] font-semibold text-[var(--fg-2)]">Sua palavra</span>
            <b className="font-display text-xl font-black">{showWord ? s.myWord : "Toque para ver"}</b>
          </button>
          <ol className="grid gap-2">
            {order.map((p, i) => (
              <li key={p.id} className={`card flex items-center gap-3 rounded-[18px] px-3 py-2 ${offline.has(p.id) ? "opacity-50" : ""}`}>
                <span className="num w-6 text-center text-[var(--fg-2)]">{i + 1}</span>
                <Piece kind={p.piece} size={36} />
                <b className="flex-1">
                  {p.name}
                  {p.id === view.me && <span className="muted font-normal"> (você)</span>}
                </b>
              </li>
            ))}
          </ol>
          {amHost ? (
            <div className="grid gap-2.5">
              {s.hintRound < s.config.hintRounds && (
                <button className="btn btn-ghost" onClick={() => game({ type: "next-hint-round" })}>
                  Mais uma volta de dicas
                </button>
              )}
              <button className="btn btn-gema" onClick={() => game({ type: "open-vote" }).then((ok) => ok && play("start"))}>
                Ir para a votação
              </button>
            </div>
          ) : (
            waitHost
          )}
        </>
      );
      break;

    case "vote": {
      const targets = s.players.filter((p) => p.id !== view.me && (!s.candidates || s.candidates.includes(p.id)));
      const voted = !!s.myVote;
      body = (
        <>
          <Progress round={s.round} total={s.config.rounds} />
          {s.wentToRevote && s.candidates && (
            <div className="card grid gap-1 rounded-[22px] p-4">
              <b className="font-display text-xl font-black">Deu empate!</b>
              <span className="muted">Desempate só entre {s.candidates.map((id) => P(id).name).join(" e ")}.</span>
            </div>
          )}
          <h1 className="text-[clamp(26px,7vw,36px)]">{voted ? "Voto registrado" : "Quem é o infiltrado?"}</h1>
          {voted ? (
            <p className="muted">
              Você votou em <b className="text-[var(--fg)]">{P(s.myVote!).name}</b>. Ninguém vê os votos antes da apuração.
            </p>
          ) : (
            <>
              <p className="muted">Seu voto é secreto.</p>
              <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Em quem votar">
                {targets.map((p) => (
                  <button key={p.id} role="radio" aria-checked={choice === p.id} onClick={() => setChoice(p.id)} className={`grid justify-items-center gap-2 rounded-[22px] border-[2.5px] bg-[var(--card)] p-4 ${choice === p.id ? "border-[var(--color-gema)] shadow-[inset_0_0_0_1.5px_var(--color-gema)]" : "border-[var(--line)]"}`}>
                    <Piece kind={p.piece} mood={choice === p.id ? "sus" : "neutral"} size={52} />
                    <b>{p.name}</b>
                  </button>
                ))}
              </div>
              <button className="btn btn-gema" disabled={!choice || room.pending} onClick={() => choice && game({ type: "vote", targetId: choice }).then((ok) => ok && play("confirm"))}>
                Confirmar voto
              </button>
            </>
          )}
          <SeenList ids={s.players.map((p) => p.id)} done={s.voted} P={P} offline={offline} label="Já votaram" />
          {amHost && s.voted.length > 0 && s.voted.length < s.players.length && (
            <button className="btn btn-ghost" onClick={() => game({ type: "close-vote" })}>
              Apurar com quem já votou
            </button>
          )}
        </>
      );
      break;
    }

    case "reveal":
      body = <Reveal s={s} P={P} canAdvance={amHost} onNext={() => game({ type: "next" }).then((ok) => ok && play(s.round >= s.config.rounds ? "win" : "tap"))} />;
      break;

    case "end": {
      const entries = s.players.map((p) => ({ id: p.id, name: p.name, piece: p.piece, score: s.scores[p.id] ?? 0 }));
      const sorted = [...entries].sort((a, b) => b.score - a.score);
      body = (
        <>
          <h1 className="text-center">{sorted[0]!.score === 0 ? "Ninguém pontuou" : sorted[1]?.score === sorted[0]!.score ? "Empate no topo!" : `${sorted[0]!.name} levou!`}</h1>
          <Podium entries={entries} />
          {sorted.length > 3 && <Scoreboard players={s.players.filter((p) => sorted.slice(3).some((x) => x.id === p.id))} scores={s.scores} />}
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
      <PhaseStage phaseKey={`${s.round}-${s.phase}-${s.wentToRevote}`}>
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

function SeenList({ ids, done, P, offline, label }: { ids: string[]; done: string[]; P: (id: string) => Player; offline: Set<string>; label: string }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label={label}>
      {ids.map((id) => {
        const ok = done.includes(id);
        return (
          <motion.li key={id} layout animate={ok ? { scale: [1, 1.1, 1] } : {}} className={`inline-flex items-center gap-1.5 rounded-full border-2 bg-[var(--card)] py-[3px] pr-3 pl-1 font-semibold ${ok ? "border-[var(--color-ok)]" : "border-[var(--line)]"} ${offline.has(id) ? "opacity-50" : ""}`}>
            <Piece kind={P(id).piece} size={28} />
            {P(id).name}
            <span className={`font-display text-[13px] font-extrabold ${ok ? "text-[var(--color-ok)]" : "text-[var(--fg-2)]"}`}>{ok ? "pronto" : offline.has(id) ? "sem sinal" : "…"}</span>
          </motion.li>
        );
      })}
    </ul>
  );
}
