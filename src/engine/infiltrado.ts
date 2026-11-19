import type { InfiltradoChallenge } from "@/content/types";
import { assertRule, drawFresh, randInt, type Player, type Rng, zeroScores } from "./core";

/**
 * Como o infiltrado joga:
 *  - "secreto": recebe uma palavra parecida e não sabe que é o infiltrado (o clássico);
 *  - "sabe": é avisado que é o infiltrado e recebe uma palavra parecida para disfarçar;
 *  - "sem-palavra": o cartão vem vazio, só com o tema. Ele percebe que é o infiltrado.
 */
export type InfiltradoMode = "secreto" | "sabe" | "sem-palavra";
export const INFILTRADO_MODES: InfiltradoMode[] = ["secreto", "sabe", "sem-palavra"];

export interface InfiltradoConfig {
  rounds: number;
  /** Rodadas de dicas antes da votação. */
  hintRounds: number;
  /** Ausente em partidas e salas antigas: vale "secreto". */
  mode?: InfiltradoMode;
}
export const DEFAULT_INFILTRADO_CONFIG: InfiltradoConfig = { rounds: 3, hintRounds: 1, mode: "secreto" };
export const modeOf = (c: Pick<InfiltradoConfig, "mode">): InfiltradoMode => c.mode ?? "secreto";
/** Nos modos em que sabe quem é, o infiltrado pego ainda pode chutar a palavra da turma. */
export const hasLastGuess = (c: Pick<InfiltradoConfig, "mode">) => modeOf(c) !== "secreto";
export const INFILTRADO_MIN = 4;

/** Pontos: civis que acertam o voto, civis quando pegam o infiltrado, infiltrado que escapa. */
export const INFILTRADO_POINTS = { rightVote: 1, caughtTeam: 1, escaped: 3, stole: 3 } as const;

export type InfiltradoPhase = "distribute" | "hints" | "vote" | "last-guess" | "reveal" | "end";

export interface InfiltradoResult {
  impostorId: string;
  major: string;
  impostor: string;
  tally: Record<string, number>;
  accusedId: string | null; // null = empate sem decisão
  caught: boolean;
  wentToRevote: boolean;
  points: Record<string, number>;
  mode?: InfiltradoMode;
  /** Chute final do infiltrado pego (só nos modos em que ele sabe). */
  guess?: string | null;
  guessRight?: boolean;
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
  /** Quem foi infiltrado nas últimas rodadas (inclui partidas anteriores), do mais antigo ao mais novo. */
  recentImpostors?: string[];
}

export type InfiltradoAction =
  | { type: "seen"; playerId: string }
  | { type: "start-hints" }
  | { type: "next-hint-round" }
  | { type: "open-vote" }
  | { type: "vote"; voterId: string; targetId: string }
  | { type: "close-vote"; force?: boolean }
  | { type: "last-guess"; playerId: string; guess: string }
  | { type: "skip-guess" }
  | { type: "next" };

type Who = Pick<InfiltradoState, "pair" | "impostorId" | "config">;

/** Palavra que cada pessoa recebe. No modo "sem-palavra", o infiltrado recebe null. */
export const wordFor = (s: Who, playerId: string): string | null =>
  playerId !== s.impostorId ? s.pair.major : modeOf(s.config) === "sem-palavra" ? null : s.pair.impostor;

/** Se esta pessoa sabe que é o infiltrado (nunca no modo "secreto"). */
export const knowsImpostor = (s: Who, playerId: string) => playerId === s.impostorId && modeOf(s.config) !== "secreto";

/** Compara o chute com a palavra sem ligar para acento, maiúscula, artigo ou plural. */
export function sameWord(a: string, b: string): boolean {
  const norm = (x: string) =>
    x
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/^\s*(o|a|os|as|um|uma|uns|umas)\s+/, "")
      .replace(/\s+/g, "")
      .replace(/s$/, "");
  const x = norm(a);
  return x.length > 0 && x === norm(b);
}

/**
 * Sorteia o infiltrado sem deixar a mesma pessoa cair toda hora, mas sem virar fila previsível:
 * quem já foi infiltrado há pouco tem chance bem menor, e quem foi na última rodada, menor ainda.
 * Ninguém fica com chance zero, então ainda dá para repetir de vez em quando.
 */
export function pickImpostor(players: readonly Player[], recent: readonly string[], rng: Rng): string {
  const lately = recent.slice(-players.length * 2);
  const last = recent[recent.length - 1];
  const weights = players.map((p) => {
    const times = lately.filter((id) => id === p.id).length;
    return (1 / (1 + times) ** 2) * (p.id === last ? 0.25 : 1);
  });
  let roll = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < players.length; i++) {
    roll -= weights[i] as number;
    if (roll < 0) return (players[i] as Player).id;
  }
  return (players[players.length - 1] as Player).id;
}

function begin(s: InfiltradoState, pool: readonly InfiltradoChallenge[], rng: Rng): InfiltradoState {
  const d = drawFresh(rng, pool, s.used, s.pair?.id);
  const recent = s.recentImpostors ?? [];
  const impostorId = pickImpostor(s.players, recent, rng);
  // Quando o infiltrado sabe quem é, ele nunca abre as dicas: começar sem pista nenhuma seria injusto.
  const starters = hasLastGuess(s.config) ? s.players.filter((p) => p.id !== impostorId) : s.players;
  return {
    ...s,
    round: s.round + 1,
    phase: "distribute",
    pair: d.item,
    used: d.used,
    impostorId,
    recentImpostors: [...recent, impostorId].slice(-24),
    starterId: (starters[randInt(rng, 0, starters.length - 1)] as Player).id,
    seen: [],
    hintRound: 1,
    votes: {},
    candidates: null,
    wentToRevote: false,
    result: null,
  };
}

/** `recent`: quem foi infiltrado em partidas anteriores com a mesma turma, para equilibrar o sorteio. */
export function createInfiltrado(config: InfiltradoConfig, players: Player[], pool: readonly InfiltradoChallenge[], rng: Rng, recent: readonly string[] = []): InfiltradoState {
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
    recentImpostors: recent.filter((id) => players.some((p) => p.id === id)).slice(-24),
  } satisfies InfiltradoState;
  return begin(s, pool, rng);
}

export function tally(votes: Record<string, string>): Record<string, number> {
  const t: Record<string, number> = {};
  Object.values(votes).forEach((target) => (t[target] = (t[target] ?? 0) + 1));
  return t;
}

export const pendingVoters = (s: InfiltradoState) => s.players.filter((p) => s.votes[p.id] === undefined).map((p) => p.id);

function settle(s: InfiltradoState, accusedId: string | null, guess: string | null = null): InfiltradoState {
  const caught = accusedId === s.impostorId;
  const guessRight = caught && guess !== null && sameWord(guess, s.pair.major);
  const points = zeroScores(s.players.map((p) => p.id));
  if (guessRight) {
    // Pego, mas acertou a palavra: rouba a rodada. Quem votou certo ainda leva o ponto do voto.
    points[s.impostorId] = INFILTRADO_POINTS.stole;
    s.players.forEach((p) => {
      if (p.id !== s.impostorId && s.votes[p.id] === s.impostorId) points[p.id] = INFILTRADO_POINTS.rightVote;
    });
  } else if (caught) {
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
    result: {
      impostorId: s.impostorId,
      major: s.pair.major,
      impostor: modeOf(s.config) === "sem-palavra" ? "" : s.pair.impostor,
      tally: tally(s.votes),
      accusedId,
      caught,
      wentToRevote: s.wentToRevote,
      points,
      mode: modeOf(s.config),
      ...(hasLastGuess(s.config) && caught ? { guess, guessRight } : {}),
    },
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
      if (top.length === 1) {
        // Pegaram o infiltrado que sabia quem era: antes da revelação, ele ainda tem um chute.
        if (top[0] === s.impostorId && hasLastGuess(s.config)) return { ...s, phase: "last-guess" };
        return settle(s, top[0] as string);
      }
      // Empate: uma segunda votação só entre os empatados. Se empatar de novo, o infiltrado escapa.
      if (!s.wentToRevote) return { ...s, votes: {}, candidates: top, wentToRevote: true };
      return settle(s, null);
    }
    case "last-guess":
      assertRule(s.phase === "last-guess", "phase", "Não é hora do chute final.");
      assertRule(a.playerId === s.impostorId, "forbidden", "Só o infiltrado pode chutar a palavra.");
      assertRule(a.guess.trim().length > 0, "empty", "Escreva um chute.");
      assertRule(a.guess.length <= 60, "long", "Chute grande demais.");
      return settle(s, s.impostorId, a.guess.trim());
    case "skip-guess":
      assertRule(s.phase === "last-guess", "phase", "Não é hora do chute final.");
      return settle(s, s.impostorId, null);
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
    mode: modeOf(s.config),
    myWord: wordFor(s, viewerId),
    /** Só a própria pessoa fica sabendo, e só nos modos em que o infiltrado sabe. */
    iAmImpostor: knowsImpostor(s, viewerId),
    theme: s.pair.theme,
    starterId: s.starterId,
    hintRound: s.hintRound,
    seen: s.seen,
    voted: Object.keys(s.votes),
    myVote: s.votes[viewerId] ?? null,
    candidates: s.candidates,
    wentToRevote: s.wentToRevote,
    // No chute final todo mundo já sabe quem foi pego.
    impostorId: revealed || s.phase === "last-guess" ? s.impostorId : null,
    votes: revealed ? s.votes : {},
    scores: s.scores,
    result: revealed ? s.result : null,
  };
}
export type InfiltradoView = ReturnType<typeof viewInfiltradoFor>;
