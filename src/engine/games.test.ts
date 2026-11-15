import { describe, expect, it } from "vitest";
import { challengesFor } from "@/content/library";
import { RuleError, seeded, type Player } from "./core";
import { addChampionship, normalizeScores } from "./championship";
import { createInfiltrado, DEFAULT_INFILTRADO_CONFIG, reduceInfiltrado, viewInfiltradoFor, wordFor, type InfiltradoState } from "./infiltrado";
import { createMimica, currentActor, currentTeam, DEFAULT_MIMICA_CONFIG, reduceMimica } from "./mimica";
import { createRanking, currentItem, DEFAULT_RANKING_CONFIG, reduceRanking } from "./ranking";

const players: Player[] = ["Ana", "Beto", "Caio", "Duda", "Eli"].map((name, i) => ({
  id: name.toLowerCase(),
  name,
  piece: (["bolota", "tijolo", "pino", "meialua", "capsula"] as const)[i]!,
}));

describe("Mímica", () => {
  const pool = challengesFor("mimica");

  it("divide os times de forma equilibrada e alterna quem representa", () => {
    const rng = seeded(1);
    let s = createMimica({ ...DEFAULT_MIMICA_CONFIG, teams: 2, turnsPerTeam: 2 }, players.slice(0, 4), pool, rng);
    expect(s.teams.map((t) => t.playerIds.length)).toEqual([2, 2]);
    const actors: string[] = [];
    for (let t = 0; t < 4; t++) {
      actors.push(currentActor(s).id);
      s = reduceMimica(s, { type: "start-turn" }, pool, rng);
      s = reduceMimica(s, { type: "time-up" }, pool, rng);
      s = reduceMimica(s, { type: "next-turn" }, pool, rng);
    }
    expect(new Set(actors).size).toBe(4);
    expect(s.phase).toBe("end");
  });

  it("acerto pontua para o time da vez, pulo respeita o limite e não repete palavra", () => {
    const rng = seeded(2);
    let s = createMimica({ ...DEFAULT_MIMICA_CONFIG, skipsPerTurn: 1 }, players.slice(0, 4), pool, rng);
    const team = currentTeam(s);
    s = reduceMimica(s, { type: "start-turn" }, pool, rng);
    const words = new Set([s.word!.id]);
    s = reduceMimica(s, { type: "hit" }, pool, rng);
    words.add(s.word!.id);
    s = reduceMimica(s, { type: "skip" }, pool, rng);
    words.add(s.word!.id);
    expect(words.size).toBe(3);
    expect(() => reduceMimica(s, { type: "skip" }, pool, rng)).toThrow(/pulos/);
    expect(s.teamScores[team.id]).toBe(1);
  });

  it("toque depois do tempo acabar é ignorado com segurança", () => {
    const rng = seeded(3);
    let s = createMimica(DEFAULT_MIMICA_CONFIG, players.slice(0, 4), pool, rng);
    s = reduceMimica(s, { type: "start-turn" }, pool, rng);
    s = reduceMimica(s, { type: "time-up" }, pool, rng);
    expect(reduceMimica(s, { type: "time-up" }, pool, rng)).toBe(s);
    expect(() => reduceMimica(s, { type: "hit" }, pool, rng)).toThrow(RuleError);
  });
});

describe("Infiltrado", () => {
  const pool = challengesFor("infiltrado");
  const ready = (rng = seeded(4)): InfiltradoState => {
    let s = createInfiltrado(DEFAULT_INFILTRADO_CONFIG, players, pool, rng);
    players.forEach((p) => (s = reduceInfiltrado(s, { type: "seen", playerId: p.id }, pool, rng)));
    s = reduceInfiltrado(s, { type: "start-hints" }, pool, rng);
    return reduceInfiltrado(s, { type: "open-vote" }, pool, rng);
  };

  it("só o infiltrado recebe a palavra diferente", () => {
    const s = createInfiltrado(DEFAULT_INFILTRADO_CONFIG, players, pool, seeded(5));
    const words = players.map((p) => wordFor(s, p.id));
    expect(words.filter((w) => w === s.pair.impostor)).toHaveLength(1);
    expect(wordFor(s, s.impostorId)).toBe(s.pair.impostor);
  });

  it("não começa as dicas antes de todos verem a palavra", () => {
    const rng = seeded(6);
    let s = createInfiltrado(DEFAULT_INFILTRADO_CONFIG, players, pool, rng);
    s = reduceInfiltrado(s, { type: "seen", playerId: "ana" }, pool, rng);
    expect(() => reduceInfiltrado(s, { type: "start-hints" }, pool, rng)).toThrow(/falta gente/);
  });

  it("pega o infiltrado e pontua quem votou certo", () => {
    const rng = seeded(7);
    let s = ready(rng);
    const imp = s.impostorId;
    const scapegoat = players.find((p) => p.id !== imp)!.id;
    players.forEach((p) => {
      const target = p.id === imp ? scapegoat : imp;
      s = reduceInfiltrado(s, { type: "vote", voterId: p.id, targetId: target }, pool, rng);
    });
    s = reduceInfiltrado(s, { type: "close-vote" }, pool, rng);
    expect(s.result?.caught).toBe(true);
    expect(s.scores[imp]).toBe(0);
    players.filter((p) => p.id !== imp).forEach((p) => expect(s.scores[p.id]).toBe(2));
  });

  it("empate leva a desempate só entre os empatados; novo empate deixa o infiltrado escapar", () => {
    const rng = seeded(8);
    let s = ready(rng);
    const [a, b, c, d, e] = players.map((p) => p.id) as [string, string, string, string, string];
    // a e b recebem 2 votos cada, c recebe 1
    const first: [string, string][] = [[a, b], [b, a], [c, a], [d, b], [e, c]];
    first.forEach(([v, t]) => (s = reduceInfiltrado(s, { type: "vote", voterId: v, targetId: t }, pool, rng)));
    s = reduceInfiltrado(s, { type: "close-vote" }, pool, rng);
    expect(s.phase).toBe("vote");
    expect(s.candidates?.sort()).toEqual([a, b].sort());
    expect(() => reduceInfiltrado(s, { type: "vote", voterId: d, targetId: c }, pool, rng)).toThrow(/empatados/);
    const second: [string, string][] = [[a, b], [b, a], [c, a], [d, b], [e, a]];
    second.forEach(([v, t]) => (s = reduceInfiltrado(s, { type: "vote", voterId: v, targetId: t }, pool, rng)));
    // a tem 3, b tem 2: decide
    s = reduceInfiltrado(s, { type: "close-vote" }, pool, rng);
    expect(s.result?.accusedId).toBe(a);
    expect(s.result?.wentToRevote).toBe(true);
  });

  it("não aceita voto em si mesmo e a projeção esconde palavras e votos alheios", () => {
    const rng = seeded(9);
    let s = ready(rng);
    expect(() => reduceInfiltrado(s, { type: "vote", voterId: "ana", targetId: "ana" }, pool, rng)).toThrow(/si mesmo/);
    s = reduceInfiltrado(s, { type: "vote", voterId: "ana", targetId: "beto" }, pool, rng);
    const v = viewInfiltradoFor(s, "caio");
    expect(v.votes).toEqual({});
    expect(v.voted).toEqual(["ana"]);
    expect(v.myVote).toBeNull();
    expect(v.impostorId).toBeNull();
    expect(v.myWord).toBe(wordFor(s, "caio"));
    expect(JSON.stringify(v)).not.toContain(s.impostorId === "caio" ? s.pair.major : s.pair.impostor);
  });
});

describe("Ranking às Cegas", () => {
  const pool = challengesFor("ranking");

  it("bloqueia posições ocupadas e termina com o ranking completo", () => {
    const rng = seeded(10);
    let s = createRanking(DEFAULT_RANKING_CONFIG, players.slice(0, 2), pool, rng);
    const order: string[] = [];
    order.push(currentItem(s)!);
    s = reduceRanking(s, { type: "place", slot: 2 }, pool, rng);
    expect(() => reduceRanking(s, { type: "place", slot: 2 }, pool, rng)).toThrow(/definitiva/);
    for (const slot of [0, 4, 1, 3]) {
      order.push(currentItem(s)!);
      s = reduceRanking(s, { type: "place", slot }, pool, rng);
    }
    expect(s.phase).toBe("done");
    expect(s.slots).toEqual([order[1], order[3], order[0], order[4], order[2]]);
    expect(new Set(s.slots).size).toBe(5);
  });

  it("alterna quem monta o ranking a cada rodada", () => {
    const rng = seeded(11);
    let s = createRanking({ rounds: 2, slots: 3 }, players.slice(0, 2), pool, rng);
    const first = s.playerId;
    [0, 1, 2].forEach((slot) => (s = reduceRanking(s, { type: "place", slot }, pool, rng)));
    s = reduceRanking(s, { type: "next" }, pool, rng);
    expect(s.playerId).not.toBe(first);
  });
});

describe("Noite de Jogos", () => {
  it("normaliza escalas diferentes para 0–100", () => {
    expect(normalizeScores({ a: 300, b: 150, c: 0 })).toEqual({ a: 100, b: 50, c: 0 });
    expect(normalizeScores({ a: 3, b: 0 })).toEqual({ a: 100, b: 0 });
    const total = addChampionship(addChampionship({}, { a: 300, b: 150 }), { a: 0, b: 3 });
    expect(total).toEqual({ a: 100, b: 150 });
  });
});
