import { describe, expect, it } from "vitest";
import { toChallenges, validateSet, type CustomSet } from "@/custom/customSets";
import { addRecord, computeStats, winnersOf, type MatchRecord } from "./history";

const rec = (id: string, game: string, players: [string, number][], scored = true): MatchRecord => ({ id, game, at: 0, scored, players: players.map(([name, score]) => ({ name, score })) });

describe("histórico", () => {
  it("não registra a mesma partida duas vezes", () => {
    const a = rec("1", "nota", [["Ana", 10]]);
    expect(addRecord(addRecord([], a), a)).toHaveLength(1);
  });

  it("vencedores: empate conta para todos, zero a zero não tem vencedor, jogo sem placar também não", () => {
    expect(winnersOf(rec("1", "nota", [["Ana", 3], ["Beto", 3], ["Caio", 1]]))).toEqual(["Ana", "Beto"]);
    expect(winnersOf(rec("2", "nota", [["Ana", 0], ["Beto", 0]]))).toEqual([]);
    expect(winnersOf(rec("3", "ranking", [["Ana", 5]], false))).toEqual([]);
  });

  it("estatísticas juntam apelidos sem diferenciar maiúsculas", () => {
    const s = computeStats([rec("1", "nota", [["Ana", 3], ["beto", 1]]), rec("2", "nota", [["ana", 5], ["Beto", 2]]), rec("3", "mimica", [["Beto", 4], ["Ana", 1]])]);
    expect(s.matches).toBe(3);
    expect(s.favoriteGame).toEqual({ game: "nota", count: 2 });
    expect(s.topWinner).toEqual({ name: "Ana", wins: 2 });
    expect(s.regulars.map((r) => r.matches)).toEqual([3, 3]);
  });
});

describe("temas personalizados", () => {
  const set = (game: CustomSet["game"], lines: string[], name = "Nossa turma"): CustomSet => ({ id: "x", name, game, lines, updatedAt: 0 });

  it("valida o formato de cada jogo", () => {
    expect(validateSet(set("mimica", []))).toMatch(/pelo menos uma/);
    expect(validateSet(set("infiltrado", ["Praia / Piscina", "Só uma palavra"]))).toMatch(/linha 2/);
    expect(validateSet(set("infiltrado", ["Praia / praia"]))).toMatch(/linha 1/);
    expect(validateSet(set("ranking", ["a", "b", "c"]))).toMatch(/pelo menos 5/);
    expect(validateSet(set("ranking", ["a", "b", "c", "d", "A"]))).toMatch(/repetidos/);
    expect(validateSet(set("nota-secreta", ["Apelidos do professor"], "x"))).toMatch(/nome/);
    expect(validateSet(set("prefere", ["Pagar a conta / Lavar a louça"]))).toBeNull();
  });

  it("vira desafios no mesmo formato do conteúdo oficial", () => {
    const c = toChallenges(set("infiltrado", [" Praia  /  Piscina ", "", "Bar / Boteco"]));
    expect(c).toHaveLength(2);
    expect(c[0]).toMatchObject({ game: "infiltrado", theme: "meu-x", major: "Praia", impostor: "Piscina" });
    const r = toChallenges(set("ranking", ["a", "b", "c", "d", "e"], "Salgados da cantina"));
    expect(r[0]).toMatchObject({ game: "ranking", title: "Salgados da cantina", items: ["a", "b", "c", "d", "e"] });
    expect(toChallenges(set("nota-avaliacao", ["O churrasco do Beto"]))[0]).toMatchObject({ game: "nota", kind: "avaliacao" });
  });
});
