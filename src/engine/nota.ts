import type { NotaChallenge } from "@/content/types";
import { assertRule, drawFresh, mean, median, randInt, type Player, type Rng, zeroScores } from "./core";

/* ---------- configuração ---------- */

export interface ScoreTable {
  exact: number;
  d1: number;
  d2: number;
  d3: number;
}

export interface NotaConfig {
  mode: "secreta" | "avaliacao";
  rounds: number;
  timerSec: number; // 0 = sem tempo
  range: { min: number; max: number };
  table: ScoreTable;
  /** Nota Secreta: quem deu a dica ganha metade da média dos pontos da turma. */
  tellerBonus: boolean;
  /** Avaliação: pontuar quem chega mais perto da média (opcional, o modo é social). */
  scoreAvaliacao: boolean;
}

export const DEFAULT_TABLE: ScoreTable = { exact: 100, d1: 70, d2: 40, d3: 20 };

export const DEFAULT_NOTA_CONFIG: NotaConfig = {
  mode: "secreta",
  rounds: 4,
  timerSec: 45,
  range: { min: 0, max: 10 },
  table: DEFAULT_TABLE,
  tellerBonus: true,
  scoreAvaliacao: false,
};

export const MIN_PLAYERS = { secreta: 3, avaliacao: 2 } as const;

/* ---------- estado ---------- */

export type NotaPhase = "intro" | "private" | "answer" | "guess" | "reveal" | "score" | "end";

export interface SecretaResult {
  kind: "secreta";
  secret: number;
  rows: { playerId: string; guess: number | null; diff: number | null; points: number }[];
  tellerId: string;
  tellerBonus: number;
}
export interface AvaliacaoResult {
  kind: "avaliacao";
  rows: { playerId: string; value: number; points: number }[];
  mean: number;
  median: number;
  spread: number;
  highest: { playerId: string; value: number };
  lowest: { playerId: string; value: number };
  closest: { playerId: string; value: number };
}

export interface NotaState {
  game: "nota";
  config: NotaConfig;
  players: Player[];
  round: number;
  phase: NotaPhase;
  prompt: NotaChallenge;
  /** Nota Secreta: quem pensa nesta rodada e a nota sorteada. */
  tellerId: string | null;
  secret: number | null;
  /** Já viu a nota (modo compartilhado exige isso antes de devolver o celular). */
  peeked: boolean;
  guesses: Record<string, number>;
  scores: Record<string, number>;
  result: SecretaResult | AvaliacaoResult | null;
  /** Para o resumo final da Avaliação: distância de cada um até a média, por rodada. */
  distances: Record<string, number[]>;
  history: { prompt: string; mean?: number; secret?: number }[];
  used: string[];
  tellerOffset: number;
}

export type NotaAction =
  | { type: "swap-prompt" }
  | { type: "open-private" }
  | { type: "peek"; playerId: string }
  | { type: "confirm-private" }
  | { type: "answered" }
  | { type: "open-guesses" }
  | { type: "guess"; playerId: string; value: number }
  | { type: "close-guesses"; force?: boolean }
  | { type: "show-score" }
  | { type: "next" };

/* ---------- regras ---------- */

export function pointsForDiff(diff: number, table: ScoreTable): number {
  if (diff === 0) return table.exact;
  if (diff === 1) return table.d1;
  if (diff === 2) return table.d2;
  if (diff === 3) return table.d3;
  return 0;
}

export function guessersOf(s: Pick<NotaState, "players" | "config" | "tellerId">): string[] {
  return s.config.mode === "secreta" ? s.players.filter((p) => p.id !== s.tellerId).map((p) => p.id) : s.players.map((p) => p.id);
}

export function pendingGuessers(s: NotaState): string[] {
  return guessersOf(s).filter((id) => s.guesses[id] === undefined);
}

function validateConfig(config: NotaConfig, players: Player[]) {
  assertRule(players.length >= MIN_PLAYERS[config.mode], "players", `Esse modo precisa de pelo menos ${MIN_PLAYERS[config.mode]} pessoas.`);
  assertRule(players.length <= 12, "players", "O limite é de 12 pessoas por partida.");
  assertRule(new Set(players.map((p) => p.id)).size === players.length, "players", "Há jogadores repetidos.");
  assertRule(Number.isInteger(config.rounds) && config.rounds >= 1 && config.rounds <= 20, "rounds", "Escolha entre 1 e 20 rodadas.");
  assertRule(config.range.min < config.range.max, "range", "O intervalo de notas é inválido.");
}

function beginRound(s: NotaState, pool: readonly NotaChallenge[], rng: Rng): NotaState {
  const round = s.round + 1;
  const drawn = drawFresh(rng, pool, s.used, s.prompt?.id);
  const secreta = s.config.mode === "secreta";
  const teller = secreta ? (s.players[(s.tellerOffset + round - 1) % s.players.length] as Player) : null;
  return {
    ...s,
    round,
    phase: "intro",
    prompt: drawn.item,
    used: drawn.used,
    tellerId: teller?.id ?? null,
    secret: secreta ? randInt(rng, s.config.range.min, s.config.range.max) : null,
    peeked: false,
    guesses: {},
    result: null,
  };
}

export function createNota(config: NotaConfig, players: Player[], pool: readonly NotaChallenge[], rng: Rng): NotaState {
  validateConfig(config, players);
  const usable = pool.filter((c) => c.kind === config.mode);
  const initial = {
    game: "nota",
    config,
    players,
    round: 0,
    phase: "intro",
    prompt: undefined as unknown as NotaChallenge,
    tellerId: null,
    secret: null,
    peeked: false,
    guesses: {},
    scores: zeroScores(players.map((p) => p.id)),
    result: null,
    distances: Object.fromEntries(players.map((p) => [p.id, [] as number[]])),
    history: [],
    used: [],
    tellerOffset: Math.floor(rng() * players.length),
  } satisfies NotaState;
  return beginRound(initial, usable, rng);
}

function settle(s: NotaState): NotaState {
  // Pontos são aplicados uma única vez, no fechamento dos palpites.
  const scores = { ...s.scores };
  const ids = guessersOf(s);
  if (s.config.mode === "secreta") {
    const secret = s.secret as number;
    const rows = ids.map((id) => {
      const g = s.guesses[id];
      if (g === undefined) return { playerId: id, guess: null, diff: null, points: 0 };
      const diff = Math.abs(g - secret);
      return { playerId: id, guess: g, diff, points: pointsForDiff(diff, s.config.table) };
    });
    rows.forEach((r) => (scores[r.playerId] = (scores[r.playerId] ?? 0) + r.points));
    const tellerBonus = s.config.tellerBonus ? Math.round(mean(rows.map((r) => r.points)) / 2) : 0;
    const tellerId = s.tellerId as string;
    scores[tellerId] = (scores[tellerId] ?? 0) + tellerBonus;
    return {
      ...s,
      phase: "reveal",
      scores,
      result: { kind: "secreta", secret, rows, tellerId, tellerBonus },
      history: [...s.history, { prompt: s.prompt.text, secret }],
    };
  }
  const answered = ids.filter((id) => s.guesses[id] !== undefined);
  const values = answered.map((id) => s.guesses[id] as number);
  const avg = mean(values);
  const target = Math.round(avg);
  const rows = answered.map((id) => {
    const value = s.guesses[id] as number;
    return { playerId: id, value, points: s.config.scoreAvaliacao ? pointsForDiff(Math.abs(value - target), s.config.table) : 0 };
  });
  rows.forEach((r) => (scores[r.playerId] = (scores[r.playerId] ?? 0) + r.points));
  const by = (cmp: (a: (typeof rows)[number], b: (typeof rows)[number]) => boolean) =>
    rows.reduce((best, r) => (cmp(r, best) ? r : best), rows[0] as (typeof rows)[number]);
  const hi = by((a, b) => a.value > b.value);
  const lo = by((a, b) => a.value < b.value);
  const closest = by((a, b) => Math.abs(a.value - avg) < Math.abs(b.value - avg));
  const distances = { ...s.distances };
  rows.forEach((r) => (distances[r.playerId] = [...(distances[r.playerId] ?? []), Math.abs(r.value - avg)]));
  return {
    ...s,
    phase: "reveal",
    scores,
    distances,
    result: {
      kind: "avaliacao",
      rows,
      mean: avg,
      median: median(values),
      spread: hi.value - lo.value,
      highest: { playerId: hi.playerId, value: hi.value },
      lowest: { playerId: lo.playerId, value: lo.value },
      closest: { playerId: closest.playerId, value: closest.value },
    },
    history: [...s.history, { prompt: s.prompt.text, mean: avg }],
  };
}

export function reduceNota(s: NotaState, a: NotaAction, pool: readonly NotaChallenge[], rng: Rng): NotaState {
  const secreta = s.config.mode === "secreta";
  const usable = pool.filter((c) => c.kind === s.config.mode);
  switch (a.type) {
    case "swap-prompt": {
      assertRule(s.phase === "intro", "phase", "Só dá para trocar o tema antes de começar a rodada.");
      const drawn = drawFresh(rng, usable, s.used, s.prompt.id);
      return { ...s, prompt: drawn.item, used: drawn.used };
    }
    case "open-private":
      assertRule(secreta && s.phase === "intro", "phase", "Não é hora de ver a nota.");
      return { ...s, phase: "private" };
    case "peek":
      assertRule(secreta && s.phase === "private", "phase", "Não é hora de ver a nota.");
      assertRule(a.playerId === s.tellerId, "forbidden", "Só quem pensa nesta rodada pode ver a nota.");
      return s.peeked ? s : { ...s, peeked: true };
    case "confirm-private":
      assertRule(secreta && s.phase === "private", "phase", "Não é hora de devolver o celular.");
      assertRule(s.peeked, "not-peeked", "Veja sua nota antes de devolver o celular.");
      return { ...s, phase: "answer" };
    case "answered":
      assertRule(secreta && s.phase === "answer", "phase", "Não é hora de responder.");
      return { ...s, phase: "guess" };
    case "open-guesses":
      assertRule(!secreta && s.phase === "intro", "phase", "Não é hora de registrar notas.");
      return { ...s, phase: "guess" };
    case "guess": {
      assertRule(s.phase === "guess", "phase", "Os palpites estão fechados.");
      assertRule(guessersOf(s).includes(a.playerId), "forbidden", secreta ? "Quem deu a dica não chuta." : "Jogador desconhecido.");
      const { min, max } = s.config.range;
      assertRule(Number.isInteger(a.value) && a.value >= min && a.value <= max, "range", `A nota vai de ${min} a ${max}.`);
      if (s.guesses[a.playerId] === a.value) return s; // envio repetido: nada muda
      return { ...s, guesses: { ...s.guesses, [a.playerId]: a.value } };
    }
    case "close-guesses": {
      assertRule(s.phase === "guess", "phase", "Os palpites já foram fechados.");
      const pending = pendingGuessers(s);
      assertRule(pending.length === 0 || a.force, "pending", "Ainda falta gente responder.");
      assertRule(pending.length < guessersOf(s).length, "empty", "Ninguém respondeu ainda.");
      return settle(s);
    }
    case "show-score":
      assertRule(s.phase === "reveal", "phase", "Ainda não houve revelação.");
      return { ...s, phase: "score" };
    case "next": {
      assertRule(s.phase === "reveal" || s.phase === "score", "phase", "Termine a rodada antes de avançar.");
      if (s.round >= s.config.rounds) return { ...s, phase: "end" };
      return beginRound(s, usable, rng);
    }
  }
}

/**
 * Projeção do estado para um participante (Modo Sala). O servidor envia apenas isto:
 * a nota secreta só vai para quem pensa, e os palpites dos outros só aparecem na revelação.
 */
export function viewNotaFor(s: NotaState, viewerId: string): NotaState {
  const revealed = s.phase === "reveal" || s.phase === "score" || s.phase === "end";
  const guesses = revealed ? s.guesses : s.guesses[viewerId] !== undefined ? { [viewerId]: s.guesses[viewerId] as number } : {};
  return {
    ...s,
    secret: revealed || viewerId === s.tellerId ? s.secret : null,
    guesses,
  };
}
