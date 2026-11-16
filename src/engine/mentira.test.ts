import { describe, expect, it } from "vitest";
import { challengesFor } from "@/content/library";
import { seeded, type Player } from "./core";
import { createMentira, reduceMentira, viewMentiraFor, type MentiraState } from "./mentira";

const players: Player[] = [
  { id: "a", name: "Ana", piece: "bolota" },
  { id: "b", name: "Beto", piece: "tijolo" },
  { id: "c", name: "Caio", piece: "pino" },
  { id: "d", name: "Duda", piece: "meialua" },
];
const pool = challengesFor("mentira");
const rng = seeded(9);

/** Rodada pronta para votar, com a missão escolhida. */
function voting(truth: boolean): MentiraState {
  let s = createMentira({ turns: 1 }, players, pool, seeded(1));
  s = { ...s, truth };
  s = reduceMentira(s, { type: "seen", playerId: s.tellerId }, pool, rng);
  s = reduceMentira(s, { type: "start-telling" }, pool, rng);
  return reduceMentira(s, { type: "open-vote" }, pool, rng);
}
const others = (s: MentiraState) => s.players.filter((p) => p.id !== s.tellerId).map((p) => p.id);

describe("Mentira Sincera", () => {
  it("quem acerta ganha 1; quem conta ganha 1 por pessoa enganada", () => {
    let s = voting(false);
    const [x, y, z] = others(s) as [string, string, string];
    s = reduceMentira(s, { type: "vote", playerId: x, choice: "mentira" }, pool, rng);
    s = reduceMentira(s, { type: "vote", playerId: y, choice: "verdade" }, pool, rng);
    s = reduceMentira(s, { type: "vote", playerId: z, choice: "verdade" }, pool, rng);
    s = reduceMentira(s, { type: "reveal" }, pool, rng);
    expect(s.gained).toEqual({ [x]: 1, [s.tellerId]: 2 });
    expect(s.fooled[s.tellerId]).toBe(2);
    expect(s.hits[x]).toBe(1);
  });

  it("quem conta não vota, precisa ver a missão antes de contar e só revela com todos", () => {
    let s = createMentira({ turns: 1 }, players, pool, seeded(2));
    expect(() => reduceMentira(s, { type: "start-telling" }, pool, rng)).toThrow(/ver a missão/);
    expect(() => reduceMentira(s, { type: "seen", playerId: others(s)[0]! }, pool, rng)).toThrow(/Só quem conta/);
    const truth = s.truth;
    s = reduceMentira(s, { type: "swap" }, pool, rng);
    expect(s.truth).toBe(truth); // trocar a pergunta não muda a missão
    s = voting(true);
    expect(() => reduceMentira(s, { type: "vote", playerId: s.tellerId, choice: "verdade" }, pool, rng)).toThrow(/não vota/);
    s = reduceMentira(s, { type: "vote", playerId: others(s)[0]!, choice: "verdade" }, pool, rng);
    expect(() => reduceMentira(s, { type: "reveal" }, pool, rng)).toThrow(/falta gente/);
    expect(reduceMentira(s, { type: "reveal", force: true }, pool, rng).phase).toBe("reveal");
  });

  it("cada um conta na sua vez e a partida acaba depois da última história", () => {
    let s = createMentira({ turns: 1 }, players, pool, seeded(3));
    const tellers: string[] = [];
    while (s.phase !== "end") {
      tellers.push(s.tellerId);
      s = reduceMentira(s, { type: "seen", playerId: s.tellerId }, pool, rng);
      s = reduceMentira(s, { type: "start-telling" }, pool, rng);
      s = reduceMentira(s, { type: "open-vote" }, pool, rng);
      s = reduceMentira(s, { type: "vote", playerId: others(s)[0]!, choice: "verdade" }, pool, rng);
      s = reduceMentira(s, { type: "reveal", force: true }, pool, rng);
      s = reduceMentira(s, { type: "next" }, pool, rng);
    }
    expect(tellers.sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("em sala, só quem conta vê a missão e ninguém vê os votos antes de revelar", () => {
    let s = voting(true);
    const voter = others(s)[0]!;
    s = reduceMentira(s, { type: "vote", playerId: voter, choice: "mentira" }, pool, rng);
    expect(viewMentiraFor(s, s.tellerId).truth).toBe(true);
    const v = viewMentiraFor(s, others(s)[1]!);
    expect(v.truth).toBeNull();
    expect(v.votes).toBeNull();
    expect(v.voted).toEqual([voter]);
    expect(viewMentiraFor(s, voter).myVote).toBe("mentira");
    expect(JSON.stringify(v)).not.toContain("order");
  });
});
