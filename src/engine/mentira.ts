import type { MentiraChallenge } from "@/content/types";
import { assertRule, drawFresh, shuffle, type Player, type Rng, zeroScores } from "./core";

/**
 * Mentira Sincera: na sua vez, você recebe uma pergunta pessoal e uma missão secreta
 * sorteada pelo app: contar a VERDADE ou inventar uma MENTIRA. Você conta a história e a
 * turma vota se acredita. Quem acerta pontua; quem conta pontua por cada pessoa que enganou.
 */
export interface MentiraConfig {
  /** Quantas vezes cada pessoa conta uma história. */
  turns: number;
}
export const DEFAULT_MENTIRA_CONFIG: MentiraConfig = { turns: 1 };
export const MENTIRA_MIN = 3;
/** Acertar se era verdade ou mentira. */
export const MENTIRA_HIT_POINTS = 1;
/** Quem conta ganha isso por pessoa que caiu na história. */
export const MENTIRA_FOOL_POINTS = 1;

export type MentiraVote = "verdade" | "mentira";
/**
 * secret: quem conta vê a pergunta e a missão. tell: conta a história em voz alta.
 * vote: a turma vota. reveal: aparece o que era. end: fim da partida.
 */
export type MentiraPhase = "secret" | "tell" | "vote" | "reveal" | "end";

export interface MentiraState {
  game: "mentira";
  config: MentiraConfig;
  players: Player[];
  /** Ordem de quem conta, sorteada no começo. */
  order: string[];
  round: number;
  totalRounds: number;
  phase: MentiraPhase;
  tellerId: string;
  prompt: { id: string; theme: string; text: string };
  /** A missão: true = contar a verdade. Fixa na rodada, mesmo trocando a pergunta. */
  truth: boolean;
  /** Quem conta já viu a missão. */
  seen: boolean;
  votes: Record<string, MentiraVote>;
  gained: Record<string, number>;
  scores: Record<string, number>;
  /** Quantas pessoas cada um enganou ao contar (para o resumo). */
  fooled: Record<string, number>;
  /** Quantas vezes cada um acertou ao votar (para o resumo). */
  hits: Record<string, number>;
  used: string[];
}

export type MentiraAction =
  | { type: "seen"; playerId: string }
  | { type: "swap" }
  | { type: "start-telling" }
  | { type: "open-vote" }
  | { type: "vote"; playerId: string; choice: MentiraVote }
  | { type: "reveal"; force?: boolean }
  | { type: "next" };

export const votersOf = (s: Pick<MentiraState, "players" | "tellerId">) => s.players.filter((p) => p.id !== s.tellerId);

function begin(s: MentiraState, pool: readonly MentiraChallenge[], rng: Rng): MentiraState {
  const round = s.round + 1;
  const d = drawFresh(rng, pool, s.used, s.prompt?.id);
  return {
    ...s,
    round,
    phase: "secret",
    tellerId: s.order[(round - 1) % s.order.length]!,
    prompt: { id: d.item.id, theme: d.item.theme, text: d.item.text },
    truth: rng() < 0.5,
    seen: false,
    votes: {},
    gained: {},
    used: d.used,
  };
}

export function createMentira(config: MentiraConfig, players: Player[], pool: readonly MentiraChallenge[], rng: Rng): MentiraState {
  assertRule(players.length >= MENTIRA_MIN, "players", `Mentira Sincera precisa de pelo menos ${MENTIRA_MIN} pessoas.`);
  assertRule(Number.isInteger(config.turns) && config.turns >= 1 && config.turns <= 3, "turns", "Cada pessoa conta de 1 a 3 histórias.");
  const ids = players.map((p) => p.id);
  const s = {
    game: "mentira",
    config,
    players,
    order: shuffle(rng, ids),
    round: 0,
    totalRounds: ids.length * config.turns,
    phase: "secret",
    tellerId: "",
    prompt: undefined as unknown as MentiraState["prompt"],
    truth: true,
    seen: false,
    votes: {},
    gained: {},
    scores: zeroScores(ids),
    fooled: zeroScores(ids),
    hits: zeroScores(ids),
    used: [],
  } satisfies MentiraState;
  return begin(s, pool, rng);
}

function reveal(s: MentiraState): MentiraState {
  const right: MentiraVote = s.truth ? "verdade" : "mentira";
  const gained: Record<string, number> = {};
  const scores = { ...s.scores };
  const hits = { ...s.hits };
  let fooledNow = 0;
  for (const p of votersOf(s)) {
    const v = s.votes[p.id];
    if (v === undefined) continue;
    if (v === right) {
      gained[p.id] = MENTIRA_HIT_POINTS;
      hits[p.id] = (hits[p.id] ?? 0) + 1;
    } else fooledNow++;
  }
  gained[s.tellerId] = fooledNow * MENTIRA_FOOL_POINTS;
  for (const [id, g] of Object.entries(gained)) scores[id] = (scores[id] ?? 0) + g;
  const fooled = { ...s.fooled, [s.tellerId]: (s.fooled[s.tellerId] ?? 0) + fooledNow };
  return { ...s, phase: "reveal", gained, scores, hits, fooled };
}

export function reduceMentira(s: MentiraState, act: MentiraAction, pool: readonly MentiraChallenge[], rng: Rng): MentiraState {
  switch (act.type) {
    case "seen":
      assertRule(s.phase === "secret", "phase", "A missão já foi vista.");
      assertRule(act.playerId === s.tellerId, "forbidden", "Só quem conta a história vê a missão.");
      return { ...s, seen: true };
    case "swap": {
      // Quem tirou "verdade" e não tem história real pode trocar a pergunta. A missão fica.
      assertRule(s.phase === "secret", "phase", "Só dá para trocar a pergunta antes de começar a contar.");
      const d = drawFresh(rng, pool, s.used, s.prompt.id);
      return { ...s, prompt: { id: d.item.id, theme: d.item.theme, text: d.item.text }, used: d.used };
    }
    case "start-telling":
      assertRule(s.phase === "secret", "phase", "A história já começou.");
      assertRule(s.seen, "not-seen", "Quem conta precisa ver a missão antes.");
      return { ...s, phase: "tell" };
    case "open-vote":
      assertRule(s.phase === "tell", "phase", "A votação não pode abrir agora.");
      return { ...s, phase: "vote" };
    case "vote":
      assertRule(s.phase === "vote", "phase", "A votação está fechada.");
      assertRule(act.playerId !== s.tellerId, "teller", "Quem conta a história não vota.");
      assertRule(s.players.some((p) => p.id === act.playerId), "forbidden", "Você não está nesta partida.");
      assertRule(act.choice === "verdade" || act.choice === "mentira", "choice", "Escolha verdade ou mentira.");
      return { ...s, votes: { ...s.votes, [act.playerId]: act.choice } };
    case "reveal": {
      assertRule(s.phase === "vote", "phase", "Abra a votação antes de revelar.");
      const n = Object.keys(s.votes).length;
      assertRule(n > 0, "empty", "Ninguém votou ainda.");
      assertRule(act.force || n === votersOf(s).length, "pending", "Ainda falta gente votar.");
      return reveal(s);
    }
    case "next":
      assertRule(s.phase === "reveal", "phase", "Revele antes de passar a vez.");
      if (s.round >= s.totalRounds) return { ...s, phase: "end" };
      return begin(s, pool, rng);
  }
}

/** O que cada um recebe em sala: a missão só para quem conta; os votos só depois de revelar. */
export interface MentiraView extends Omit<MentiraState, "truth" | "votes" | "used" | "order"> {
  truth: boolean | null;
  voted: string[];
  myVote: MentiraVote | null;
  votes: Record<string, MentiraVote> | null;
}

export function viewMentiraFor(s: MentiraState, viewerId: string): MentiraView {
  const open = s.phase === "reveal" || s.phase === "end";
  const { used: _u, order: _o, votes, truth, ...rest } = s;
  return {
    ...rest,
    truth: open || viewerId === s.tellerId ? truth : null,
    voted: Object.keys(votes),
    myVote: votes[viewerId] ?? null,
    votes: open ? votes : null,
  };
}
