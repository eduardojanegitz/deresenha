import type { InfiltradoChallenge } from "@/content/types";
import { assertRule, drawFresh, randInt, type Player, type Rng, zeroScores } from "./core";

export interface InfiltradoConfig {
  rounds: number;
  /** Rodadas de dicas antes da votação. */
  hintRounds: number;
}
export const DEFAULT_INFILTRADO_CONFIG: InfiltradoConfig = { rounds: 3, hintRounds: 1 };
export const INFILTRADO_MIN = 4;

/** Pontos: civis que acertam o voto, civis quando pegam o infiltrado, infiltrado que escapa. */
export const INFILTRADO_POINTS = { rightVote: 1, caughtTeam: 1, escaped: 3 } as const;

export type InfiltradoPhase = "distribute" | "hints" | "vote" | "reveal" | "end";

export interface InfiltradoResult {
  impostorId: string;
  major: string;
  impostor: string;
  tally: Record<string, number>;
  accusedId: string | null; // null = empate sem decisão
  caught: boolean;
  wentToRevote: boolean;
  points: Record<string, number>;
}

export interface InfiltradoState {
  game: "infiltrado";
  config: InfiltradoConfig;
  players: Player[];
  round: number;
  phase: InfiltradoPhase;
  pair: InfiltradoChallenge;
  impostorId: string;
  /** Quem já viu a própria palavra (modo compartilhado passa o celular em ordem). */
  seen: string[];
  hintRound: number;
  starterId: string;
  votes: Record<string, string>;
  /** Na segunda votação, só os empatados podem receber votos. */
  candidates: string[] | null;
  wentToRevote: boolean;
  scores: Record<string, number>;
  result: InfiltradoResult | null;
  used: string[];
}

export type InfiltradoAction =
  | { type: "seen"; playerId: string }
  | { type: "start-hints" }
  | { type: "next-hint-round" }
  | { type: "open-vote" }
  | { type: "vote"; voterId: string; targetId: string }
  | { type: "close-vote"; force?: boolean }
  | { type: "next" };

/** Palavra que cada pessoa recebe. O infiltrado não sabe que é o infiltrado. */
export const wordFor = (s: Pick<InfiltradoState, "pair" | "impostorId">, playerId: string) =>
  playerId === s.impostorId ? s.pair.impostor : s.pair.major;

function begin(s: InfiltradoState, pool: readonly InfiltradoChallenge[], rng: Rng): InfiltradoState {
  const d = drawFresh(rng, pool, s.used, s.pair?.id);
  return {
    ...s,
    round: s.round + 1,
    phase: "distribute",
    pair: d.item,
    used: d.used,
    impostorId: (s.players[randInt(rng, 0, s.players.length - 1)] as Player).id,
    starterId: (s.players[randInt(rng, 0, s.players.length - 1)] as Player).id,
    seen: [],
    hintRound: 1,
    votes: {},
    candidates: null,
    wentToRevote: false,
    result: null,
  };
}

export function createInfiltrado(config: InfiltradoConfig, players: Player[], pool: readonly InfiltradoChallenge[], rng: Rng): InfiltradoState {
  assertRule(players.length >= INFILTRADO_MIN, "players", `Infiltrado precisa de pelo menos ${INFILTRADO_MIN} pessoas.`);
  assertRule(players.length <= 12, "players", "O limite é de 12 pessoas por partida.");
  const s = {
    game: "infiltrado",
    config,
    players,
    round: 0,
    phase: "distribute",
    pair: undefined as unknown as InfiltradoChallenge,
    impostorId: "",
    seen: [],
    hintRound: 1,
    starterId: "",
    votes: {},
    candidates: null,
    wentToRevote: false,
    scores: zeroScores(players.map((p) => p.id)),
    result: null,
    used: [],
  } satisfies InfiltradoState;
  return begin(s, pool, rng);
}

export function tally(votes: Record<string, string>): Record<string, number> {
  const t: Record<string, number> = {};
  Object.values(votes).forEach((target) => (t[target] = (t[target] ?? 0) + 1));
  return t;
}

export const pendingVoters = (s: InfiltradoState) => s.players.filter((p) => s.votes[p.id] === undefined).map((p) => p.id);

function settle(s: InfiltradoState, accusedId: string | null): InfiltradoState {
  const caught = accusedId === s.impostorId;
  const points = zeroScores(s.players.map((p) => p.id));
  if (caught) {
    s.players.forEach((p) => {
      if (p.id === s.impostorId) return;
      points[p.id] = INFILTRADO_POINTS.caughtTeam + (s.votes[p.id] === s.impostorId ? INFILTRADO_POINTS.rightVote : 0);
    });
  } else {
    points[s.impostorId] = INFILTRADO_POINTS.escaped;
  }
  const scores = { ...s.scores };
  Object.entries(points).forEach(([id, v]) => (scores[id] = (scores[id] ?? 0) + v));
  return {
    ...s,
    phase: "reveal",
    scores,
    result: { impostorId: s.impostorId, major: s.pair.major, impostor: s.pair.impostor, tally: tally(s.votes), accusedId, caught, wentToRevote: s.wentToRevote, points },
  };
}

export function reduceInfiltrado(s: InfiltradoState, a: InfiltradoAction, pool: readonly InfiltradoChallenge[], rng: Rng): InfiltradoState {
  switch (a.type) {
    case "seen":
      assertRule(s.phase === "distribute", "phase", "As palavras já foram distribuídas.");
      assertRule(s.players.some((p) => p.id === a.playerId), "forbidden", "Jogador desconhecido.");
      return s.seen.includes(a.playerId) ? s : { ...s, seen: [...s.seen, a.playerId] };
    case "start-hints":
      assertRule(s.phase === "distribute", "phase", "As dicas já começaram.");
      assertRule(s.seen.length === s.players.length, "pending", "Ainda falta gente ver a palavra.");
      return { ...s, phase: "hints" };
    case "next-hint-round":
      assertRule(s.phase === "hints" && s.hintRound < s.config.hintRounds, "phase", "Não há outra rodada de dicas.");
      return { ...s, hintRound: s.hintRound + 1 };
    case "open-vote":
      assertRule(s.phase === "hints", "phase", "Não é hora de votar.");
      return { ...s, phase: "vote", votes: {}, candidates: null };
    case "vote": {
      assertRule(s.phase === "vote", "phase", "A votação está fechada.");
      assertRule(s.players.some((p) => p.id === a.voterId), "forbidden", "Jogador desconhecido.");
      assertRule(a.voterId !== a.targetId, "self", "Não dá para votar em si mesmo.");
      assertRule(s.players.some((p) => p.id === a.targetId), "target", "Escolha alguém da partida.");
      assertRule(!s.candidates || s.candidates.includes(a.targetId), "target", "No desempate, só dá para votar nos empatados.");
      if (s.votes[a.voterId] === a.targetId) return s;
      return { ...s, votes: { ...s.votes, [a.voterId]: a.targetId } };
    }
    case "close-vote": {
      assertRule(s.phase === "vote", "phase", "A votação já foi fechada.");
      assertRule(pendingVoters(s).length === 0 || a.force, "pending", "Ainda falta gente votar.");
      assertRule(Object.keys(s.votes).length > 0, "empty", "Ninguém votou ainda.");
      const t = tally(s.votes);
      const max = Math.max(...Object.values(t));
      const top = Object.keys(t).filter((id) => t[id] === max);
      if (top.length === 1) return settle(s, top[0] as string);
      // Empate: uma segunda votação só entre os empatados. Se empatar de novo, o infiltrado escapa.
      if (!s.wentToRevote) return { ...s, votes: {}, candidates: top, wentToRevote: true };
      return settle(s, null);
    }
    case "next":
      assertRule(s.phase === "reveal", "phase", "Termine a rodada antes de avançar.");
      if (s.round >= s.config.rounds) return { ...s, phase: "end" };
      return begin(s, pool, rng);
  }
}

/**
 * Projeção para o Modo Sala: cada um só recebe a própria palavra, quem já viu/votou (sem o voto)
 * e, só depois da revelação, quem era o infiltrado e as duas palavras.
 */
export function viewInfiltradoFor(s: InfiltradoState, viewerId: string) {
  const revealed = s.phase === "reveal" || s.phase === "end";
  return {
    game: "infiltrado" as const,
    phase: s.phase,
    round: s.round,
    config: s.config,
    players: s.players,
    myWord: wordFor(s, viewerId),
    theme: s.pair.theme,
    starterId: s.starterId,
    hintRound: s.hintRound,
    seen: s.seen,
    voted: Object.keys(s.votes),
    myVote: s.votes[viewerId] ?? null,
    candidates: s.candidates,
    wentToRevote: s.wentToRevote,
    impostorId: revealed ? s.impostorId : null,
    votes: revealed ? s.votes : {},
    scores: s.scores,
    result: revealed ? s.result : null,
  };
}
export type InfiltradoView = ReturnType<typeof viewInfiltradoFor>;
