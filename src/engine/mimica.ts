import type { Difficulty, MimicaChallenge } from "@/content/types";
import { assertRule, drawFresh, shuffle, type Player, type Rng } from "./core";

export interface MimicaConfig {
  /** "individual": cada pessoa é um time. Número: quantidade de times (2 a 4). */
  teams: "individual" | 2 | 3 | 4;
  /** Quantas vezes cada time representa. */
  turnsPerTeam: number;
  turnSec: number;
  difficulties: Difficulty[];
  /** Pulos permitidos por vez (-1 = sem limite). */
  skipsPerTurn: number;
}

export const DEFAULT_MIMICA_CONFIG: MimicaConfig = { teams: 2, turnsPerTeam: 3, turnSec: 60, difficulties: ["facil", "medio"], skipsPerTurn: 3 };

export interface Team {
  id: string;
  name: string;
  playerIds: string[];
}

export type MimicaPhase = "ready" | "acting" | "turn-end" | "end";

export interface MimicaState {
  game: "mimica";
  config: MimicaConfig;
  players: Player[];
  teams: Team[];
  turn: number; // 0-based, total = teams * turnsPerTeam
  phase: MimicaPhase;
  word: MimicaChallenge | null;
  skipsLeft: number;
  turnLog: { word: string; result: "hit" | "skip" }[];
  teamScores: Record<string, number>;
  used: string[];
}

export type MimicaAction = { type: "start-turn" } | { type: "hit" } | { type: "skip" } | { type: "time-up" } | { type: "next-turn" };

const TEAM_NAMES = ["Time Chiclete", "Time Gema", "Time Céu", "Time Lilás"];

export function buildTeams(players: Player[], mode: MimicaConfig["teams"], rng: Rng): Team[] {
  if (mode === "individual") return players.map((p) => ({ id: `t-${p.id}`, name: p.name, playerIds: [p.id] }));
  const shuffled = shuffle(rng, players);
  const teams: Team[] = Array.from({ length: mode }, (_, i) => ({ id: `t${i + 1}`, name: TEAM_NAMES[i] as string, playerIds: [] }));
  shuffled.forEach((p, i) => teams[i % mode]!.playerIds.push(p.id));
  return teams;
}

export const totalTurns = (s: Pick<MimicaState, "teams" | "config">) => s.teams.length * s.config.turnsPerTeam;
export const currentTeam = (s: MimicaState) => s.teams[s.turn % s.teams.length] as Team;
/** Dentro do time, a vez de representar gira a cada passagem do time. */
export function currentActor(s: MimicaState): Player {
  const team = currentTeam(s);
  const pass = Math.floor(s.turn / s.teams.length);
  const id = team.playerIds[pass % team.playerIds.length] as string;
  return s.players.find((p) => p.id === id) as Player;
}

function usable(pool: readonly MimicaChallenge[], cfg: MimicaConfig) {
  const f = pool.filter((c) => cfg.difficulties.includes(c.difficulty));
  return f.length ? f : pool;
}

export function createMimica(config: MimicaConfig, players: Player[], pool: readonly MimicaChallenge[], rng: Rng): MimicaState {
  assertRule(players.length >= (config.teams === "individual" ? 2 : config.teams * 2), "players", config.teams === "individual" ? "Mímica precisa de pelo menos 2 pessoas." : `Para ${config.teams} times, são pelo menos ${config.teams * 2} pessoas.`);
  assertRule(config.turnsPerTeam >= 1 && config.turnsPerTeam <= 10, "rounds", "Escolha entre 1 e 10 vezes por time.");
  assertRule(usable(pool, config).length > 0, "no-content", "Nenhuma palavra para os temas escolhidos.");
  const teams = buildTeams(players, config.teams, rng);
  return {
    game: "mimica",
    config,
    players,
    teams,
    turn: 0,
    phase: "ready",
    word: null,
    skipsLeft: config.skipsPerTurn,
    turnLog: [],
    teamScores: Object.fromEntries(teams.map((t) => [t.id, 0])),
    used: [],
  };
}

function nextWord(s: MimicaState, pool: readonly MimicaChallenge[], rng: Rng): MimicaState {
  const d = drawFresh(rng, usable(pool, s.config), s.used, s.word?.id);
  return { ...s, word: d.item, used: d.used };
}

export function reduceMimica(s: MimicaState, a: MimicaAction, pool: readonly MimicaChallenge[], rng: Rng): MimicaState {
  switch (a.type) {
    case "start-turn":
      assertRule(s.phase === "ready", "phase", "A vez já começou.");
      return nextWord({ ...s, phase: "acting", turnLog: [], skipsLeft: s.config.skipsPerTurn }, pool, rng);
    case "hit": {
      assertRule(s.phase === "acting" && s.word, "phase", "Não há palavra em jogo.");
      const team = currentTeam(s);
      return nextWord(
        { ...s, teamScores: { ...s.teamScores, [team.id]: (s.teamScores[team.id] ?? 0) + 1 }, turnLog: [...s.turnLog, { word: s.word.text, result: "hit" }] },
        pool,
        rng,
      );
    }
    case "skip":
      assertRule(s.phase === "acting" && s.word, "phase", "Não há palavra em jogo.");
      assertRule(s.skipsLeft !== 0, "no-skips", "Os pulos desta vez acabaram.");
      return nextWord({ ...s, skipsLeft: s.skipsLeft > 0 ? s.skipsLeft - 1 : s.skipsLeft, turnLog: [...s.turnLog, { word: s.word.text, result: "skip" }] }, pool, rng);
    case "time-up":
      if (s.phase !== "acting") return s; // tempo pode acabar junto com um toque: ignorar
      return { ...s, phase: "turn-end" };
    case "next-turn": {
      assertRule(s.phase === "turn-end", "phase", "Termine a vez antes de passar.");
      const turn = s.turn + 1;
      if (turn >= totalTurns(s)) return { ...s, turn, phase: "end", word: null };
      return { ...s, turn, phase: "ready", word: null };
    }
  }
}
