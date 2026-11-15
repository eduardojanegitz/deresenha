/**
 * Camada pura do Modo Sala. Recebe o estado da sala, QUEM está agindo e a ação, e devolve o
 * novo estado. Decide permissões (anfitrião, jogador da vez), transições automáticas
 * (todo mundo respondeu, tempo acabou) e o que cada participante pode ver.
 * O servidor só carrega/salva este estado; nenhuma regra mora no cliente ou no banco.
 *
 * Cada jogo jogável em sala tem um bloco próprio aqui (Jogo da Nota, Infiltrado).
 */
import type { InfiltradoChallenge, NotaChallenge } from "@/content/types";
import { assertRule, PIECE_KINDS, type PieceKind, type Player, type Rng } from "@/engine/core";
import {
  createInfiltrado,
  DEFAULT_INFILTRADO_CONFIG,
  INFILTRADO_MIN,
  reduceInfiltrado,
  viewInfiltradoFor,
  type InfiltradoConfig,
  type InfiltradoState,
  type InfiltradoView,
} from "@/engine/infiltrado";
import { createNota, DEFAULT_NOTA_CONFIG, guessersOf, MIN_PLAYERS, reduceNota, viewNotaFor, type NotaConfig, type NotaState } from "@/engine/nota";

export const MAX_ROOM_PLAYERS = 12;
/** Sem sinal por mais que isso, o participante aparece como desconectado. */
export const ONLINE_WINDOW_MS = 20_000;
/** Anfitrião sem sinal por mais que isso pode ter o comando assumido por outra pessoa. */
export const HOST_STALE_MS = 45_000;

export type RoomGame = "nota" | "infiltrado";
export const ROOM_GAMES: RoomGame[] = ["nota", "infiltrado"];

export interface RoomPlayer {
  id: string;
  nickname: string;
  piece: PieceKind;
  joinedAt: number;
  ready: boolean;
  left: boolean;
}

export type RoomStatus = "lobby" | "playing" | "ended" | "closed";

export type RoomMatch = { game: "nota"; state: NotaState } | { game: "infiltrado"; state: InfiltradoState };

export interface RoomState {
  code: string;
  game: RoomGame;
  status: RoomStatus;
  hostId: string;
  players: RoomPlayer[];
  config: { nota: NotaConfig; infiltrado: InfiltradoConfig };
  themes: Record<RoomGame, string[]>;
  match: RoomMatch | null;
  /** Prazo da fase atual (epoch ms), controlado pelo servidor. */
  deadline: number | null;
}

export type NotaRoomAction =
  | { type: "begin-round" }
  | { type: "swap-prompt" }
  | { type: "answered" }
  | { type: "guess"; value: number }
  | { type: "close-guesses" }
  | { type: "show-score" }
  | { type: "next" };

export type InfiltradoRoomAction = { type: "seen" } | { type: "next-hint-round" } | { type: "open-vote" } | { type: "vote"; targetId: string } | { type: "close-vote" } | { type: "next" };

export type RoomAction =
  | { type: "set-ready"; ready: boolean }
  | { type: "set-game"; game: RoomGame }
  | {
      type: "configure";
      config?: Partial<Pick<NotaConfig, "mode" | "rounds" | "timerSec" | "tellerBonus" | "scoreAvaliacao" | "table">>;
      infiltrado?: Partial<InfiltradoConfig>;
      themes?: string[];
    }
  | { type: "start" }
  | { type: "kick"; playerId: string }
  | { type: "transfer-host"; playerId: string }
  | { type: "claim-host" }
  | { type: "leave" }
  | { type: "time-up" }
  | { type: "back-to-lobby" }
  | { type: "close" }
  | { type: "game"; action: NotaRoomAction | InfiltradoRoomAction };

export interface RoomPools {
  nota: readonly NotaChallenge[];
  infiltrado: readonly InfiltradoChallenge[];
}

export interface RoomCtx {
  now: number;
  rng: Rng;
  pools: RoomPools;
  /** Último sinal de cada participante (epoch ms), vindo da tabela de presença. */
  presence: Readonly<Record<string, number>>;
}

/* ---------- criação e entrada ---------- */

export function createRoomState(code: string, host: { id: string; nickname: string; piece: PieceKind }, now: number, themes: Record<RoomGame, string[]>): RoomState {
  return {
    code,
    game: "nota",
    status: "lobby",
    hostId: host.id,
    players: [{ ...host, joinedAt: now, ready: true, left: false }],
    config: { nota: { ...DEFAULT_NOTA_CONFIG }, infiltrado: { ...DEFAULT_INFILTRADO_CONFIG } },
    themes,
    match: null,
    deadline: null,
  };
}

export const activePlayers = (s: RoomState) => s.players.filter((p) => !p.left);
export const normalizeNickname = (raw: string) => raw.trim().replace(/\s+/g, " ");
export const minPlayersFor = (s: Pick<RoomState, "game" | "config">) => (s.game === "nota" ? MIN_PLAYERS[s.config.nota.mode] : INFILTRADO_MIN);

/** Entrada de alguém novo. Reentrada (mesmo token) usa `rejoinRoom`. */
export function joinRoom(s: RoomState, p: { id: string; nickname: string; piece: PieceKind }, now: number): RoomState {
  assertRule(s.status !== "closed", "closed", "Essa sala foi encerrada.");
  assertRule(s.status === "lobby", "started", "A partida já começou. Peça para quem comanda voltar ao lobby para você entrar.");
  const nick = normalizeNickname(p.nickname);
  assertRule(nick.length >= 1 && nick.length <= 16, "nickname", "O apelido precisa ter de 1 a 16 letras.");
  assertRule(activePlayers(s).length < MAX_ROOM_PLAYERS, "full", `A sala está cheia (máximo de ${MAX_ROOM_PLAYERS}).`);
  const same = activePlayers(s).find((x) => x.nickname.toLowerCase() === nick.toLowerCase());
  assertRule(!same, "nickname-taken", `Já tem alguém chamado ${same?.nickname} na sala. Escolha outro apelido.`);
  return { ...s, players: [...s.players, { id: p.id, nickname: nick, piece: p.piece, joinedAt: now, ready: false, left: false }] };
}

const matchPlayerIds = (s: RoomState) => s.match?.state.players.map((p) => p.id) ?? [];

export function rejoinRoom(s: RoomState, playerId: string): RoomState {
  const p = s.players.find((x) => x.id === playerId);
  assertRule(p, "unknown", "Participante não encontrado nesta sala.");
  assertRule(s.status !== "closed", "closed", "Essa sala foi encerrada.");
  if (!p.left) return s;
  // Quem saiu no meio da partida só volta se ainda faz parte dela.
  assertRule(s.status === "lobby" || matchPlayerIds(s).includes(playerId), "started", "A partida já começou sem você. Aguarde a próxima.");
  return { ...s, players: s.players.map((x) => (x.id === playerId ? { ...x, left: false } : x)) };
}

export const suggestPiece = (s: RoomState): PieceKind => {
  const used = activePlayers(s).map((p) => p.piece);
  return PIECE_KINDS.find((k) => !used.includes(k)) ?? PIECE_KINDS[activePlayers(s).length % PIECE_KINDS.length]!;
};

/* ---------- utilidades ---------- */

const isHost = (s: RoomState, id: string) => s.hostId === id;
const requireHost = (s: RoomState, id: string) => assertRule(isHost(s, id), "host-only", "Só quem comanda a sala pode fazer isso.");
const member = (s: RoomState, id: string) => {
  const p = s.players.find((x) => x.id === id && !x.left);
  assertRule(p, "not-member", "Você não está mais nesta sala.");
  return p;
};
const absentIds = (s: RoomState) => new Set(s.players.filter((p) => p.left).map((p) => p.id));

function nextHost(s: RoomState, exceptId: string, presence: RoomCtx["presence"], now: number) {
  const candidates = activePlayers(s).filter((p) => p.id !== exceptId);
  const online = candidates.filter((p) => now - (presence[p.id] ?? 0) < ONLINE_WINDOW_MS);
  return (online[0] ?? candidates[0])?.id ?? null;
}

const matchPlayers = (s: RoomState): Player[] => activePlayers(s).map((p) => ({ id: p.id, name: p.nickname, piece: p.piece }));

/* ---------- Jogo da Nota em sala ---------- */

function notaDeadline(s: RoomState, m: NotaState, ctx: RoomCtx): number | null {
  if (!m.config.timerSec || m.config.mode !== "secreta") return null;
  return m.phase === "answer" || m.phase === "guess" ? ctx.now + m.config.timerSec * 1000 : null;
}

/** Fecha os palpites sozinho quando todos os presentes já chutaram. */
function notaAuto(s: RoomState, m: NotaState, ctx: RoomCtx): RoomState {
  if (m.phase === "guess" && Object.keys(m.guesses).length > 0) {
    const absent = absentIds(s);
    const pending = guessersOf(m).filter((id) => m.guesses[id] === undefined && !absent.has(id));
    if (pending.length === 0) return { ...s, match: { game: "nota", state: reduceNota(m, { type: "close-guesses", force: true }, ctx.pools.nota, ctx.rng) }, deadline: null };
  }
  return { ...s, match: { game: "nota", state: m } };
}

function applyNota(s: RoomState, m: NotaState, actorId: string, a: NotaRoomAction, ctx: RoomCtx): RoomState {
  const pool = ctx.pools.nota;
  const put = (state: NotaState, deadline: number | null = s.deadline): RoomState => ({ ...s, match: { game: "nota", state }, deadline });
  switch (a.type) {
    case "begin-round": {
      requireHost(s, actorId);
      let next = m;
      if (m.config.mode === "secreta") {
        // Em sala, quem pensa recebe a nota no próprio celular: as etapas de "passar o
        // celular" do modo compartilhado acontecem de uma vez aqui.
        next = reduceNota(next, { type: "open-private" }, pool, ctx.rng);
        next = reduceNota(next, { type: "peek", playerId: next.tellerId! }, pool, ctx.rng);
        next = reduceNota(next, { type: "confirm-private" }, pool, ctx.rng);
      } else next = reduceNota(next, { type: "open-guesses" }, pool, ctx.rng);
      return put(next, notaDeadline(s, next, ctx));
    }
    case "swap-prompt":
      requireHost(s, actorId);
      return put(reduceNota(m, { type: "swap-prompt" }, pool, ctx.rng));
    case "answered": {
      assertRule(actorId === m.tellerId || isHost(s, actorId), "forbidden", "Só quem pensa (ou quem comanda a sala) avança daqui.");
      const next = reduceNota(m, { type: "answered" }, pool, ctx.rng);
      return put(next, notaDeadline(s, next, ctx));
    }
    case "guess":
      // O jogador só registra o PRÓPRIO palpite: o id vem da credencial, não do corpo.
      return notaAuto(s, reduceNota(m, { type: "guess", playerId: actorId, value: a.value }, pool, ctx.rng), ctx);
    case "close-guesses":
      requireHost(s, actorId);
      return put(reduceNota(m, { type: "close-guesses", force: true }, pool, ctx.rng), null);
    case "show-score":
      requireHost(s, actorId);
      return put(reduceNota(m, { type: "show-score" }, pool, ctx.rng));
    case "next": {
      requireHost(s, actorId);
      const next = reduceNota(m, { type: "next" }, pool, ctx.rng);
      return { ...put(next, null), status: next.phase === "end" ? "ended" : "playing" };
    }
  }
}

function notaTimeUp(s: RoomState, m: NotaState, ctx: RoomCtx): RoomState {
  if (m.phase === "answer") {
    const next = reduceNota(m, { type: "answered" }, ctx.pools.nota, ctx.rng);
    return { ...s, match: { game: "nota", state: next }, deadline: notaDeadline(s, next, ctx) };
  }
  if (m.phase === "guess" && Object.keys(m.guesses).length > 0) return { ...s, match: { game: "nota", state: reduceNota(m, { type: "close-guesses", force: true }, ctx.pools.nota, ctx.rng) }, deadline: null };
  return { ...s, deadline: null };
}

/* ---------- Infiltrado em sala ---------- */

/** Avança sozinho: todos os presentes viram a palavra → dicas; todos votaram → apuração. */
function infiltradoAuto(s: RoomState, m: InfiltradoState, ctx: RoomCtx): RoomState {
  const pool = ctx.pools.infiltrado;
  const absent = absentIds(s);
  let next = m;
  if (next.phase === "distribute") {
    // Quem saiu não trava a distribuição.
    for (const id of absent) if (next.players.some((p) => p.id === id) && !next.seen.includes(id)) next = reduceInfiltrado(next, { type: "seen", playerId: id }, pool, ctx.rng);
    if (next.seen.length === next.players.length) next = reduceInfiltrado(next, { type: "start-hints" }, pool, ctx.rng);
  }
  if (next.phase === "vote" && Object.keys(next.votes).length > 0) {
    const pending = next.players.filter((p) => next.votes[p.id] === undefined && !absent.has(p.id));
    if (pending.length === 0) next = reduceInfiltrado(next, { type: "close-vote", force: true }, pool, ctx.rng);
  }
  return { ...s, match: { game: "infiltrado", state: next } };
}

function applyInfiltrado(s: RoomState, m: InfiltradoState, actorId: string, a: InfiltradoRoomAction, ctx: RoomCtx): RoomState {
  const pool = ctx.pools.infiltrado;
  switch (a.type) {
    case "seen":
      return infiltradoAuto(s, reduceInfiltrado(m, { type: "seen", playerId: actorId }, pool, ctx.rng), ctx);
    case "next-hint-round":
      requireHost(s, actorId);
      return { ...s, match: { game: "infiltrado", state: reduceInfiltrado(m, { type: "next-hint-round" }, pool, ctx.rng) } };
    case "open-vote":
      requireHost(s, actorId);
      return { ...s, match: { game: "infiltrado", state: reduceInfiltrado(m, { type: "open-vote" }, pool, ctx.rng) } };
    case "vote":
      // Cada um vota por si: o eleitor é quem está autenticado.
      return infiltradoAuto(s, reduceInfiltrado(m, { type: "vote", voterId: actorId, targetId: a.targetId }, pool, ctx.rng), ctx);
    case "close-vote":
      requireHost(s, actorId);
      return { ...s, match: { game: "infiltrado", state: reduceInfiltrado(m, { type: "close-vote", force: true }, pool, ctx.rng) } };
    case "next": {
      requireHost(s, actorId);
      const next = reduceInfiltrado(m, { type: "next" }, pool, ctx.rng);
      return infiltradoAuto({ ...s, status: next.phase === "end" ? "ended" : "playing" }, next, ctx);
    }
  }
}

/* ---------- regras gerais ---------- */

function afterLeave(s: RoomState, ctx: RoomCtx): RoomState {
  if (!s.match) return s;
  return s.match.game === "nota" ? notaAuto(s, s.match.state, ctx) : infiltradoAuto(s, s.match.state, ctx);
}

export function reduceRoom(s: RoomState, actorId: string, a: RoomAction, ctx: RoomCtx): RoomState {
  assertRule(s.status !== "closed", "closed", "Essa sala foi encerrada.");
  const me = member(s, actorId);
  switch (a.type) {
    case "set-ready":
      assertRule(s.status === "lobby", "phase", "A partida já começou.");
      return { ...s, players: s.players.map((p) => (p.id === me.id ? { ...p, ready: a.ready } : p)) };

    case "set-game":
      requireHost(s, actorId);
      assertRule(s.status === "lobby", "phase", "Dá para trocar de jogo só no lobby.");
      assertRule(ROOM_GAMES.includes(a.game), "game", "Esse jogo ainda não funciona em salas.");
      return { ...s, game: a.game };

    case "configure": {
      requireHost(s, actorId);
      assertRule(s.status === "lobby", "phase", "Dá para mudar a configuração só no lobby.");
      const nota = { ...s.config.nota, ...a.config };
      assertRule(Number.isInteger(nota.rounds) && nota.rounds >= 1 && nota.rounds <= 12, "rounds", "Escolha entre 1 e 12 rodadas.");
      assertRule([0, 30, 45, 60, 90].includes(nota.timerSec), "timer", "Tempo inválido.");
      const t = nota.table;
      assertRule([t.exact, t.d1, t.d2, t.d3].every((v) => Number.isInteger(v) && v >= 0 && v <= 999), "table", "Os pontos vão de 0 a 999.");
      const infiltrado = { ...s.config.infiltrado, ...a.infiltrado };
      assertRule(Number.isInteger(infiltrado.rounds) && infiltrado.rounds >= 1 && infiltrado.rounds <= 10, "rounds", "Escolha entre 1 e 10 rodadas.");
      assertRule(Number.isInteger(infiltrado.hintRounds) && infiltrado.hintRounds >= 1 && infiltrado.hintRounds <= 3, "hints", "Escolha de 1 a 3 voltas de dicas.");
      const themes = a.themes ?? s.themes[s.game];
      assertRule(themes.length > 0, "themes", "Escolha pelo menos um tema.");
      return { ...s, config: { nota, infiltrado }, themes: { ...s.themes, [s.game]: themes } };
    }

    case "start": {
      requireHost(s, actorId);
      assertRule(s.status === "lobby", "phase", "A partida já começou.");
      const players = matchPlayers(s);
      const min = minPlayersFor(s);
      assertRule(players.length >= min, "players", `Esse jogo precisa de pelo menos ${min} pessoas na sala.`);
      const themes = s.themes[s.game];
      if (s.game === "nota") {
        const match = createNota(s.config.nota, players, ctx.pools.nota.filter((c) => themes.includes(c.theme)), ctx.rng);
        return { ...s, status: "playing", match: { game: "nota", state: match }, deadline: null };
      }
      const match = createInfiltrado(s.config.infiltrado, players, ctx.pools.infiltrado.filter((c) => themes.includes(c.theme)), ctx.rng);
      return { ...s, status: "playing", match: { game: "infiltrado", state: match }, deadline: null };
    }

    case "kick":
      requireHost(s, actorId);
      assertRule(a.playerId !== actorId, "self", "Para sair, use Sair da sala.");
      assertRule(s.status === "lobby", "phase", "Só dá para remover alguém no lobby.");
      return { ...s, players: s.players.filter((p) => p.id !== a.playerId) };

    case "transfer-host":
      requireHost(s, actorId);
      member(s, a.playerId);
      return { ...s, hostId: a.playerId };

    case "claim-host": {
      const host = s.players.find((p) => p.id === s.hostId);
      const hostSeen = ctx.presence[s.hostId] ?? 0;
      assertRule(!host || host.left || ctx.now - hostSeen > HOST_STALE_MS, "host-online", "Quem comanda a sala ainda está conectado.");
      return { ...s, hostId: actorId };
    }

    case "leave": {
      // No lobby, sair remove da lista. Na partida, marca como ausente (pode voltar).
      let next: RoomState =
        s.status === "lobby" ? { ...s, players: s.players.filter((p) => p.id !== actorId) } : { ...s, players: s.players.map((p) => (p.id === actorId ? { ...p, left: true } : p)) };
      if (activePlayers(next).length === 0) return { ...next, status: "closed", deadline: null };
      if (next.hostId === actorId) next = { ...next, hostId: nextHost(next, actorId, ctx.presence, ctx.now) ?? next.hostId };
      return afterLeave(next, ctx);
    }

    case "time-up": {
      assertRule(s.deadline !== null && ctx.now >= s.deadline, "too-early", "O tempo ainda não acabou.");
      if (s.match?.game === "nota") return notaTimeUp(s, s.match.state, ctx);
      return { ...s, deadline: null };
    }

    case "back-to-lobby":
      requireHost(s, actorId);
      assertRule(s.status === "ended" || s.status === "playing", "phase", "Já está no lobby.");
      return { ...s, status: "lobby", match: null, deadline: null, players: s.players.filter((p) => !p.left).map((p) => ({ ...p, ready: p.id === s.hostId })) };

    case "close":
      requireHost(s, actorId);
      return { ...s, status: "closed", deadline: null };

    case "game": {
      assertRule(s.status === "playing" && s.match, "not-playing", "Nenhuma partida em andamento.");
      if (s.match.game === "nota") return applyNota(s, s.match.state, actorId, a.action as NotaRoomAction, ctx);
      return applyInfiltrado(s, s.match.state, actorId, a.action as InfiltradoRoomAction, ctx);
    }
  }
}

/* ---------- projeção: o que cada participante recebe ---------- */

export type RoomMatchView = { game: "nota"; state: NotaState; answered: string[] } | { game: "infiltrado"; state: InfiltradoView };

export interface RoomView {
  code: string;
  game: RoomGame;
  status: RoomStatus;
  me: string;
  hostId: string;
  players: (Omit<RoomPlayer, "joinedAt"> & { online: boolean })[];
  config: RoomState["config"];
  themes: RoomState["themes"];
  deadline: number | null;
  serverNow: number;
  /** Partida já filtrada para este participante. Nunca contém segredos alheios. */
  match: RoomMatchView | null;
}

export function viewRoom(s: RoomState, viewerId: string, presence: Readonly<Record<string, number>>, now: number): RoomView {
  let match: RoomMatchView | null = null;
  if (s.match?.game === "nota") {
    const m = s.match.state;
    const filtered = { ...viewNotaFor(m, viewerId), used: [] };
    match = { game: "nota", state: filtered, answered: m.phase === "guess" ? Object.keys(m.guesses) : [] };
  } else if (s.match?.game === "infiltrado") {
    match = { game: "infiltrado", state: viewInfiltradoFor(s.match.state, viewerId) };
  }
  return {
    code: s.code,
    game: s.game,
    status: s.status,
    me: viewerId,
    hostId: s.hostId,
    players: s.players.map(({ joinedAt: _j, ...p }) => ({ ...p, online: !p.left && now - (presence[p.id] ?? 0) < ONLINE_WINDOW_MS })),
    config: s.config,
    themes: s.themes,
    deadline: s.deadline,
    serverNow: now,
    match,
  };
}
