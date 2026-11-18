import { describe, expect, it } from "vitest";
import { challengesFor } from "@/content/library";
import { seeded, type Player } from "./core";
import { createLimite, parseGuess, reduceLimite, viewLimiteFor, type LimiteState } from "./limite";

const players: Player[] = [
  { id: "a", name: "Ana", piece: "bolota" },
  { id: "b", name: "Beto", piece: "tijolo" },
  { id: "c", name: "Caio", piece: "pino" },
];
const pool = challengesFor("limite");

/** Partida com uma pergunta de resposta conhecida, para os testes de pontuação. */
function withAnswer(answer: number, rounds = 2): LimiteState {
  const s = createLimite({ rounds }, players, pool, seeded(1));
  return { ...s, item: { ...s.item, answer } };
}

describe("Jogo do Limite", () => {
  it("o mais perto leva 3, quem errou por até 10% ganha 1 a mais", () => {
    let s = withAnswer(100);
    const rng = seeded(2);
    s = reduceLimite(s, { type: "guess", playerId: "a", value: 95 }, pool, rng);
    s = reduceLimite(s, { type: "guess", playerId: "b", value: 108 }, pool, rng);
    s = reduceLimite(s, { type: "guess", playerId: "c", value: 300 }, pool, rng);
    s = reduceLimite(s, { type: "reveal" }, pool, rng);
    expect(s.winners).toEqual(["a"]);
    expect(s.gained).toEqual({ a: 4, b: 1, c: 0 });
    expect(s.wins.a).toBe(1);
  });

  it("empate na distância: os dois levam a rodada", () => {
    let s = withAnswer(50);
    const rng = seeded(3);
    s = reduceLimite(s, { type: "guess", playerId: "a", value: 40 }, pool, rng);
    s = reduceLimite(s, { type: "guess", playerId: "b", value: 60 }, pool, rng);
    s = reduceLimite(s, { type: "guess", playerId: "c", value: 10 }, pool, rng);
    s = reduceLimite(s, { type: "reveal" }, pool, rng);
    expect(s.winners.sort()).toEqual(["a", "b"]);
    expect(s.gained).toEqual({ a: 3, b: 3, c: 0 });
  });

  it("só revela com todo mundo, a não ser forçando; troca só antes do primeiro chute", () => {
    let s = withAnswer(10);
    const rng = seeded(4);
    const before = s.item.id;
    s = reduceLimite(s, { type: "swap" }, pool, rng);
    expect(s.item.id).not.toBe(before);
    s = { ...s, item: { ...s.item, answer: 10 } };
    s = reduceLimite(s, { type: "guess", playerId: "a", value: 9 }, pool, rng);
    expect(() => reduceLimite(s, { type: "swap" }, pool, rng)).toThrow(/antes de alguém chutar/);
    expect(() => reduceLimite(s, { type: "reveal" }, pool, rng)).toThrow(/falta gente/);
    s = reduceLimite(s, { type: "guess", playerId: "a", value: 11 }, pool, rng); // mudou o chute
    s = reduceLimite(s, { type: "reveal", force: true }, pool, rng);
    expect(s.gained).toEqual({ a: 4, b: 0, c: 0 });
  });

  it("termina depois da última rodada", () => {
    let s = withAnswer(1, 1);
    const rng = seeded(5);
    s = reduceLimite(s, { type: "guess", playerId: "a", value: 1 }, pool, rng);
    s = reduceLimite(s, { type: "reveal", force: true }, pool, rng);
    s = reduceLimite(s, { type: "next" }, pool, rng);
    expect(s.phase).toBe("end");
  });

  it("em sala, ninguém vê a resposta nem o chute dos outros antes de revelar", () => {
    let s = withAnswer(77);
    s = reduceLimite(s, { type: "guess", playerId: "a", value: 70 }, pool, seeded(6));
    const v = viewLimiteFor(s, "b");
    expect(v.item.answer).toBeNull();
    expect(v.item.fact).toBeNull();
    expect(v.guesses).toBeNull();
    expect(v.guessed).toEqual(["a"]);
    expect(v.myGuess).toBeNull();
    expect(viewLimiteFor(s, "a").myGuess).toBe(70);
    expect(JSON.stringify(v)).not.toContain("77");
  });

  it("lê números do jeito brasileiro", () => {
    expect(parseGuess("1.500")).toBe(1500);
    expect(parseGuess("2,5")).toBe(2.5);
    expect(parseGuess("1.234.567,8")).toBe(1234567.8);
    expect(parseGuess("8.65")).toBe(8.65);
    expect(parseGuess(" 42 ")).toBe(42);
    expect(parseGuess("abc")).toBeNull();
    expect(parseGuess("-3")).toBeNull();
    expect(parseGuess("")).toBeNull();
  });

  it("partidas novas pulam o que já saiu antes e recomeçam quando sobra pouca coisa", () => {
    const seen = pool.slice(0, pool.length - 4).map((c) => c.id);
    const a = createLimite({ rounds: 1 }, players, pool, seeded(5), seen);
    expect(seen).not.toContain(a.item.id);
    expect(a.used.length).toBe(seen.length + 1);
    // Sobram 4 inéditas, mas a partida pede 10 rodadas: começa do zero.
    const b = createLimite({ rounds: 10 }, players, pool, seeded(5), seen);
    expect(b.used).toEqual([b.item.id]);
  });
});
