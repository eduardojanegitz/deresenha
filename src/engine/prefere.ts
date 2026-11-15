import type { PrefereChallenge } from "@/content/types";
import { assertRule, drawFresh, type Player, type Rng, zeroScores } from "./core";

/**
 * Você Prefere?: um dilema, cada um escolhe A ou B em segredo, revela tudo junto.
 * Pontuação opcional: quem ficou com a maioria ganha 1 ponto (empate não pontua).
 */
export interface PrefereConfig {
  rounds: number;
  scoreMajority: boolean;
}
export const DEFAULT_PREFERE_CONFIG: PrefereConfig = { rounds: 6, scoreMajority: false };
export const PREFERE_MIN = 2;

export type PrefereChoice = "a" | "b";
export type PreferePhase = "question" | "vote" | "reveal" | "end";

export interface PrefereState {
  game: "voce-prefere";
  config: PrefereConfig;
  players: Player[];
  round: number;
  phase: PreferePhase;
  dilemma: PrefereChallenge;
  votes: Record<string, PrefereChoice>;
  scores: Record<string, number>;
  /** Quantas vezes cada um ficou com a maioria (para o resumo final). */
  withMajority: Record<string, number>;
  history: { a: string; b: string; countA: number; countB: number }[];
  used: string[];
}

export type PrefereAction = { type: "swap" } | { type: "open-vote" } | { type: "vote"; playerId: string; choice: PrefereChoice } | { type: "reveal" } | { type: "next" };

function begin(s: PrefereState, pool: readonly PrefereChallenge[], rng: Rng): PrefereState {
  const d = drawFresh(rng, pool, s.used, s.dilemma?.id);
  return { ...s, round: s.round + 1, phase: "question", dilemma: d.item, used: d.used, votes: {} };
}

export function createPrefere(config: PrefereConfig, players: Player[], pool: readonly PrefereChallenge[], rng: Rng): PrefereState {
  assertRule(players.length >= PREFERE_MIN, "players", `Você Prefere precisa de pelo menos ${PREFERE_MIN} pessoas.`);
  assertRule(config.rounds >= 1 && config.rounds <= 20, "rounds", "Escolha entre 1 e 20 rodadas.");
  const ids = players.map((p) => p.id);
  const s = {
    game: "voce-prefere",
    config,
    players,
    round: 0,
    phase: "question",
    dilemma: undefined as unknown as PrefereChallenge,
    votes: {},
    scores: zeroScores(ids),
    withMajority: zeroScores(ids),
    history: [],
    used: [],
  } satisfies PrefereState;
  return begin(s, pool, rng);
}

export function tallyPrefere(votes: Record<string, PrefereChoice>) {
  const v = Object.values(votes);
  const a = v.filter((x) => x === "a").length;
  const b = v.length - a;
  return { a, b, majority: a === b ? null : a > b ? ("a" as const) : ("b" as const) };
}

export function reducePrefere(s: PrefereState, act: PrefereAction, pool: readonly PrefereChallenge[], rng: Rng): PrefereState {
  switch (act.type) {
    case "swap": {
      assertRule(s.phase === "question", "phase", "Só dá para trocar antes da votação.");
      const d = drawFresh(rng, pool, s.used, s.dilemma.id);
      return { ...s, dilemma: d.item, used: d.used };
    }
    case "open-vote":
      assertRule(s.phase === "question", "phase", "A votação já começou.");
      return { ...s, phase: "vote" };
    case "vote":
      assertRule(s.phase === "vote", "phase", "A votação está fechada.");
      assertRule(s.players.some((p) => p.id === act.playerId), "forbidden", "Jogador desconhecido.");
      assertRule(act.choice === "a" || act.choice === "b", "choice", "Escolha uma das duas opções.");
      if (s.votes[act.playerId] === act.choice) return s;
      return { ...s, votes: { ...s.votes, [act.playerId]: act.choice } };
    case "reveal": {
      assertRule(s.phase === "vote", "phase", "Não há votação aberta.");
      assertRule(Object.keys(s.votes).length === s.players.length, "pending", "Ainda falta gente escolher.");
      const t = tallyPrefere(s.votes);
      const scores = { ...s.scores };
      const withMajority = { ...s.withMajority };
      if (t.majority) {
        for (const [id, c] of Object.entries(s.votes)) {
          if (c !== t.majority) continue;
          withMajority[id] = (withMajority[id] ?? 0) + 1;
          if (s.config.scoreMajority) scores[id] = (scores[id] ?? 0) + 1;
        }
      }
      return { ...s, phase: "reveal", scores, withMajority, history: [...s.history, { a: s.dilemma.a, b: s.dilemma.b, countA: t.a, countB: t.b }] };
    }
    case "next":
      assertRule(s.phase === "reveal", "phase", "Revele antes de avançar.");
      if (s.round >= s.config.rounds) return { ...s, phase: "end" };
      return begin(s, pool, rng);
  }
}
