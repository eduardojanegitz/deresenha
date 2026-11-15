"use client";

import { Piece } from "@/brand/Piece";
import type { Player } from "@/engine/core";
import type { PrefereView } from "@/engine/prefere";
import { Dilemma, PrefereEnd, PrefereSplit } from "@/games/prefere/PrefereGame";
import type { RoomView } from "@/rooms/room";
import { ErrorNote, PhaseStage, Progress, useTone } from "@/ui/play";
import { useSound } from "@/ui/sound";
import type { Room } from "./RoomScreen";

/**
 * Você Prefere? com cada um no seu celular: a escolha é feita no próprio aparelho, fica
 * no servidor até a revelação e tudo aparece junto quando todos os presentes escolhem.
 */
export function PrefereRoom({ view, room }: { view: RoomView; room: Room }) {
  const s = (view.match as { game: "voce-prefere"; state: PrefereView }).state;
  const amHost = view.me === view.hostId;
  const hostName = view.players.find((p) => p.id === view.hostId)?.nickname ?? "quem comanda";
  const P = (id: string) => s.players.find((p) => p.id === id) ?? ({ id, name: "?", piece: "bolota" } as Player);
  const offline = new Set(view.players.filter((p) => p.left || !p.online).map((p) => p.id));
  const { play } = useSound();
  useTone(s.phase === "reveal" ? "noite" : null);
  const game = (action: { type: "choose"; choice: "a" | "b" } | { type: "swap" } | { type: "reveal" } | { type: "next" }) => room.act({ type: "game", action });

  let body: React.ReactNode;
  switch (s.phase) {
    case "question":
    case "vote": {
      const mine = s.myVote;
      const option = (c: "a" | "b") => {
        const text = c === "a" ? s.dilemma.a : s.dilemma.b;
        const chosen = mine === c;
        const st = c === "a" ? { bg: "var(--color-chiclete)", d: "var(--color-chiclete-d)" } : { bg: "var(--color-ceu)", d: "var(--color-ceu-d)" };
        return (
          <button
            key={c}
            role="radio"
            aria-checked={chosen}
            disabled={room.pending}
            onClick={() => game({ type: "choose", choice: c }).then((ok) => ok && play("confirm"))}
            className="font-display min-h-[96px] rounded-[24px] p-5 text-left text-[clamp(20px,5.6vw,26px)] leading-tight font-black text-[var(--color-tinta)] transition-[transform,opacity] active:translate-y-1"
            style={{ background: st.bg, boxShadow: chosen ? `inset 0 0 0 4px var(--color-tinta), 0 5px 0 ${st.d}` : `0 5px 0 ${st.d}`, opacity: mine && !chosen ? 0.5 : 1 }}
          >
            {text}
          </button>
        );
      };
      body = (
        <>
          <Progress round={s.round} total={s.config.rounds} />
          <h1 className="text-center">Você prefere…</h1>
          {mine ? (
            <div className="relative grid gap-3" role="radiogroup" aria-label="Sua escolha">
              {option("a")}
              {option("b")}
            </div>
          ) : (
            <div className="grid gap-3">
              <Dilemma a={s.dilemma.a} b={s.dilemma.b} />
              <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Sua escolha">
                <button className="btn btn-rosa" disabled={room.pending} onClick={() => game({ type: "choose", choice: "a" }).then((ok) => ok && play("confirm"))}>
                  A primeira
                </button>
                <button className="btn" style={{ ["--c" as string]: "var(--color-ceu)", ["--cd" as string]: "var(--color-ceu-d)", ["--t" as string]: "var(--color-tinta)" }} disabled={room.pending} onClick={() => game({ type: "choose", choice: "b" }).then((ok) => ok && play("confirm"))}>
                  A segunda
                </button>
              </div>
            </div>
          )}
          <p className="muted text-center text-[15px]" role="status">
            {mine ? "Escolha registrada. Dá para trocar até todo mundo escolher." : "Sua escolha é secreta até a revelação."}
          </p>
          <ul className="flex flex-wrap justify-center gap-2" aria-label="Quem já escolheu">
            {s.players.map((p) => {
              const ok = s.voted.includes(p.id);
              return (
                <li key={p.id} className={`inline-flex items-center gap-1.5 rounded-full border-2 bg-[var(--card)] py-[3px] pr-3 pl-1 font-semibold ${ok ? "border-[var(--color-ok)]" : "border-[var(--line)]"} ${offline.has(p.id) ? "opacity-50" : ""}`}>
                  <Piece kind={p.piece} size={26} />
                  {p.name}
                  <span className={`font-display text-[13px] font-extrabold ${ok ? "text-[var(--color-ok)]" : "text-[var(--fg-2)]"}`}>{ok ? "escolheu" : offline.has(p.id) ? "sem sinal" : "…"}</span>
                </li>
              );
            })}
          </ul>
          {amHost && (
            <div className="grid gap-1.5">
              {s.voted.length > 0 && s.voted.length < s.players.length && (
                <button className="btn btn-ghost" onClick={() => game({ type: "reveal" }).then((ok) => ok && play("reveal"))}>
                  Revelar com quem já escolheu
                </button>
              )}
              {s.voted.length === 0 && (
                <button className="py-2.5 text-[15px] font-semibold text-[var(--fg-2)] underline underline-offset-4" onClick={() => game({ type: "swap" })}>
                  Trocar o dilema
                </button>
              )}
            </div>
          )}
        </>
      );
      break;
    }

    case "reveal":
      body = (
        <div className="grid gap-5">
          <PrefereSplit dilemma={s.dilemma} votes={s.votes ?? {}} players={s.players} />
          {amHost ? (
            <button className="btn btn-gema" onClick={() => game({ type: "next" }).then((ok) => ok && play(s.round >= s.config.rounds ? "win" : "tap"))}>
              {s.round >= s.config.rounds ? "Ver resumo" : "Próximo dilema"}
            </button>
          ) : (
            <p className="py-2 text-center text-[#A9C9BC]">Esperando {hostName} passar para o próximo.</p>
          )}
        </div>
      );
      break;

    case "end":
      body = (
        <PrefereEnd
          s={s}
          actions={
            amHost ? (
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
            )
          }
        />
      );
      break;
  }

  return (
    <>
      <PhaseStage phaseKey={`${s.round}-${s.phase}`}>
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
