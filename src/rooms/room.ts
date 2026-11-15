/**
 * Camada pura do Modo Sala. Recebe o estado da sala, QUEM está agindo e a ação, e devolve o
 * novo estado. Decide permissões (anfitrião, jogador da vez), transições automáticas
 * (todo mundo chutou, tempo acabou) e o que cada participante pode ver.
 * O servidor só carrega/salva este estado; nenhuma regra mora no cliente ou no banco.
 */
import type { NotaChallenge } from "@/content/types";
import { assertRule, PIECE_KINDS, type PieceKind, type Player, type Rng } from "@/engine/core";
import { createNota, DEFAULT_NOTA_CONFIG, guessersOf, MIN_PLAYERS, reduceNota, viewNotaFor, type NotaConfig, type NotaState } from "@/engine/nota";

export const MAX_ROOM_PLAYERS = 12;
/** Sem sinal por mais que isso, o participante aparece como desconectado. */
export const ONLINE_WINDOW_MS = 20_000;
/** Anfitrião sem sinal por mais que isso pode ter o comando assumido por outra pessoa. */
export const HOST_STALE_MS = 45_000;

export interface RoomPlayer {
  id: string;
  nickname: string;
  piece: PieceKind;
  joinedAt: number;
  ready: boolean;
  left: boolean;
}

export type RoomStatus = "lobby" | "playing" | "ended" | "closed";

export interface RoomState {
  code: string;
  game: "nota";
  status: RoomStatus;
  hostId: string;
  players: RoomPlayer[];
  config: NotaConfig;
  themes: string[];
  match: NotaState | null;
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

export type RoomAction =
  | { type: "set-ready"; ready: boolean }
  | { type: "configure"; config?: Partial<Pick<NotaConfig, "mode" | "rounds" | "timerSec" | "tellerBonus" | "scoreAvaliacao" | "table">>; themes?: string[] }
  | { type: "start" }
  | { type: "kick"; playerId: string }
  | { type: "transfer-host"; playerId: string }
  | { type: "claim-host" }
  | { type: "leave" }
  | { type: "time-up" }
  | { type: "back-to-lobby" }
  | { type: "close" }
  | { type: "game"; action: NotaRoomAction };

export interface RoomCtx {
  now: number;
  rng: Rng;
  pool: readonly NotaChallenge[];
  /** Último sinal de cada participante (epoch ms), vindo da tabela de presença. */
  presence: Readonly<Record<string, number>>;
}

/* ---------- criação e entrada ---------- */

export function createRoomState(code: string, host: { id: string; nickname: string; piece: PieceKind }, now: number, themes: string[]): RoomState {
  return {
    code,
    game: "nota",
    status: "lobby",
    hostId: host.id,
    players: [{ ...host, joinedAt: now, ready: true, left: false }],
    config: { ...DEFAULT_NOTA_CONFIG },
    themes,
    match: null,
    deadline: null,
  };
}

export const activePlayers = (s: RoomState) => s.players.filter((p) => !p.left);

export function normalizeNickname(raw: string) {
  return raw.trim().replace(/\s+/g, " ");
}

/** Entrada de alguém novo. Reentrada (mesmo token) é tratada no servidor com `rejoin`. */
export function joinRoom(s: RoomState, p: { id: string; nickname: string; piece: PieceKind }, now: number): RoomState {
  assertRule(s.status !== "closed", "closed", "Essa sala foi encerrada.");
  assertRule(s.status === "lobby", "started", "A partida já começou. Peça para o anfitrião voltar ao lobby para você entrar.");
  const nick = normalizeNickname(p.nickname);
  assertRule(nick.length >= 1 && nick.length <= 16, "nickname", "O apelido precisa ter de 1 a 16 letras.");
  assertRule(activePlayers(s).length < MAX_ROOM_PLAYERS, "full", `A sala está cheia (máximo de ${MAX_ROOM_PLAYERS}).`);
  const same = activePlayers(s).find((x) => x.nickname.toLowerCase() === nick.toLowerCase());
  assertRule(!same, "nickname-taken", `Já tem alguém chamado ${same?.nickname} na sala. Escolha outro apelido.`);
  return { ...s, players: [...s.players, { id: p.id, nickname: nick, piece: p.piece, joinedAt: now, ready: false, left: false }] };
}

export function rejoinRoom(s: RoomState, playerId: string): RoomState {
  const p = s.players.find((x) => x.id === playerId);
  assertRule(p, "unknown", "Participante não encontrado nesta sala.");
  assertRule(s.status !== "closed", "closed", "Essa sala foi encerrada.");
  if (!p.left) return s;
  // Quem saiu no meio da partida só volta se ainda faz parte dela.
  assertRule(s.status === "lobby" || !!s.match?.players.some((x) => x.id === playerId), "started", "A partida já começou sem você. Aguarde a próxima.");
  return { ...s, players: s.players.map((x) => (x.id === playerId ? { ...x, left: false } : x)) };
}

export const suggestPiece = (s: RoomState): PieceKind => {
  const used = activePlayers(s).map((p) => p.piece);
  return PIECE_KINDS.find((k) => !used.includes(k)) ?? PIECE_KINDS[activePlayers(s).length % PIECE_KINDS.length]!;
};

/* ---------- regras ---------- */

const isHost = (s: RoomState, id: string) => s.hostId === id;
const requireHost = (s: RoomState, id: string) => assertRule(isHost(s, id), "host-only", "Só quem comanda a sala pode fazer isso.");
const member = (s: RoomState, id: string) => {
  const p = s.players.find((x) => x.id === id && !x.left);
  assertRule(p, "not-member", "Você não está mais nesta sala.");
  return p;
};

/** Próximo anfitrião quando o atual sai: quem entrou primeiro entre os presentes. */
function nextHost(s: RoomState, exceptId: string, presence: RoomCtx["presence"], now: number) {
  const candidates = activePlayers(s).filter((p) => p.id !== exceptId);
  const online = candidates.filter((p) => now - (presence[p.id] ?? 0) < ONLINE_WINDOW_MS);
  return (online[0] ?? candidates[0])?.id ?? null;
}

const matchPlayers = (s: RoomState): Player[] => activePlayers(s).map((p) => ({ id: p.id, name: p.nickname, piece: p.piece }));

function withDeadline(s: RoomState, ctx: RoomCtx): RoomState {
  const m = s.match;
  if (!m || !m.config.timerSec || m.config.mode !== "secreta") return { ...s, deadline: null };
  if (m.phase === "answer" || m.phase === "guess") return { ...s, deadline: ctx.now + m.config.timerSec * 1000 };
  return { ...s, deadline: null };
}

/** Pendentes que ainda estão na sala: quem saiu não segura a rodada. */
function activePending(s: RoomState) {
  const m = s.match!;
  const left = new Set(s.players.filter((p) => p.left).map((p) => p.id));
  return guessersOf(m).filter((id) => m.guesses[id] === undefined && !left.has(id));
}

function autoClose(s: RoomState, ctx: RoomCtx): RoomState {
  const m = s.match;
  if (!m || m.phase !== "guess") return s;
  const anyGuess = Object.keys(m.guesses).length > 0;
  if (anyGuess && activePending(s).length === 0) {
    const match = reduceNota(m, { type: "close-guesses", force: true }, ctx.pool, ctx.rng);
    return { ...s, match, deadline: null };
  }
  return s;
}

function applyGame(s: RoomState, actorId: string, a: NotaRoomAction, ctx: RoomCtx): RoomState {
  assertRule(s.status === "playing" && s.match, "not-playing", "Nenhuma partida em andamento.");
  let m = s.match;
  const secreta = m.config.mode === "secreta";
  switch (a.type) {
    case "begin-round":
      requireHost(s, actorId);
      if (secreta) {
        // No Modo Sala, quem pensa já recebe a nota no próprio celular: as etapas de
        // "passar o celular" do modo compartilhado acontecem de uma vez no servidor.
        m = reduceNota(m, { type: "open-private" }, ctx.pool, ctx.rng);
        m = reduceNota(m, { type: "peek", playerId: m.tellerId! }, ctx.pool, ctx.rng);
        m = reduceNota(m, { type: "confirm-private" }, ctx.pool, ctx.rng);
      } else {
        m = reduceNota(m, { type: "open-guesses" }, ctx.pool, ctx.rng);
      }
      return withDeadline({ ...s, match: m }, ctx);
    case "swap-prompt":
      requireHost(s, actorId);
      return { ...s, match: reduceNota(m, { type: "swap-prompt" }, ctx.pool, ctx.rng) };
    case "answered":
      assertRule(actorId === m.tellerId || isHost(s, actorId), "forbidden", "Só quem pensa (ou quem comanda a sala) avança daqui.");
      return withDeadline({ ...s, match: reduceNota(m, { type: "answered" }, ctx.pool, ctx.rng) }, ctx);
    case "guess":
      // O jogador só pode registrar o PRÓPRIO palpite: o id vem da credencial, não do corpo.
      m = reduceNota(m, { type: "guess", playerId: actorId, value: a.value }, ctx.pool, ctx.rng);
      return autoClose({ ...s, match: m }, ctx);
    case "close-guesses":
      requireHost(s, actorId);
      return { ...s, match: reduceNota(m, { type: "close-guesses", force: true }, ctx.pool, ctx.rng), deadline: null };
    case "show-score":
      requireHost(s, actorId);
      return { ...s, match: reduceNota(m, { type: "show-score" }, ctx.pool, ctx.rng) };
    case "next": {
      requireHost(s, actorId);
      m = reduceNota(m, { type: "next" }, ctx.pool, ctx.rng);
      return { ...s, match: m, status: m.phase === "end" ? "ended" : "playing", deadline: null };
    }
  }
}

export function reduceRoom(s: RoomState, actorId: string, a: RoomAction, ctx: RoomCtx): RoomState {
  assertRule(s.status !== "closed", "closed", "Essa sala foi encerrada.");
  const me = member(s, actorId);
  switch (a.type) {
    case "set-ready":
      assertRule(s.status === "lobby", "phase", "A partida já começou.");
      return { ...s, players: s.players.map((p) => (p.id === me.id ? { ...p, ready: a.ready } : p)) };

    case "configure": {
      requireHost(s, actorId);
      assertRule(s.status === "lobby", "phase", "Dá para mudar a configuração só no lobby.");
      const c = { ...s.config, ...a.config };
      assertRule(Number.isInteger(c.rounds) && c.rounds >= 1 && c.rounds <= 12, "rounds", "Escolha entre 1 e 12 rodadas.");
      assertRule([0, 30, 45, 60, 90].includes(c.timerSec), "timer", "Tempo inválido.");
      const t = c.table;
      assertRule([t.exact, t.d1, t.d2, t.d3].every((v) => Number.isInteger(v) && v >= 0 && v <= 999), "table", "Os pontos vão de 0 a 999.");
      const themes = a.themes ?? s.themes;
      assertRule(themes.length > 0, "themes", "Escolha pelo menos um tema.");
      return { ...s, config: c, themes };
    }

    case "start": {
      requireHost(s, actorId);
      assertRule(s.status === "lobby", "phase", "A partida já começou.");
      const players = matchPlayers(s);
      assertRule(players.length >= MIN_PLAYERS[s.config.mode], "players", `Esse modo precisa de pelo menos ${MIN_PLAYERS[s.config.mode]} pessoas na sala.`);
      const pool = ctx.pool.filter((c) => s.themes.includes(c.theme));
      const match = createNota(s.config, players, pool, ctx.rng);
      return { ...s, status: "playing", match, deadline: null };
    }

    case "kick": {
      requireHost(s, actorId);
      assertRule(a.playerId !== actorId, "self", "Para sair, use Sair da sala.");
      assertRule(s.status === "lobby", "phase", "Só dá para remover alguém no lobby.");
      return { ...s, players: s.players.filter((p) => p.id !== a.playerId) };
    }

    case "transfer-host": {
      requireHost(s, actorId);
      member(s, a.playerId);
      return { ...s, hostId: a.playerId };
    }

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
      return autoClose(next, ctx);
    }

    case "time-up": {
      assertRule(s.deadline !== null && ctx.now >= s.deadline, "too-early", "O tempo ainda não acabou.");
      const m = s.match;
      if (!m) return { ...s, deadline: null };
      if (m.phase === "answer") return withDeadline({ ...s, match: reduceNota(m, { type: "answered" }, ctx.pool, ctx.rng) }, ctx);
      if (m.phase === "guess") {
        if (Object.keys(m.guesses).length === 0) return { ...s, deadline: null }; // ninguém chutou: espera o anfitrião
        return { ...s, match: reduceNota(m, { type: "close-guesses", force: true }, ctx.pool, ctx.rng), deadline: null };
      }
      return { ...s, deadline: null };
    }

    case "back-to-lobby":
      requireHost(s, actorId);
      assertRule(s.status === "ended" || s.status === "playing", "phase", "Já está no lobby.");
      return { ...s, status: "lobby", match: null, deadline: null, players: s.players.filter((p) => !p.left).map((p) => ({ ...p, ready: p.id === s.hostId })) };

    case "close":
      requireHost(s, actorId);
      return { ...s, status: "closed", deadline: null };

    case "game":
      return applyGame(s, actorId, a.action, ctx);
  }
}

/* ---------- projeção: o que cada participante recebe ---------- */

export interface RoomView {
  code: string;
  game: "nota";
  status: RoomStatus;
  me: string;
  hostId: string;
  players: (Omit<RoomPlayer, "joinedAt"> & { online: boolean })[];
  config: NotaConfig;
  themes: string[];
  deadline: number | null;
  serverNow: number;
  /** Partida já filtrada para este participante (nota secreta e palpites alheios escondidos). */
  match: NotaState | null;
  /** Quem já respondeu na fase de palpites, sem os valores. */
  answered: string[];
}

export function viewRoom(s: RoomState, viewerId: string, presence: Readonly<Record<string, number>>, now: number): RoomView {
  const m = s.match;
  const filtered = m ? viewNotaFor(m, viewerId) : null;
  if (filtered) {
    // O histórico de usados não é segredo, mas não interessa ao cliente.
    filtered.used = [];
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
    match: filtered,
    answered: m && m.phase === "guess" ? Object.keys(m.guesses) : [],
  };
}

/** Status persistido em coluna (para consultas e limpeza). */
export const statusOf = (s: RoomState) => s.status;
