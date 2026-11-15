import type { QuemChallenge } from "@/content/types";
import { assertRule, drawFresh, shuffle, type Player, type Rng, zeroScores } from "./core";

/**
 * Quem Sou Eu?: o celular vai para a testa de quem adivinha. A turma vê a identidade,
 * a pessoa não. Ela faz perguntas de sim ou não; a turma responde tocando Sim ou Não,
 * o que conta as perguntas. Acertar cedo vale mais.
 */
export interface QuemConfig {
  /** Quantas voltas: em cada uma, todo mundo adivinha uma vez. */
  rounds: number;
  /** Limite de perguntas por vez. */
  questions: number;
  /** Tempo por vez, em segundos. 0 = sem tempo. */
  seconds: number;
}
export const DEFAULT_QUEM_CONFIG: QuemConfig = { rounds: 1, questions: 10, seconds: 120 };
export const QUEM_MIN = 2;
export const QUEM_QUESTION_OPTIONS = [5, 10, 15, 20];
export const QUEM_SECONDS_OPTIONS = [0, 60, 90, 120, 180];

export type QuemPhase = "pass" | "play" | "result" | "end";
export type QuemOutcome = "hit" | "miss" | "timeout";

export interface QuemState {
  game: "quem-sou-eu";
  config: QuemConfig;
  players: Player[];
  order: string[];
  /** Volta atual (1-based) e posição na ordem. */
  round: number;
  turn: number;
  phase: QuemPhase;
  guesserId: string;
  identity: QuemChallenge;
  asked: number;
  answers: ("sim" | "nao")[];
  outcome: QuemOutcome | null;
  gained: number;
  scores: Record<string, number>;
  history: { guesserId: string; name: string; outcome: QuemOutcome; asked: number; gained: number }[];
  used: string[];
}

export type QuemAction = { type: "swap" } | { type: "start" } | { type: "answer"; value: "sim" | "nao" } | { type: "hit" } | { type: "miss" } | { type: "timeout" } | { type: "next" };

/** Acertou: 1 ponto, mais 1 por pergunta que sobrou. */
export const quemPoints = (asked: number, limit: number) => 1 + Math.max(0, limit - asked);

function deal(s: QuemState, pool: readonly QuemChallenge[], rng: Rng, round: number, turn: number): QuemState {
  const d = drawFresh(rng, pool, s.used, s.identity?.id);
  return { ...s, round, turn, phase: "pass", guesserId: s.order[turn]!, identity: d.item, used: d.used, asked: 0, answers: [], outcome: null, gained: 0 };
}

export function createQuem(config: QuemConfig, players: Player[], pool: readonly QuemChallenge[], rng: Rng): QuemState {
  assertRule(players.length >= QUEM_MIN, "players", `Quem Sou Eu precisa de pelo menos ${QUEM_MIN} pessoas.`);
  assertRule(config.rounds >= 1 && config.rounds <= 5, "rounds", "Escolha de 1 a 5 voltas.");
  assertRule(config.questions >= 3 && config.questions <= 30, "questions", "O limite de perguntas vai de 3 a 30.");
  const s = {
    game: "quem-sou-eu",
    config,
    players,
    order: shuffle(rng, players.map((p) => p.id)),
    round: 1,
    turn: 0,
    phase: "pass",
    guesserId: "",
    identity: undefined as unknown as QuemChallenge,
    asked: 0,
    answers: [],
    outcome: null,
    gained: 0,
    scores: zeroScores(players.map((p) => p.id)),
    history: [],
    used: [],
  } satisfies QuemState;
  return deal(s, pool, rng, 1, 0);
}

function finish(s: QuemState, outcome: QuemOutcome): QuemState {
  const gained = outcome === "hit" ? quemPoints(s.asked, s.config.questions) : 0;
  return {
    ...s,
    phase: "result",
    outcome,
    gained,
    scores: { ...s.scores, [s.guesserId]: (s.scores[s.guesserId] ?? 0) + gained },
    history: [...s.history, { guesserId: s.guesserId, name: s.identity.name, outcome, asked: s.asked, gained }],
  };
}

export function reduceQuem(s: QuemState, act: QuemAction, pool: readonly QuemChallenge[], rng: Rng): QuemState {
  switch (act.type) {
    case "swap": {
      // Também vale logo no começo da vez, se a turma não conhecer a identidade sorteada.
      assertRule(s.phase === "pass" || (s.phase === "play" && s.asked === 0), "phase", "Só dá para trocar antes da primeira pergunta.");
      const d = drawFresh(rng, pool, s.used, s.identity.id);
      return { ...s, identity: d.item, used: d.used };
    }
    case "start":
      assertRule(s.phase === "pass", "phase", "A vez já começou.");
      return { ...s, phase: "play" };
    case "answer":
      assertRule(s.phase === "play", "phase", "Ninguém está adivinhando agora.");
      assertRule(s.asked < s.config.questions, "limit", "Acabaram as perguntas. Agora é chutar.");
      return { ...s, asked: s.asked + 1, answers: [...s.answers, act.value] };
    case "hit":
    case "miss":
    case "timeout":
      assertRule(s.phase === "play", "phase", "Ninguém está adivinhando agora.");
      return finish(s, act.type);
    case "next": {
      assertRule(s.phase === "result", "phase", "Termine a vez antes de avançar.");
      const lastTurn = s.turn + 1 >= s.order.length;
      if (lastTurn && s.round >= s.config.rounds) return { ...s, phase: "end" };
      return deal(s, pool, rng, lastTurn ? s.round + 1 : s.round, lastTurn ? 0 : s.turn + 1);
    }
  }
}
