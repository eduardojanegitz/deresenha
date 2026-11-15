import type { RankingChallenge } from "@/content/types";
import { assertRule, drawFresh, shuffle, type Player, type Rng } from "./core";

export interface RankingConfig {
  rounds: number;
  slots: number;
}
export const DEFAULT_RANKING_CONFIG: RankingConfig = { rounds: 3, slots: 5 };

export type RankingPhase = "placing" | "done" | "end";

export interface RankingState {
  game: "ranking";
  config: RankingConfig;
  players: Player[];
  round: number;
  phase: RankingPhase;
  list: RankingChallenge;
  /** Itens na ordem em que vão aparecer (o jogador só vê o atual). */
  queue: string[];
  index: number;
  slots: (string | null)[];
  playerId: string;
  history: { playerId: string; title: string; ranking: string[] }[];
  used: string[];
}

export type RankingAction = { type: "place"; slot: number } | { type: "next" };

function begin(s: RankingState, pool: readonly RankingChallenge[], rng: Rng): RankingState {
  const eligible = pool.filter((c) => c.items.length >= s.config.slots);
  const d = drawFresh(rng, eligible, s.used, s.list?.id);
  const round = s.round + 1;
  return {
    ...s,
    round,
    phase: "placing",
    list: d.item,
    used: d.used,
    queue: shuffle(rng, d.item.items).slice(0, s.config.slots),
    index: 0,
    slots: Array.from({ length: s.config.slots }, () => null),
    playerId: (s.players[(round - 1) % s.players.length] as Player).id,
  };
}

export function createRanking(config: RankingConfig, players: Player[], pool: readonly RankingChallenge[], rng: Rng): RankingState {
  assertRule(players.length >= 1, "players", "Coloque pelo menos uma pessoa.");
  assertRule(config.slots >= 3 && config.slots <= 7, "slots", "O ranking tem de 3 a 7 posições.");
  assertRule(pool.some((c) => c.items.length >= config.slots), "no-content", "Nenhuma lista para os temas escolhidos.");
  const s = {
    game: "ranking",
    config,
    players,
    round: 0,
    phase: "placing",
    list: undefined as unknown as RankingChallenge,
    queue: [],
    index: 0,
    slots: [],
    playerId: "",
    history: [],
    used: [],
  } satisfies RankingState;
  return begin(s, pool, rng);
}

export const currentItem = (s: RankingState) => (s.phase === "placing" ? (s.queue[s.index] as string) : null);

export function reduceRanking(s: RankingState, a: RankingAction, pool: readonly RankingChallenge[], rng: Rng): RankingState {
  switch (a.type) {
    case "place": {
      assertRule(s.phase === "placing", "phase", "Este ranking já está completo.");
      assertRule(Number.isInteger(a.slot) && a.slot >= 0 && a.slot < s.slots.length, "slot", "Posição inválida.");
      assertRule(s.slots[a.slot] === null, "locked", "Essa posição já está ocupada. A escolha é definitiva.");
      const slots = [...s.slots];
      slots[a.slot] = s.queue[s.index] as string;
      const index = s.index + 1;
      if (index < s.queue.length) return { ...s, slots, index };
      return {
        ...s,
        slots,
        index,
        phase: "done",
        history: [...s.history, { playerId: s.playerId, title: s.list.title, ranking: slots as string[] }],
      };
    }
    case "next":
      assertRule(s.phase === "done", "phase", "Termine o ranking antes de avançar.");
      if (s.round >= s.config.rounds) return { ...s, phase: "end" };
      return begin(s, pool, rng);
  }
}
