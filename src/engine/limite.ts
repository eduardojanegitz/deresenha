import type { LimiteChallenge } from "@/content/types";
import { assertRule, carryUsed, drawFresh, type Player, type Rng, zeroScores } from "./core";

/**
 * Jogo do Limite: aparece uma pergunta que quase ninguém sabe a resposta (o tamanho da
 * maior unha do mundo, quantas luas tem Saturno…) e cada um chuta um número em segredo.
 * Quem chegar mais perto do valor real leva a rodada.
 */
export interface LimiteConfig {
  rounds: number;
}
export const DEFAULT_LIMITE_CONFIG: LimiteConfig = { rounds: 8 };
export const LIMITE_MIN = 2;
/** Maior número aceito num chute (cabe com folga em qualquer resposta do conteúdo). */
export const LIMITE_MAX_GUESS = 1e13;
/** Quem chega mais perto ganha isso (empatados, todos ganham). */
export const LIMITE_CLOSEST_POINTS = 3;
/** Bônus para quem errou por até 10% do valor real, mesmo sem ser o mais perto. */
export const LIMITE_NEAR_POINTS = 1;
export const LIMITE_NEAR_RATIO = 0.1;

export type LimitePhase = "guess" | "reveal" | "end";

export interface LimiteItem {
  id: string;
  theme: string;
  question: string;
  unit: string;
  answer: number;
  fact?: string;
}

export interface LimiteState {
  game: "limite";
  config: LimiteConfig;
  players: Player[];
  round: number;
  phase: LimitePhase;
  item: LimiteItem;
  guesses: Record<string, number>;
  /** Pontos ganhos na última revelação. */
  gained: Record<string, number>;
  /** Quem chegou mais perto na última revelação (pode ser mais de um, no empate). */
  winners: string[];
  scores: Record<string, number>;
  /** Quantas rodadas cada um levou (para o resumo final). */
  wins: Record<string, number>;
  used: string[];
}

export type LimiteAction = { type: "guess"; playerId: string; value: number } | { type: "swap" } | { type: "reveal"; force?: boolean } | { type: "next" };

const toItem = (c: LimiteChallenge): LimiteItem => ({ id: c.id, theme: c.theme, question: c.question, unit: c.unit, answer: c.answer, ...(c.fact ? { fact: c.fact } : {}) });

function begin(s: LimiteState, pool: readonly LimiteChallenge[], rng: Rng): LimiteState {
  const d = drawFresh(rng, pool, s.used, s.item?.id);
  return { ...s, round: s.round + 1, phase: "guess", item: toItem(d.item), used: d.used, guesses: {}, gained: {}, winners: [] };
}

/** `seen`: ids que já saíram em partidas anteriores (no aparelho ou na sala), para não repetir. */
export function createLimite(config: LimiteConfig, players: Player[], pool: readonly LimiteChallenge[], rng: Rng, seen: readonly string[] = []): LimiteState {
  assertRule(players.length >= LIMITE_MIN, "players", `O Jogo do Limite precisa de pelo menos ${LIMITE_MIN} pessoas.`);
  assertRule(Number.isInteger(config.rounds) && config.rounds >= 1 && config.rounds <= 20, "rounds", "Escolha entre 1 e 20 rodadas.");
  const ids = players.map((p) => p.id);
  const s = {
    game: "limite",
    config,
    players,
    round: 0,
    phase: "guess",
    item: undefined as unknown as LimiteItem,
    guesses: {},
    gained: {},
    winners: [],
    scores: zeroScores(ids),
    wins: zeroScores(ids),
    used: carryUsed(pool, seen, config.rounds + 3),
  } satisfies LimiteState;
  return begin(s, pool, rng);
}

/** Distância de cada chute até o valor real, do mais perto para o mais longe. */
export function limiteDistances(answer: number, guesses: Record<string, number>) {
  return Object.entries(guesses)
    .map(([id, value]) => ({ id, value, diff: Math.abs(value - answer) }))
    .sort((a, b) => a.diff - b.diff);
}

export const isNear = (answer: number, value: number) => Math.abs(value - answer) <= Math.abs(answer) * LIMITE_NEAR_RATIO;

function reveal(s: LimiteState): LimiteState {
  const rows = limiteDistances(s.item.answer, s.guesses);
  const best = rows[0]?.diff;
  const winners = best === undefined ? [] : rows.filter((r) => r.diff === best).map((r) => r.id);
  const gained: Record<string, number> = {};
  const scores = { ...s.scores };
  const wins = { ...s.wins };
  for (const p of s.players) {
    const v = s.guesses[p.id];
    let g = 0;
    if (winners.includes(p.id)) g += LIMITE_CLOSEST_POINTS;
    if (v !== undefined && isNear(s.item.answer, v)) g += LIMITE_NEAR_POINTS;
    gained[p.id] = g;
    scores[p.id] = (scores[p.id] ?? 0) + g;
    if (winners.includes(p.id)) wins[p.id] = (wins[p.id] ?? 0) + 1;
  }
  return { ...s, phase: "reveal", winners, gained, scores, wins };
}

export function reduceLimite(s: LimiteState, act: LimiteAction, pool: readonly LimiteChallenge[], rng: Rng): LimiteState {
  switch (act.type) {
    case "guess":
      assertRule(s.phase === "guess", "phase", "Os chutes desta pergunta já fecharam.");
      assertRule(s.players.some((p) => p.id === act.playerId), "forbidden", "Você não está nesta partida.");
      assertRule(Number.isFinite(act.value) && act.value >= 0 && act.value <= LIMITE_MAX_GUESS, "value", "Digite um número válido.");
      // Dá para mudar o chute até revelar.
      return { ...s, guesses: { ...s.guesses, [act.playerId]: act.value } };
    case "swap": {
      assertRule(s.phase === "guess" && Object.keys(s.guesses).length === 0, "phase", "Só dá para trocar a pergunta antes de alguém chutar.");
      const d = drawFresh(rng, pool, s.used, s.item.id);
      return { ...s, item: toItem(d.item), used: d.used };
    }
    case "reveal":
      assertRule(s.phase === "guess", "phase", "Essa pergunta já foi revelada.");
      assertRule(Object.keys(s.guesses).length > 0, "empty", "Ninguém chutou ainda.");
      assertRule(act.force || Object.keys(s.guesses).length === s.players.length, "pending", "Ainda falta gente chutar.");
      return reveal(s);
    case "next":
      assertRule(s.phase === "reveal", "phase", "Revele a resposta antes de avançar.");
      if (s.round >= s.config.rounds) return { ...s, phase: "end" };
      return begin(s, pool, rng);
  }
}

/** O que cada participante recebe em sala. Antes de revelar: sem a resposta e sem os chutes alheios. */
export interface LimiteView extends Omit<LimiteState, "item" | "guesses" | "used"> {
  item: Omit<LimiteItem, "answer" | "fact" | "id"> & { answer: number | null; fact: string | null };
  guessed: string[];
  myGuess: number | null;
  guesses: Record<string, number> | null;
}

export function viewLimiteFor(s: LimiteState, viewerId: string): LimiteView {
  const open = s.phase === "guess";
  const { used: _u, guesses, item, ...rest } = s;
  return {
    ...rest,
    item: { theme: item.theme, question: item.question, unit: item.unit, answer: open ? null : item.answer, fact: open ? null : (item.fact ?? null) },
    guessed: Object.keys(guesses),
    myGuess: guesses[viewerId] ?? null,
    guesses: open ? null : guesses,
  };
}

/**
 * Lê o número como o brasileiro escreve: "1.500" é mil e quinhentos, "2,5" é dois e meio.
 * Um ponto que não separa milhar ("8.65", vindo de teclado em inglês) vale como vírgula.
 */
export function parseGuess(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, "");
  if (!t) return null;
  let normal: string;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) normal = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d+(,\d+)?$/.test(t)) normal = t.replace(",", ".");
  else if (/^\d+\.\d+$/.test(t)) normal = t;
  else return null;
  const n = Number(normal);
  return Number.isFinite(n) && n <= LIMITE_MAX_GUESS ? n : null;
}

export const formatNumber = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
