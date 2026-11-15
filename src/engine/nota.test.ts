import { describe, expect, it } from "vitest";
import { challengesFor } from "@/content/library";
import { RuleError, seeded, type Player } from "./core";
import { createNota, DEFAULT_NOTA_CONFIG, pointsForDiff, reduceNota, viewNotaFor, type NotaConfig, type NotaState } from "./nota";

const players: Player[] = [
  { id: "a", name: "Ana", piece: "bolota" },
  { id: "b", name: "Beto", piece: "tijolo" },
  { id: "c", name: "Caio", piece: "pino" },
  { id: "d", name: "Duda", piece: "meialua" },
];
const pool = challengesFor("nota");
const cfg = (over: Partial<NotaConfig> = {}): NotaConfig => ({ ...DEFAULT_NOTA_CONFIG, ...over });

function toGuess(s: NotaState, rng = seeded(2)) {
  s = reduceNota(s, { type: "open-private" }, pool, rng);
  s = reduceNota(s, { type: "peek", playerId: s.tellerId! }, pool, rng);
  s = reduceNota(s, { type: "confirm-private" }, pool, rng);
  return reduceNota(s, { type: "answered" }, pool, rng);
}

describe("pontuação", () => {
  it("segue a tabela padrão", () => {
    const t = DEFAULT_NOTA_CONFIG.table;
    expect([0, 1, 2, 3, 4, 9].map((d) => pointsForDiff(d, t))).toEqual([100, 70, 40, 20, 0, 0]);
  });
});

describe("Nota Secreta", () => {
  it("sorteia quem pensa, um tema do modo certo e uma nota no intervalo", () => {
    const s = createNota(cfg(), players, pool, seeded(1));
    expect(players.map((p) => p.id)).toContain(s.tellerId);
    expect(s.prompt.kind).toBe("secreta");
    expect(s.secret).toBeGreaterThanOrEqual(0);
    expect(s.secret).toBeLessThanOrEqual(10);
  });

  it("exige ao menos 3 pessoas", () => {
    expect(() => createNota(cfg(), players.slice(0, 2), pool, seeded(1))).toThrow(RuleError);
  });

  it("não deixa devolver o celular sem ver a nota, nem outra pessoa espiar", () => {
    const rng = seeded(3);
    let s = createNota(cfg(), players, pool, rng);
    s = reduceNota(s, { type: "open-private" }, pool, rng);
    expect(() => reduceNota(s, { type: "confirm-private" }, pool, rng)).toThrow(/Veja sua nota/);
    const other = players.find((p) => p.id !== s.tellerId)!;
    expect(() => reduceNota(s, { type: "peek", playerId: other.id }, pool, rng)).toThrow(/Só quem pensa/);
  });

  it("quem deu a dica não chuta e notas fora do intervalo são recusadas", () => {
    const rng = seeded(4);
    const s = toGuess(createNota(cfg(), players, pool, rng), rng);
    expect(() => reduceNota(s, { type: "guess", playerId: s.tellerId!, value: 5 }, pool, rng)).toThrow(/não chuta/);
    const other = players.find((p) => p.id !== s.tellerId)!;
    expect(() => reduceNota(s, { type: "guess", playerId: other.id, value: 11 }, pool, rng)).toThrow(/de 0 a 10/);
  });

  it("calcula pontos e o bônus de quem deu a dica uma única vez", () => {
    const rng = seeded(5);
    let s = toGuess(createNota(cfg(), players, pool, rng), rng);
    const secret = s.secret!;
    const others = players.filter((p) => p.id !== s.tellerId);
    const offsets = [0, 1, 5];
    others.forEach((p, i) => {
      const v = Math.min(10, secret + offsets[i]!) === secret + offsets[i]! ? secret + offsets[i]! : secret - offsets[i]!;
      s = reduceNota(s, { type: "guess", playerId: p.id, value: v }, pool, rng);
    });
    s = reduceNota(s, { type: "close-guesses" }, pool, rng);
    expect(s.phase).toBe("reveal");
    expect(others.map((p) => s.scores[p.id])).toEqual([100, 70, 0]);
    expect(s.scores[s.tellerId!]).toBe(Math.round((100 + 70 + 0) / 3 / 2));
    // fechar de novo não aplica pontos duas vezes
    expect(() => reduceNota(s, { type: "close-guesses" }, pool, rng)).toThrow(RuleError);
  });

  it("envio duplicado do mesmo palpite não altera o estado", () => {
    const rng = seeded(6);
    let s = toGuess(createNota(cfg(), players, pool, rng), rng);
    const p = players.find((x) => x.id !== s.tellerId)!;
    s = reduceNota(s, { type: "guess", playerId: p.id, value: 4 }, pool, rng);
    expect(reduceNota(s, { type: "guess", playerId: p.id, value: 4 }, pool, rng)).toBe(s);
  });

  it("só fecha com pendências quando o tempo acaba (force)", () => {
    const rng = seeded(7);
    let s = toGuess(createNota(cfg(), players, pool, rng), rng);
    const p = players.find((x) => x.id !== s.tellerId)!;
    s = reduceNota(s, { type: "guess", playerId: p.id, value: 4 }, pool, rng);
    expect(() => reduceNota(s, { type: "close-guesses" }, pool, rng)).toThrow(/falta gente/);
    const closed = reduceNota(s, { type: "close-guesses", force: true }, pool, rng);
    expect(closed.result?.kind === "secreta" && closed.result.rows.filter((r) => r.guess === null).length).toBe(2);
  });

  it("revezamento: cada rodada tem outra pessoa pensando e o jogo termina na última", () => {
    const rng = seeded(8);
    let s = createNota(cfg({ rounds: 4 }), players, pool, rng);
    const tellers = new Set<string>();
    for (let r = 0; r < 4; r++) {
      tellers.add(s.tellerId!);
      s = toGuess(s, rng);
      for (const p of players) if (p.id !== s.tellerId) s = reduceNota(s, { type: "guess", playerId: p.id, value: 5 }, pool, rng);
      s = reduceNota(s, { type: "close-guesses" }, pool, rng);
      s = reduceNota(s, { type: "next" }, pool, rng);
    }
    expect(tellers.size).toBe(4);
    expect(s.phase).toBe("end");
  });

  it("não repete tema na mesma sessão enquanto houver temas novos", () => {
    const rng = seeded(9);
    let s = createNota(cfg({ rounds: 10 }), players, pool, rng);
    const seen = new Set<string>([s.prompt.id]);
    for (let i = 0; i < 8; i++) {
      s = reduceNota(s, { type: "swap-prompt" }, pool, rng);
      expect(seen.has(s.prompt.id)).toBe(false);
      seen.add(s.prompt.id);
    }
  });

  it("projeção do Modo Sala: só quem pensa recebe a nota antes da revelação", () => {
    const rng = seeded(10);
    let s = toGuess(createNota(cfg(), players, pool, rng), rng);
    const [p1, p2] = players.filter((x) => x.id !== s.tellerId);
    s = reduceNota(s, { type: "guess", playerId: p1!.id, value: 3 }, pool, rng);
    expect(viewNotaFor(s, s.tellerId!).secret).toBe(s.secret);
    expect(viewNotaFor(s, p1!.id).secret).toBeNull();
    expect(viewNotaFor(s, p2!.id).guesses).toEqual({});
    expect(viewNotaFor(s, p1!.id).guesses).toEqual({ [p1!.id]: 3 });
  });
});

describe("Avaliação", () => {
  it("revela estatísticas e não pontua por padrão", () => {
    const rng = seeded(11);
    let s = createNota(cfg({ mode: "avaliacao" }), players, pool, rng);
    expect(s.prompt.kind).toBe("avaliacao");
    expect(s.secret).toBeNull();
    s = reduceNota(s, { type: "open-guesses" }, pool, rng);
    [2, 9, 6, 7].forEach((v, i) => (s = reduceNota(s, { type: "guess", playerId: players[i]!.id, value: v }, pool, rng)));
    s = reduceNota(s, { type: "close-guesses" }, pool, rng);
    const r = s.result!;
    expect(r.kind).toBe("avaliacao");
    if (r.kind !== "avaliacao") return;
    expect(r.mean).toBe(6);
    expect(r.median).toBe(6.5);
    expect(r.spread).toBe(7);
    expect(r.highest.playerId).toBe("b");
    expect(r.lowest.playerId).toBe("a");
    expect(r.closest.playerId).toBe("c");
    expect(Object.values(s.scores).every((v) => v === 0)).toBe(true);
  });

  it("pontua por proximidade da média quando ligado", () => {
    const rng = seeded(12);
    let s = createNota(cfg({ mode: "avaliacao", scoreAvaliacao: true }), players, pool, rng);
    s = reduceNota(s, { type: "open-guesses" }, pool, rng);
    [2, 9, 6, 7].forEach((v, i) => (s = reduceNota(s, { type: "guess", playerId: players[i]!.id, value: v }, pool, rng)));
    s = reduceNota(s, { type: "close-guesses" }, pool, rng);
    expect(s.scores).toEqual({ a: 0, b: 20, c: 100, d: 70 });
  });
});
