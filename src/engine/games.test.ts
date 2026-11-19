import { describe, expect, it } from "vitest";
import { challengesFor } from "@/content/library";
import { RuleError, seeded, type Player } from "./core";
import { addChampionship, normalizeScores } from "./championship";
import { createInfiltrado, DEFAULT_INFILTRADO_CONFIG, pickImpostor, reduceInfiltrado, sameWord, viewInfiltradoFor, wordFor, type InfiltradoMode, type InfiltradoState } from "./infiltrado";
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

  it("sorteio do infiltrado espalha entre a turma, mas ainda pode repetir", () => {
    const rng = seeded(21);
    const counts: Record<string, number> = {};
    let repeats = 0;
    let recent: string[] = [];
    for (let i = 0; i < 1000; i++) {
      const id = pickImpostor(players, recent, rng);
      if (id === recent[recent.length - 1]) repeats++;
      counts[id] = (counts[id] ?? 0) + 1;
      recent = [...recent, id].slice(-24);
    }
    // 5 pessoas, 1000 rodadas: cada uma perto de 200, sem ninguém sumir ou dominar.
    players.forEach((p) => expect(counts[p.id]).toBeGreaterThan(150));
    players.forEach((p) => expect(counts[p.id]).toBeLessThan(250));
    // Repetir logo em seguida é raro (no sorteio puro seria ~20%), mas acontece.
    expect(repeats).toBeGreaterThan(0);
    expect(repeats).toBeLessThan(60);
  });

  it("a partida seguinte lembra quem foi infiltrado e passa adiante no fim de cada rodada", () => {
    const rng = seeded(22);
    let s = createInfiltrado({ ...DEFAULT_INFILTRADO_CONFIG, rounds: 4 }, players, pool, rng, ["ana", "ana", "ana", "fantasma"]);
    expect(s.recentImpostors?.includes("fantasma")).toBe(false);
    expect(s.recentImpostors?.at(-1)).toBe(s.impostorId);
    expect(viewInfiltradoFor(s, "beto")).not.toHaveProperty("recentImpostors");
  });

  describe("modos em que o infiltrado sabe", () => {
    const withMode = (mode: InfiltradoMode, rng = seeded(11)): InfiltradoState => {
      let s = createInfiltrado({ ...DEFAULT_INFILTRADO_CONFIG, mode }, players, pool, rng);
      players.forEach((p) => (s = reduceInfiltrado(s, { type: "seen", playerId: p.id }, pool, rng)));
      s = reduceInfiltrado(s, { type: "start-hints" }, pool, rng);
      return reduceInfiltrado(s, { type: "open-vote" }, pool, rng);
    };
    const catchIt = (s: InfiltradoState, rng = seeded(12)) => {
      const imp = s.impostorId;
      const scapegoat = players.find((p) => p.id !== imp)!.id;
      players.forEach((p) => (s = reduceInfiltrado(s, { type: "vote", voterId: p.id, targetId: p.id === imp ? scapegoat : imp }, pool, rng)));
      return reduceInfiltrado(s, { type: "close-vote" }, pool, rng);
    };

    it("só o infiltrado é avisado; no 'sem palavra' o cartão dele vem vazio", () => {
      const sabe = withMode("sabe");
      expect(viewInfiltradoFor(sabe, sabe.impostorId).iAmImpostor).toBe(true);
      expect(viewInfiltradoFor(sabe, sabe.impostorId).myWord).toBe(sabe.pair.impostor);
      players.filter((p) => p.id !== sabe.impostorId).forEach((p) => expect(viewInfiltradoFor(sabe, p.id).iAmImpostor).toBe(false));
      const vazio = withMode("sem-palavra");
      const mine = viewInfiltradoFor(vazio, vazio.impostorId);
      expect(mine.myWord).toBeNull();
      expect(JSON.stringify(mine)).not.toContain(`"${vazio.pair.major}"`);
      expect(JSON.stringify(mine)).not.toContain(`"${vazio.pair.impostor}"`);
      const secreto = createInfiltrado(DEFAULT_INFILTRADO_CONFIG, players, pool, seeded(13));
      expect(viewInfiltradoFor(secreto, secreto.impostorId).iAmImpostor).toBe(false);
    });

    it("quem sabe que é o infiltrado nunca abre as dicas", () => {
      for (let seed = 1; seed <= 30; seed++) {
        const s = createInfiltrado({ ...DEFAULT_INFILTRADO_CONFIG, mode: "sem-palavra" }, players, pool, seeded(seed));
        expect(s.starterId).not.toBe(s.impostorId);
      }
    });

    it("infiltrado pego chuta a palavra: acertando, rouba a rodada", () => {
      const rng = seeded(14);
      let s = catchIt(withMode("sem-palavra", rng), rng);
      expect(s.phase).toBe("last-guess");
      expect(viewInfiltradoFor(s, "ana").impostorId).toBe(s.impostorId);
      const other = players.find((p) => p.id !== s.impostorId)!.id;
      expect(() => reduceInfiltrado(s, { type: "last-guess", playerId: other, guess: "x" }, pool, rng)).toThrow(/Só o infiltrado/);
      s = reduceInfiltrado(s, { type: "last-guess", playerId: s.impostorId, guess: `  ${s.pair.major.toUpperCase()} ` }, pool, rng);
      expect(s.phase).toBe("reveal");
      expect(s.result?.guessRight).toBe(true);
      expect(s.scores[s.impostorId]).toBe(3);
      players.filter((p) => p.id !== s.impostorId).forEach((p) => expect(s.scores[p.id]).toBe(1));
    });

    it("errando o chute, a turma leva a rodada normalmente", () => {
      const rng = seeded(15);
      let s = catchIt(withMode("sabe", rng), rng);
      s = reduceInfiltrado(s, { type: "last-guess", playerId: s.impostorId, guess: "palavra que não existe" }, pool, rng);
      expect(s.result?.guessRight).toBe(false);
      expect(s.scores[s.impostorId]).toBe(0);
      players.filter((p) => p.id !== s.impostorId).forEach((p) => expect(s.scores[p.id]).toBe(2));
    });

    it("no modo secreto não existe chute final", () => {
      const rng = seeded(16);
      const s = catchIt(withMode("secreto", rng), rng);
      expect(s.phase).toBe("reveal");
      expect(s.result?.guess).toBeUndefined();
    });

    it("compara o chute sem ligar para acento, artigo ou plural", () => {
      expect(sameWord("o Café ", "café")).toBe(true);
      expect(sameWord("Pães", "pãe")).toBe(true);
      expect(sameWord("geladeiras", "Geladeira")).toBe(true);
      expect(sameWord("chá", "café")).toBe(false);
      expect(sameWord("", "")).toBe(false);
    });
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
