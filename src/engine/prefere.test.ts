import { describe, expect, it } from "vitest";
import { challengesFor } from "@/content/library";
import { RuleError, seeded, type Player } from "./core";
import { createPrefere, DEFAULT_PREFERE_CONFIG, reducePrefere } from "./prefere";

const pool = challengesFor("voce-prefere");
const players: Player[] = ["Ana", "Beto", "Caio"].map((name, i) => ({ id: `p${i}`, name, piece: "bolota" }));

describe("Você Prefere?", () => {
  it("revela só com todos e pontua a maioria quando ligado", () => {
    const rng = seeded(1);
    let s = createPrefere({ ...DEFAULT_PREFERE_CONFIG, scoreMajority: true }, players, pool, rng);
    s = reducePrefere(s, { type: "open-vote" }, pool, rng);
    s = reducePrefere(s, { type: "vote", playerId: "p0", choice: "a" }, pool, rng);
    s = reducePrefere(s, { type: "vote", playerId: "p1", choice: "a" }, pool, rng);
    expect(() => reducePrefere(s, { type: "reveal" }, pool, rng)).toThrow(/falta gente/);
    s = reducePrefere(s, { type: "vote", playerId: "p2", choice: "b" }, pool, rng);
    s = reducePrefere(s, { type: "reveal" }, pool, rng);
    expect(s.scores).toEqual({ p0: 1, p1: 1, p2: 0 });
    expect(s.history[0]).toMatchObject({ countA: 2, countB: 1 });
  });

  it("empate não dá ponto e o jogo termina na última rodada", () => {
    const rng = seeded(2);
    const two = players.slice(0, 2);
    let s = createPrefere({ rounds: 1, scoreMajority: true }, two, pool, rng);
    s = reducePrefere(s, { type: "open-vote" }, pool, rng);
    s = reducePrefere(s, { type: "vote", playerId: "p0", choice: "a" }, pool, rng);
    s = reducePrefere(s, { type: "vote", playerId: "p1", choice: "b" }, pool, rng);
    s = reducePrefere(s, { type: "reveal" }, pool, rng);
    expect(s.scores).toEqual({ p0: 0, p1: 0 });
    s = reducePrefere(s, { type: "next" }, pool, rng);
    expect(s.phase).toBe("end");
    expect(() => reducePrefere(s, { type: "next" }, pool, rng)).toThrow(RuleError);
  });
});
