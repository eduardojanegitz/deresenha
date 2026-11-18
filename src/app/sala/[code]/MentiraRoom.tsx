"use client";

import { useEffect, useRef } from "react";
import { Piece } from "@/brand/Piece";
import { themeLabel } from "@/content/library";
import type { Player } from "@/engine/core";
import type { MentiraView, MentiraVote } from "@/engine/mentira";
import { MentiraEnd, MentiraReveal, Mission, TellTips, VoteToggle } from "@/games/mentira/MentiraGame";
import type { RoomView } from "@/rooms/room";
import { ErrorNote, PhaseStage, Progress, PromptCard, useTone, Who } from "@/ui/play";
import { useSound } from "@/ui/sound";
import type { Room } from "./RoomScreen";

type Act = { type: "seen" } | { type: "swap" } | { type: "start-telling" } | { type: "open-vote" } | { type: "choose"; choice: MentiraVote } | { type: "reveal" } | { type: "next" };

/**
 * Mentira Sincera com cada um no seu celular: a missão chega só no celular de quem conta,
 * os votos ficam no servidor e a revelação acontece quando todos os presentes votam.
 */
export function MentiraRoom({ view, room }: { view: RoomView; room: Room }) {
  const s = (view.match as { game: "mentira"; state: MentiraView }).state;
  const amHost = view.me === view.hostId;
  const amTeller = view.me === s.tellerId;
  const hostName = view.players.find((p) => p.id === view.hostId)?.nickname ?? "quem comanda";
  const offline = new Set(view.players.filter((p) => p.left || !p.online).map((p) => p.id));
  const P = (id: string) => s.players.find((p) => p.id === id) ?? ({ id, name: "?", piece: "bolota" } as Player);
  const teller = P(s.tellerId);
  const voters = s.players.filter((p) => p.id !== s.tellerId);
  const { play } = useSound();
  useTone(s.phase === "reveal" ? "noite" : null);
  const game = (action: Act) => room.act({ type: "game", action });

  // Quem conta vê a missão assim que a tela abre no celular dele.
  const sentSeen = useRef("");
  useEffect(() => {
    const key = `${s.round}`;
    if (amTeller && s.phase === "secret" && !s.seen && sentSeen.current !== key) {
      sentSeen.current = key;
      void room.act({ type: "game", action: { type: "seen" } }, { quiet: true });
    }
  }, [amTeller, s.phase, s.seen, s.round, room]);

  let body: React.ReactNode;
  switch (s.phase) {
    case "secret":
      body = amTeller ? (
        <>
          <Progress round={s.round} total={s.totalRounds} label="História" />
          <h1>Sua vez de contar</h1>
          <PromptCard tag={themeLabel(s.prompt.theme)} text={s.prompt.text} />
          <div className="rounded-[26px] bg-[var(--color-gema)] p-5 text-[var(--color-tinta)] shadow-[0_6px_0_var(--color-gema-d)]">{s.truth !== null && <Mission truth={s.truth} />}</div>
          <p className="muted text-center text-[15px]">Só você está vendo isso. Pense na história com calma antes de começar.</p>
          <div className="grid gap-1.5">
            <button className="btn" disabled={room.pending || !s.seen} onClick={() => game({ type: "start-telling" }).then((ok) => ok && play("start"))}>
              Pronto, vou contar
            </button>
            <button className="py-2.5 text-[15px] font-semibold text-[var(--fg-2)] underline underline-offset-4" onClick={() => game({ type: "swap" })}>
              Não tenho história para essa. Trocar a pergunta
            </button>
          </div>
        </>
      ) : (
        <div className="grid gap-5">
          <Progress round={s.round} total={s.totalRounds} label="História" />
          <div className="grid justify-items-center gap-5 pt-4 text-center">
          <Piece kind={teller.piece} mood="sus" size={96} alive />
          <h1 className="text-[clamp(26px,7vw,36px)]">{teller.name} está vendo a missão secreta</h1>
          <p className="muted max-w-[32ch]">Verdade ou mentira? Fique de olho na cara de {teller.name} quando a história começar.</p>
          </div>
        </div>
      );
      break;

    case "tell":
      body = (
        <>
          <Progress round={s.round} total={s.totalRounds} label="História" />
          <Who player={teller} caption={amTeller ? "Você está contando" : "Quem conta agora"} mood="sus" />
          <PromptCard tag={themeLabel(s.prompt.theme)} text={s.prompt.text} flip />
          {amTeller && s.truth !== null && (
            <p className="text-center text-[15px] font-semibold">
              Lembrete: sua missão é <b>{s.truth ? "contar a verdade" : "inventar uma mentira"}</b>.
            </p>
          )}
          <TellTips />
          {amTeller || amHost ? (
            <button className="btn btn-gema" disabled={room.pending} onClick={() => game({ type: "open-vote" }).then((ok) => ok && play("tap"))}>
              {amTeller ? "Terminei de contar. Abrir a votação" : "Terminou de contar. Abrir a votação"}
            </button>
          ) : (
            <p className="muted py-2 text-center">Quando {teller.name} terminar, a votação abre aqui.</p>
          )}
        </>
      );
      break;

    case "vote":
      body = (
        <>
          <Progress round={s.round} total={s.totalRounds} label="História" />
          <h1 className="text-center">{amTeller ? "A turma está votando" : "Verdade ou mentira?"}</h1>
          <PromptCard tag={`História de ${teller.name}`} text={s.prompt.text} />
          {amTeller ? (
            <p className="muted text-center">Segura a cara de paisagem até a revelação.</p>
          ) : (
            <>
              <VoteToggle value={s.myVote} disabled={room.pending} onPick={(choice) => game({ type: "choose", choice }).then((ok) => ok && play("confirm"))} />
              <p className="muted text-center text-[15px]" role="status">
                {s.myVote ? "Voto registrado. Dá para trocar até todo mundo votar." : "Seu voto é secreto até a revelação."}
              </p>
            </>
          )}
          <ul className="flex flex-wrap justify-center gap-2" aria-label="Quem já votou">
            {voters.map((p) => {
              const ok = s.voted.includes(p.id);
              return (
                <li key={p.id} className={`inline-flex items-center gap-1.5 rounded-full border-2 bg-[var(--card)] py-[3px] pr-3 pl-1 font-semibold ${ok ? "border-[var(--color-ok)]" : "border-[var(--line)]"} ${offline.has(p.id) ? "opacity-50" : ""}`}>
                  <Piece kind={p.piece} size={26} />
                  {p.name}
                  <span className={`font-display text-[13px] font-extrabold ${ok ? "text-[var(--color-ok)]" : "text-[var(--fg-2)]"}`}>{ok ? "votou" : offline.has(p.id) ? "sem sinal" : "…"}</span>
                </li>
              );
            })}
          </ul>
          {amHost && s.voted.length > 0 && s.voted.length < voters.length && (
            <button className="btn btn-ghost" onClick={() => game({ type: "reveal" })}>
              Revelar com quem já votou
            </button>
          )}
        </>
      );
      break;

    case "reveal":
      body = (
        <>
          <Progress round={s.round} total={s.totalRounds} label="História" />
          <MentiraReveal truth={!!s.truth} teller={teller} voters={voters} votes={s.votes ?? {}} gained={s.gained} />
          {amHost ? (
            <button className="btn btn-gema" onClick={() => game({ type: "next" }).then((ok) => ok && play(s.round >= s.totalRounds ? "win" : "tap"))}>
              {s.round >= s.totalRounds ? "Ver o resultado" : "Próxima história"}
            </button>
          ) : (
            <p className="py-2 text-center text-[#A9C9BC]">Esperando {hostName} passar a vez.</p>
          )}
        </>
      );
      break;

    case "end":
      body = (
        <MentiraEnd
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
