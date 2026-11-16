"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import QRCode from "qrcode";
import { useEffect, useMemo, useRef, useState } from "react";
import { Piece } from "@/brand/Piece";
import { themeLabel } from "@/content/library";
import { sortLimiteThemes } from "@/content/limite";
import { sortMentiraThemes } from "@/content/mentira";
import { useGameContent } from "@/content/useGameContent";
import { PIECE_KINDS, type PieceKind, type Player } from "@/engine/core";
import { guessersOf } from "@/engine/nota";
import { EndPhase, RevealPhase } from "@/games/nota/NotaGame";
import { useRoom } from "@/rooms/client";
import { minPlayersFor, ROOM_GAMES, type RoomGame, type RoomMatchView, type RoomView } from "@/rooms/room";
import { InfiltradoRoom } from "./InfiltradoRoom";
import { LimiteRoom } from "./LimiteRoom";
import { MentiraRoom } from "./MentiraRoom";
import { PrefereRoom } from "./PrefereRoom";
import { QuizRoom } from "./QuizRoom";

import { ChipGroup, ErrorNote, NumberPad, PhaseStage, Progress, PromptCard, Scoreboard, Sheet, Stepper, Toggle, useTone, Who } from "@/ui/play";
import { useSound } from "@/ui/sound";
import { PiecePicker } from "../PiecePicker";

const GAME_NAME: Record<RoomGame, string> = { nota: "Jogo da Nota", infiltrado: "Infiltrado", quiz: "Quiz Relâmpago", "voce-prefere": "Você Prefere?", limite: "Jogo do Limite", mentira: "Mentira Sincera" };
const GAME_PIECE: Record<RoomGame, PieceKind> = { nota: "tijolo", infiltrado: "pino", quiz: "capsula", "voce-prefere": "bolota", limite: "meialua", mentira: "pino" };

export type Room = ReturnType<typeof useRoom>;

export function RoomScreen({ code }: { code: string }) {
  const room = useRoom(code);
  const { creds, view, fatal, conn } = room;

  if (fatal) return <Gone code={code} message={fatal.message} />;
  if (creds === undefined) return <Loading />;
  if (creds === null) return <JoinForm code={code} room={room} />;
  if (!view) return <Loading text={conn === "reconnecting" ? "Reconectando à sala…" : "Entrando na sala…"} />;
  if (view.status === "closed") return <Gone code={code} message="Quem comandava encerrou esta sala." closed />;

  return (
    <div className="mx-auto max-w-[560px] px-4 pt-1 pb-16">
      <ConnectionBanner conn={conn} />
      {view.status === "lobby" || !view.match ? (
        <Lobby view={view} room={room} />
      ) : view.match.game === "nota" ? (
        <NotaRoom view={view} room={room} />
      ) : view.match.game === "quiz" ? (
        <QuizRoom view={view} room={room} />
      ) : view.match.game === "voce-prefere" ? (
        <PrefereRoom view={view} room={room} />
      ) : view.match.game === "limite" ? (
        <LimiteRoom view={view} room={room} />
      ) : view.match.game === "mentira" ? (
        <MentiraRoom view={view} room={room} />
      ) : (
        <InfiltradoRoom view={view} room={room} />
      )}
    </div>
  );
}

/* ---------- estados de borda ---------- */

function Loading({ text = "Carregando…" }: { text?: string }) {
  return (
    <div className="grid min-h-[50vh] place-items-center" role="status">
      <div className="grid justify-items-center gap-3">
        <Piece kind="meialua" mood="neutral" size={64} alive className="animate-[hop_1.2s_ease-in-out_infinite]" />
        <p className="muted">{text}</p>
      </div>
    </div>
  );
}

function Gone({ code, message, closed = false }: { code: string; message: string; closed?: boolean }) {
  return (
    <div className="mx-auto grid max-w-[480px] justify-items-center gap-5 px-4 pt-10 pb-16 text-center">
      <Piece kind={closed ? "meialua" : "pino"} mood={closed ? "sad" : "sus"} size={100} />
      <h1>{closed ? "Sala encerrada" : `Sala ${code}`}</h1>
      <p className="muted max-w-[34ch]">{message}</p>
      <div className="grid w-full gap-2.5">
        <Link href="/sala" className="btn">
          Criar ou entrar em outra sala
        </Link>
        <Link href="/jogos" className="btn btn-ghost">
          Jogar num celular só
        </Link>
      </div>
    </div>
  );
}

function ConnectionBanner({ conn }: { conn: Room["conn"] }) {
  return (
    <AnimatePresence>
      {conn === "reconnecting" && (
        <motion.div
          role="status"
          className="sticky top-[64px] z-10 mb-3 flex items-center gap-2.5 rounded-2xl bg-[var(--color-aviso)] px-4 py-2.5 text-[15px] font-semibold text-[var(--color-tinta)]"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
        >
          <span className="size-2.5 animate-pulse rounded-full bg-[var(--color-tinta)]" aria-hidden="true" />
          Sem conexão. Reconectando…
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- entrar ---------- */

function JoinForm({ code, room }: { code: string; room: Room }) {
  const [nickname, setNickname] = useState("");
  const [piece, setPiece] = useState<PieceKind>(PIECE_KINDS[Math.floor(Math.random() * 5)]!);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return setErr("Escolha um apelido para os outros te reconhecerem.");
    setBusy(true);
    const problem = await room.enter(nickname, piece);
    setBusy(false);
    setErr(problem);
  };
  return (
    <form onSubmit={submit} className="mx-auto grid max-w-[480px] gap-5 px-4 pt-4 pb-16" noValidate>
      <div className="grid justify-items-center gap-2 text-center">
        <span className="muted">Entrando na sala</span>
        <CodeTiles code={code} />
      </div>
      <label className="grid gap-2">
        <span className="label">Seu apelido</span>
        <input className="input" value={nickname} onChange={(e) => (setNickname(e.target.value), setErr(null))} maxLength={16} autoComplete="nickname" placeholder="Como a turma te chama" autoFocus />
      </label>
      <PiecePicker value={piece} onChange={setPiece} />
      <p role="alert" className="text-[15px] font-semibold text-[var(--color-erro)]">
        {err}
      </p>
      <button className="btn btn-gema" type="submit" disabled={busy}>
        {busy ? "Entrando…" : "Entrar na sala"}
      </button>
    </form>
  );
}

function CodeTiles({ code, big = false }: { code: string; big?: boolean }) {
  const colors = ["var(--color-gema)", "var(--color-chiclete)", "var(--color-ceu)", "var(--color-menta)"];
  const dark = ["var(--color-gema-d)", "var(--color-chiclete-d)", "var(--color-ceu-d)", "var(--color-menta-d)"];
  return (
    <div className="flex gap-1.5 sm:gap-2" aria-label={`Código ${code.split("").join(" ")}`}>
      {code.split("").map((ch, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`num grid place-items-center rounded-2xl text-[var(--color-tinta)] ${big ? "h-16 w-[50px] text-[36px] sm:h-[72px] sm:w-[60px] sm:text-[44px]" : "h-14 w-12 text-[32px]"}`}
          style={{ background: colors[i], boxShadow: `0 5px 0 ${dark[i]}`, rotate: `${[-4, 3, -2, 4][i]}deg` }}
        >
          {ch}
        </span>
      ))}
    </div>
  );
}

/* ---------- lobby ---------- */

function useJoinUrl(code: string) {
  const [url, setUrl] = useState("");
  useEffect(() => setUrl(`${window.location.origin}/sala/${code}`), [code]);
  return url;
}

function ShareCard({ code }: { code: string }) {
  const url = useJoinUrl(code);
  const [svg, setSvg] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!url) return;
    QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#14241E", light: "#FFFFFF" } }).then(setSvg, () => setSvg(""));
  }, [url]);
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "DeResenha", text: `Entra na minha sala do DeResenha: ${code}`, url });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <section className="card grid gap-4 rounded-[28px] p-5" aria-label="Convidar">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="grid gap-3">
          <span className="text-sm font-bold text-[var(--fg-2)]">Código da sala</span>
          <CodeTiles code={code} big />
        </div>
        {svg && <div className="size-[92px] overflow-hidden rounded-2xl bg-white p-1 sm:size-[112px] [&_svg]:size-full" role="img" aria-label="QR Code para entrar na sala" dangerouslySetInnerHTML={{ __html: svg }} />}
      </div>
      <button className="btn btn-ghost" onClick={share}>
        {copied ? "Link copiado" : "Compartilhar link"}
      </button>
    </section>
  );
}

function Lobby({ view, room }: { view: RoomView; room: Room }) {
  const me = view.players.find((p) => p.id === view.me)!;
  const host = view.players.find((p) => p.id === view.hostId);
  const amHost = view.me === view.hostId;
  const active = view.players.filter((p) => !p.left);
  const min = minPlayersFor(view);
  const [target, setTarget] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const notaContent = useGameContent("nota");
  const infContent = useGameContent("infiltrado");
  const quizContent = useGameContent("quiz");
  const prefContent = useGameContent("voce-prefere");
  const limContent = useGameContent("limite");
  const menContent = useGameContent("mentira");
  const allThemes = useMemo(() => {
    const ids = (kind: "secreta" | "avaliacao") => {
      const used = new Set(notaContent.challenges.filter((c) => c.kind === kind).map((c) => c.theme));
      return notaContent.themes.filter((t) => used.has(t.id)).map((t) => t.id);
    };
    // Temas da turma ficam no aparelho e não chegam ao servidor: em sala, só os oficiais.
    const official = (list: { id: string }[]) => list.map((t) => t.id).filter((id) => !id.startsWith("meu-"));
    return { secreta: official(ids("secreta").map((id) => ({ id }))), avaliacao: official(ids("avaliacao").map((id) => ({ id }))), infiltrado: official(infContent.themes), quiz: official(quizContent.themes), "voce-prefere": official(prefContent.themes), limite: sortLimiteThemes(official(limContent.themes)), mentira: sortMentiraThemes(official(menContent.themes)) };
  }, [notaContent.challenges, notaContent.themes, infContent.themes, quizContent.themes, prefContent.themes, limContent.themes, menContent.themes]);
  const nc = view.config.nota;
  const ic = view.config.infiltrado;
  const qc = view.config.quiz;
  const pc = view.config.prefere;
  const lc = view.config.limite;
  const mc = view.config.mentira;
  const gameThemes = view.game === "nota" ? allThemes[nc.mode] : allThemes[view.game];
  const current = view.themes[view.game];
  const selected = current.filter((t) => gameThemes.includes(t));
  const { play } = useSound();
  const count = useRef(active.length);
  useEffect(() => {
    if (active.length > count.current) play("join");
    count.current = active.length;
  }, [active.length, play]);

  const t = target ? view.players.find((p) => p.id === target) : null;

  return (
    <div className="grid gap-6">
      <div>
        <h1>Lobby</h1>
        <p className="muted mt-1">{GAME_NAME[view.game]}{GAME_NAME[view.game].endsWith("?") ? "" : "."} {amHost ? "Você comanda a sala." : `${host?.nickname ?? "Alguém"} comanda a sala.`}</p>
      </div>
      <ShareCard code={view.code} />

      <section className="grid gap-2.5" aria-label="Quem está na sala">
        <h2>Na sala ({active.length})</h2>
        <motion.ul layout className="grid gap-2">
          <AnimatePresence initial={false}>
            {active.map((p) => (
              <motion.li key={p.id} layout initial={{ opacity: 0, y: -16, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 40 }} transition={{ type: "spring", stiffness: 420, damping: 26 }}>
                <button
                  className="card flex w-full items-center gap-3 rounded-[18px] px-3 py-2 text-left disabled:cursor-default"
                  disabled={!amHost || p.id === view.me}
                  onClick={() => setTarget(p.id)}
                  aria-label={`${p.nickname}${p.id === view.hostId ? ", comanda a sala" : ""}${p.ready ? ", pronto" : ""}${p.online ? "" : ", desconectado"}`}
                >
                  <Piece kind={p.piece} mood={p.ready ? "happy" : "neutral"} size={40} alive={p.online} />
                  <span className="flex-1">
                    <b>{p.nickname}</b>
                    {p.id === view.me && <span className="muted"> (você)</span>}
                    <span className="block text-[13px] font-semibold text-[var(--fg-2)]">
                      {p.id === view.hostId ? "Comanda a sala" : p.ready ? "Pronto" : "Escolhendo…"}
                      {!p.online && " · sem sinal"}
                    </span>
                  </span>
                  <span className={`size-2.5 rounded-full ${p.online ? "bg-[var(--color-ok)]" : "bg-[var(--line)]"}`} aria-hidden="true" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
        {active.length < min && <p className="muted text-[15px]">Faltam {min - active.length} para começar. Mande o código para a turma.</p>}
      </section>

      {amHost ? (
        <section className="grid gap-6" aria-label="Configuração">
          <h2>Partida</h2>
          <div className="grid gap-2.5">
            <span className="label" id="jogo">
              Jogo
            </span>
            <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-labelledby="jogo">
              {ROOM_GAMES.map((g) => (
                <button key={g} role="radio" aria-checked={view.game === g} onClick={() => room.act({ type: "set-game", game: g })} className={`grid content-start justify-items-center gap-1.5 rounded-[20px] border-[2.5px] bg-[var(--card)] px-1.5 py-3 text-center ${view.game === g ? "border-[var(--color-tinta)] shadow-[inset_0_0_0_1.5px_var(--color-tinta)]" : "border-[var(--line)]"}`}>
                  <Piece kind={GAME_PIECE[g]} mood={view.game === g ? "happy" : "neutral"} size={40} />
                  <b className="font-display text-[15px] leading-tight font-extrabold">{GAME_NAME[g]}</b>
                </button>
              ))}
            </div>
          </div>
          {view.game === "nota" && (
            <div className="grid gap-2.5">
              <span className="label" id="modo">
                Modo
              </span>
              <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-labelledby="modo">
                {(
                  [
                    ["secreta", "Nota Secreta"],
                    ["avaliacao", "Avaliação"],
                  ] as const
                ).map(([id, label]) => (
                  <button key={id} role="radio" aria-checked={nc.mode === id} className="chip justify-center py-3.5 text-base" onClick={() => room.act({ type: "configure", config: { mode: id }, themes: [...new Set([...current, ...allThemes[id]])] })}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <ChipGroup
            label="Temas"
            multi
            options={gameThemes.map((id) => ({ value: id, label: themeLabel(id) }))}
            value={selected}
            onToggle={(id) => {
              const nextSel = current.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
              if (nextSel.length === 0) return;
              const others = current.filter((x) => !gameThemes.includes(x));
              room.act({ type: "configure", themes: [...others, ...nextSel] }, { quiet: true });
            }}
          />
          {view.game === "nota" ? (
            <>
              <Stepper label="Rodadas" value={nc.rounds} min={1} max={12} onChange={(rounds) => room.act({ type: "configure", config: { rounds } }, { quiet: true })} />
              {nc.mode === "secreta" ? (
                <>
                  <ChipGroup label="Tempo para responder e chutar" options={[30, 45, 60, 0].map((v) => ({ value: v, label: v ? `${v} s` : "Sem tempo" }))} value={[nc.timerSec]} onToggle={(timerSec) => room.act({ type: "configure", config: { timerSec } }, { quiet: true })} />
                  <Toggle checked={nc.tellerBonus} onChange={(tellerBonus) => room.act({ type: "configure", config: { tellerBonus } }, { quiet: true })}>
                    Quem dá a dica ganha metade da média da turma
                  </Toggle>
                </>
              ) : (
                <Toggle checked={nc.scoreAvaliacao} onChange={(scoreAvaliacao) => room.act({ type: "configure", config: { scoreAvaliacao } }, { quiet: true })}>
                  Pontuar quem chegar mais perto da média da turma
                </Toggle>
              )}
            </>
          ) : view.game === "voce-prefere" ? (
            <>
              <Stepper label="Dilemas" value={pc.rounds} min={1} max={20} onChange={(rounds) => room.act({ type: "configure", prefere: { rounds } }, { quiet: true })} />
              <Toggle checked={pc.scoreMajority} onChange={(scoreMajority) => room.act({ type: "configure", prefere: { scoreMajority } }, { quiet: true })}>
                Dar 1 ponto para quem ficar com a maioria
              </Toggle>
            </>
          ) : view.game === "mentira" ? (
            <Stepper label="Histórias por pessoa" value={mc.turns} min={1} max={3} onChange={(turns) => room.act({ type: "configure", mentira: { turns } }, { quiet: true })} />
          ) : view.game === "limite" ? (
            <Stepper label="Perguntas" value={lc.rounds} min={1} max={20} onChange={(rounds) => room.act({ type: "configure", limite: { rounds } }, { quiet: true })} />
          ) : view.game === "quiz" ? (
            <>
              <Stepper label="Perguntas" value={qc.questions} min={3} max={20} onChange={(questions) => room.act({ type: "configure", quiz: { questions } }, { quiet: true })} />
              <ChipGroup label="Tempo por pergunta" options={[10, 15, 20, 30].map((v) => ({ value: v, label: `${v} s` }))} value={[qc.seconds]} onToggle={(seconds) => room.act({ type: "configure", quiz: { seconds } }, { quiet: true })} />
              <Toggle checked={qc.speed} onChange={(speed) => room.act({ type: "configure", quiz: { speed } }, { quiet: true })}>
                Responder mais rápido vale mais pontos
              </Toggle>
            </>
          ) : (
            <>
              <Stepper label="Rodadas" value={ic.rounds} min={1} max={10} onChange={(rounds) => room.act({ type: "configure", infiltrado: { rounds } }, { quiet: true })} />
              <Stepper label="Voltas de dicas antes de votar" value={ic.hintRounds} min={1} max={3} onChange={(hintRounds) => room.act({ type: "configure", infiltrado: { hintRounds } }, { quiet: true })} />
            </>
          )}
          <div className="sticky-cta">
            <button className="btn btn-gema" disabled={active.length < min || room.pending} onClick={() => room.act({ type: "start" })}>
              Começar partida
            </button>
          </div>
        </section>
      ) : (
        <section className="grid gap-4">
          <div className="card grid gap-1 rounded-[22px] p-4 text-[15px]">
            <b className="font-display text-lg font-extrabold">{view.game === "nota" ? (nc.mode === "secreta" ? "Nota Secreta" : "Avaliação") : GAME_NAME[view.game]}</b>
            <span className="muted">
              {view.game === "nota"
                ? `${nc.rounds} ${nc.rounds === 1 ? "rodada" : "rodadas"}${nc.mode === "secreta" && nc.timerSec ? `, ${nc.timerSec} s por etapa` : ""}`
                : view.game === "quiz"
                  ? `${qc.questions} perguntas, ${qc.seconds} s cada${qc.speed ? ", rapidez conta pontos" : ""}`
                  : view.game === "voce-prefere"
                    ? `${pc.rounds} ${pc.rounds === 1 ? "dilema" : "dilemas"}${pc.scoreMajority ? ", ficar com a maioria pontua" : ""}`
                  : view.game === "mentira"
                    ? `${mc.turns} ${mc.turns === 1 ? "história" : "histórias"} por pessoa`
                  : view.game === "limite"
                    ? `${lc.rounds} ${lc.rounds === 1 ? "pergunta" : "perguntas"}, quem chegar mais perto leva`
                  : `${ic.rounds} ${ic.rounds === 1 ? "rodada" : "rodadas"}, ${ic.hintRounds} ${ic.hintRounds === 1 ? "volta" : "voltas"} de dicas`}
              . Temas: {selected.map(themeLabel).join(", ")}.
            </span>
          </div>
          <button className={`btn ${me.ready ? "btn-ghost" : "btn-gema"}`} onClick={() => room.act({ type: "set-ready", ready: !me.ready })}>
            {me.ready ? "Não estou pronto" : "Estou pronto"}
          </button>
          <p className="muted text-center text-[15px]">Quando a turma estiver pronta, {host?.nickname ?? "quem comanda"} começa a partida.</p>
          {host && !host.online && (
            <button className="btn btn-ghost" onClick={() => room.act({ type: "claim-host" })}>
              {host.nickname} está sem sinal. Assumir o comando
            </button>
          )}
        </section>
      )}

      <ErrorNote message={room.actionError} />
      <div className="text-center">
        <button className="text-[15px] font-semibold text-[var(--fg-2)] underline underline-offset-4" onClick={() => setLeaving(true)}>
          Sair da sala
        </button>
      </div>

      <Sheet open={!!t} onClose={() => setTarget(null)} title={t?.nickname ?? ""} piece={t ? <Piece kind={t.piece} size={44} /> : null}>
        <div className="grid gap-2.5">
          <button className="btn" onClick={() => t && room.act({ type: "transfer-host", playerId: t.id }).then(() => setTarget(null))}>
            Passar o comando da sala
          </button>
          <button className="btn btn-rosa" onClick={() => t && room.act({ type: "kick", playerId: t.id }).then(() => setTarget(null))}>
            Remover da sala
          </button>
          <button className="btn btn-ghost" onClick={() => setTarget(null)}>
            Cancelar
          </button>
        </div>
      </Sheet>
      <LeaveSheet open={leaving} onClose={() => setLeaving(false)} room={room} amHost={amHost} />
    </div>
  );
}

function LeaveSheet({ open, onClose, room, amHost }: { open: boolean; onClose: () => void; room: Room; amHost: boolean }) {
  const leave = async () => {
    await room.act({ type: "leave" });
    room.forget();
    window.location.href = "/sala";
  };
  return (
    <Sheet open={open} onClose={onClose} title="Sair da sala?" piece={<Piece kind="meialua" mood="sad" size={44} />}>
      <p className="text-[var(--color-tinta-2)]">{amHost ? "O comando passa para outra pessoa da sala." : "Você pode voltar depois pelo mesmo código."}</p>
      <div className="grid gap-2.5">
        <button className="btn btn-rosa" onClick={leave}>
          Sair da sala
        </button>
        {amHost && (
          <button className="btn btn-ghost" onClick={() => room.act({ type: "close" }).then(onClose)}>
            Encerrar a sala para todos
          </button>
        )}
        <button className="btn btn-ghost" onClick={onClose}>
          Ficar
        </button>
      </div>
    </Sheet>
  );
}

/* ---------- cronômetro controlado pelo servidor ---------- */

export function useDeadline(view: RoomView, room: Room) {
  const [left, setLeft] = useState<number | null>(null);
  const sent = useRef<number | null>(null);
  const { play } = useSound();
  useEffect(() => {
    if (!view.deadline) {
      setLeft(null);
      return;
    }
    const deadline = view.deadline;
    const amHost = view.me === view.hostId;
    let lastSec = -1;
    const id = window.setInterval(() => {
      const ms = deadline - room.serverNow();
      const sec = Math.max(0, Math.ceil(ms / 1000));
      setLeft(sec);
      if (sec !== lastSec && sec <= 5 && sec > 0) play("tick");
      lastSec = sec;
      // Quando o prazo passa, avisa o servidor. Quem comanda avisa na hora; os outros, um pouco
      // depois, caso quem comanda esteja sem sinal. O servidor confere o horário de verdade.
      const grace = amHost ? 300 : 2500;
      if (ms < -grace && sent.current !== deadline) {
        sent.current = deadline;
        room.act({ type: "time-up" }, { quiet: true });
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [view.deadline, view.me, view.hostId, room, play]);
  return left;
}

export function DeadlineRing({ left, total }: { left: number; total: number }) {
  const C = 2 * Math.PI * 44;
  const low = left <= 5 && left > 0;
  return (
    <div className="relative mx-auto grid size-[110px] place-items-center" role="timer" aria-label={left ? `${left} segundos` : "Tempo esgotado"}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
        <circle cx="50" cy="50" r="44" fill="none" strokeWidth="9" stroke="var(--line)" />
        <circle cx="50" cy="50" r="44" fill="none" strokeWidth="9" strokeLinecap="round" stroke={low ? "var(--color-erro)" : "var(--color-feltro)"} strokeDasharray={C} strokeDashoffset={C * (1 - left / total)} style={{ transition: "stroke-dashoffset .25s linear" }} />
      </svg>
      <span className={`num text-[34px] ${low ? "text-[var(--color-erro)]" : ""}`} aria-hidden="true">
        {left || "0"}
      </span>
    </div>
  );
}

/* ---------- partida: Jogo da Nota em salas ---------- */

function NotaRoom({ view, room }: { view: RoomView; room: Room }) {
  const mv = view.match as Extract<RoomMatchView, { game: "nota" }>;
  const s = mv.state;
  const amHost = view.me === view.hostId;
  const hostName = view.players.find((p) => p.id === view.hostId)?.nickname ?? "quem comanda";
  const P = (id: string) => s.players.find((p) => p.id === id) ?? ({ id, name: "?", piece: "bolota" } as Player);
  const teller = s.tellerId ? P(s.tellerId) : null;
  const iAmTeller = s.tellerId === view.me;
  const secreta = s.config.mode === "secreta";
  const left = useDeadline(view, room);
  const offline = view.players.filter((p) => p.left || !p.online).map((p) => p.id);
  const { play } = useSound();
  useTone(s.phase === "reveal" || (s.phase === "answer" && iAmTeller) ? "noite" : null);
  const prevPhase = useRef(s.phase);
  useEffect(() => {
    if (prevPhase.current !== s.phase && s.phase === "answer") play("start");
    prevPhase.current = s.phase;
  }, [s.phase, play]);
  const waitHost = <p className="muted py-2 text-center">Esperando {hostName}.</p>;
  const game = (a: Parameters<Room["act"]>[0] extends infer A ? (A extends { type: "game"; action: infer G } ? G : never) : never, quiet = false) => room.act({ type: "game", action: a }, { quiet });

  let body: React.ReactNode;
  switch (s.phase) {
    case "intro":
      body = (
        <>
          <Progress round={s.round} total={s.config.rounds} />
          <PromptCard tag={`${secreta ? "Tema" : "Situação"}: ${themeLabel(s.prompt.theme)}`} text={s.prompt.text} flip />
          {secreta && teller && <Who player={teller} mood="sus" caption={iAmTeller ? "Nesta rodada, quem pensa é você" : "Quem pensa nesta rodada"} />}
          {amHost ? (
            <div className="grid gap-1.5">
              <button className="btn" disabled={room.pending} onClick={() => game({ type: "begin-round" })}>
                Começar a rodada
              </button>
              <button className="py-2.5 text-[15px] font-semibold text-[var(--fg-2)] underline underline-offset-4" onClick={() => game({ type: "swap-prompt" })}>
                Trocar o {secreta ? "tema" : "situação"}
              </button>
            </div>
          ) : (
            waitHost
          )}
        </>
      );
      break;

    case "answer":
      body = iAmTeller ? (
        <div className="grid justify-items-center gap-5 text-center">
          <h1 className="text-[clamp(26px,7vw,36px)]">Sua nota secreta</h1>
          <motion.div
            className="num grid aspect-[5/6] w-[min(60vw,220px)] place-items-center rounded-[28px] bg-[var(--color-gema)] text-[clamp(110px,32vw,150px)] text-[var(--color-tinta)] shadow-[0_6px_0_var(--color-gema-d)]"
            initial={{ rotateY: 180, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            {s.secret}
          </motion.div>
          <p className="max-w-[30ch]">
            Tema: <b>{s.prompt.text}</b>. Diga em voz alta algo que, pra você, vale exatamente essa nota. Só você vê este número.
          </p>
          {left !== null && <DeadlineRing left={left} total={s.config.timerSec} />}
          <div className="w-full">
            <button className="btn btn-gema" disabled={room.pending} onClick={() => game({ type: "answered" })}>
              Já falei
            </button>
          </div>
        </div>
      ) : (
        <>
          <Progress round={s.round} total={s.config.rounds} />
          <PromptCard tag={`Tema: ${themeLabel(s.prompt.theme)}`} text={s.prompt.text} />
          {teller && <Who player={teller} mood="sus" caption="Pensando numa resposta" />}
          <p className="muted">Escute com atenção. Quando {teller?.name} terminar, você chuta a nota no seu celular.</p>
          {left !== null && <DeadlineRing left={left} total={s.config.timerSec} />}
          {amHost && (
            <button className="btn btn-ghost" onClick={() => game({ type: "answered" })}>
              {teller?.name} já falou
            </button>
          )}
        </>
      );
      break;

    case "guess": {
      const ids = guessersOf(s);
      const mine = s.guesses[view.me];
      const iGuess = ids.includes(view.me);
      body = (
        <>
          <Progress round={s.round} total={s.config.rounds} />
          <div className="card grid gap-1.5 rounded-[28px] px-5 py-[18px]">
            <span className="text-sm font-bold text-[var(--fg-2)]">{secreta && teller ? `${teller.name} falou sobre` : "Situação"}</span>
            <p className="font-display text-[clamp(21px,5.4vw,26px)] leading-tight font-black">{s.prompt.text}</p>
          </div>
          {left !== null && <DeadlineRing left={left} total={s.config.timerSec} />}
          {iGuess ? (
            <>
              <h1 className="text-[clamp(24px,6.4vw,32px)]">{secreta ? "Qual era a nota?" : "Qual a sua nota?"}</h1>
              <NumberPad value={mine} onPick={(n) => game({ type: "guess", value: n }, true).then((ok) => ok && play("confirm"))} label={secreta ? "Seu palpite" : "Sua nota"} />
              <p className="muted text-[15px]" role="status">
                {mine === undefined ? "Ninguém vê sua resposta antes da revelação." : `Você escolheu ${mine}. Dá para mudar até todo mundo responder.`}
              </p>
            </>
          ) : (
            <div className="flex items-center gap-3.5">
              <Piece kind="meialua" mood="wow" size={56} alive />
              <h1 className="text-[clamp(22px,6vw,28px)]">A turma está chutando a sua nota</h1>
            </div>
          )}
          <ul className="flex flex-wrap gap-2" aria-label="Quem já respondeu">
            {ids.map((id) => {
              const done = mv.answered.includes(id);
              return (
                <motion.li key={id} layout animate={done ? { scale: [1, 1.1, 1] } : {}} className={`inline-flex items-center gap-1.5 rounded-full border-2 bg-[var(--card)] py-[3px] pr-3 pl-1 font-semibold ${done ? "border-[var(--color-ok)]" : "border-[var(--line)]"} ${offline.includes(id) ? "opacity-50" : ""}`}>
                  <Piece kind={P(id).piece} size={28} />
                  {P(id).name}
                  <span className={`font-display text-[13px] font-extrabold ${done ? "text-[var(--color-ok)]" : "text-[var(--fg-2)]"}`}>{done ? "pronto" : offline.includes(id) ? "sem sinal" : "…"}</span>
                </motion.li>
              );
            })}
          </ul>
          {amHost && (
            <button className="btn btn-ghost" disabled={mv.answered.length === 0} onClick={() => game({ type: "close-guesses" })}>
              Revelar com quem já respondeu
            </button>
          )}
        </>
      );
      break;
    }

    case "reveal":
      body = <RevealPhase s={s} P={P} canAdvance={amHost} onNext={() => game(secreta ? { type: "show-score" } : { type: "next" })} />;
      break;

    case "score":
      body = (
        <>
          <Progress round={s.round} total={s.config.rounds} />
          <h1>Placar</h1>
          <Scoreboard players={s.players} scores={s.scores} />
          {amHost ? (
            <button className={`btn ${s.round >= s.config.rounds ? "btn-gema" : ""}`} onClick={() => game({ type: "next" }).then((ok) => ok && s.round >= s.config.rounds && play("win"))}>
              {s.round >= s.config.rounds ? "Ver resultado" : "Próxima rodada"}
            </button>
          ) : (
            waitHost
          )}
        </>
      );
      break;

    case "end":
      body = (
        <EndPhase
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
