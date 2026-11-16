"use client";

import { Piece } from "@/brand/Piece";
import type { Player } from "@/engine/core";
import { formatNumber, type LimiteView } from "@/engine/limite";
import { GuessForm, LimiteEnd, LimiteQuestion, LimiteReveal } from "@/games/limite/LimiteGame";
import type { RoomView } from "@/rooms/room";
import { ErrorNote, PhaseStage, Progress, useTone } from "@/ui/play";
import { useSound } from "@/ui/sound";
import type { Room } from "./RoomScreen";

/**
 * Jogo do Limite com cada um no seu celular: o chute fica no servidor até a revelação, que
 * acontece sozinha quando todos os presentes chutam (ou quando quem comanda decide).
 */
export function LimiteRoom({ view, room }: { view: RoomView; room: Room }) {
  const s = (view.match as { game: "limite"; state: LimiteView }).state;
  const amHost = view.me === view.hostId;
  const hostName = view.players.find((p) => p.id === view.hostId)?.nickname ?? "quem comanda";
  const offline = new Set(view.players.filter((p) => p.left || !p.online).map((p) => p.id));
  const { play } = useSound();
  useTone(s.phase === "reveal" ? "noite" : null);
  const game = (action: { type: "guess"; value: number } | { type: "swap" } | { type: "reveal" } | { type: "next" }) => room.act({ type: "game", action });

  let body: React.ReactNode;
  switch (s.phase) {
    case "guess": {
      const mine = s.myGuess;
      body = (
        <>
          <Progress round={s.round} total={s.config.rounds} label="Pergunta" />
          <LimiteQuestion theme={s.item.theme} question={s.item.question} />
          <GuessForm
            key={`${s.round}-${s.item.question}`}
            unit={s.item.unit}
            initial={mine}
            disabled={room.pending}
            submitLabel={mine === null ? "Confirmar chute" : "Trocar o chute"}
            onSubmit={(value) => game({ type: "guess", value }).then((ok) => ok && play("confirm"))}
          />
          {mine !== null && (
            <p className="text-center text-[15px] font-semibold text-[var(--color-ok)]" role="status">
              Seu chute: {formatNumber(mine)}
              {s.item.unit ? ` ${s.item.unit}` : ""}. Dá para trocar até todo mundo chutar.
            </p>
          )}
          <ul className="flex flex-wrap justify-center gap-2" aria-label="Quem já chutou">
            {s.players.map((p: Player) => {
              const ok = s.guessed.includes(p.id);
              return (
                <li key={p.id} className={`inline-flex items-center gap-1.5 rounded-full border-2 bg-[var(--card)] py-[3px] pr-3 pl-1 font-semibold ${ok ? "border-[var(--color-ok)]" : "border-[var(--line)]"} ${offline.has(p.id) ? "opacity-50" : ""}`}>
                  <Piece kind={p.piece} size={26} />
                  {p.name}
                  <span className={`font-display text-[13px] font-extrabold ${ok ? "text-[var(--color-ok)]" : "text-[var(--fg-2)]"}`}>{ok ? "chutou" : offline.has(p.id) ? "sem sinal" : "…"}</span>
                </li>
              );
            })}
          </ul>
          {amHost && (
            <div className="grid gap-1.5">
              {s.guessed.length > 0 && s.guessed.length < s.players.length && (
                <button className="btn btn-ghost" onClick={() => game({ type: "reveal" })}>
                  Revelar com quem já chutou
                </button>
              )}
              {s.guessed.length === 0 && (
                <button className="py-2.5 text-[15px] font-semibold text-[var(--fg-2)] underline underline-offset-4" onClick={() => game({ type: "swap" })}>
                  Trocar a pergunta
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
        <>
          <Progress round={s.round} total={s.config.rounds} label="Pergunta" />
          <LimiteReveal question={s.item.question} unit={s.item.unit} answer={s.item.answer ?? 0} fact={s.item.fact} guesses={s.guesses ?? {}} players={s.players} winners={s.winners} gained={s.gained} />
          {amHost ? (
            <button className="btn btn-gema" onClick={() => game({ type: "next" }).then((ok) => ok && play(s.round >= s.config.rounds ? "win" : "tap"))}>
              {s.round >= s.config.rounds ? "Ver o resultado" : "Próxima pergunta"}
            </button>
          ) : (
            <p className="py-2 text-center text-[#A9C9BC]">Esperando {hostName} passar para a próxima.</p>
          )}
        </>
      );
      break;

    case "end":
      body = (
        <LimiteEnd
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
