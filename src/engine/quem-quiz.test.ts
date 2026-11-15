import { describe, expect, it } from "vitest";
import { challengesFor } from "@/content/library";
import { RuleError, seeded, type Player } from "./core";
import { createQuem, quemPoints, reduceQuem } from "./quem";
import { createQuiz, DEFAULT_QUIZ_CONFIG, quizPoints, reduceQuiz, viewQuizFor } from "./quiz";

const players: Player[] = ["Ana", "Beto", "Caio"].map((name, i) => ({ id: `p${i}`, name, piece: "bolota" }));

describe("Quem Sou Eu?", () => {
  const pool = challengesFor("quem-sou-eu");

  it("conta perguntas e acertar cedo vale mais", () => {
    const rng = seeded(3);
    let s = createQuem({ rounds: 1, questions: 10, seconds: 0 }, players, pool, rng);
    expect(s.phase).toBe("pass");
    const guesser = s.guesserId;
    s = reduceQuem(s, { type: "start" }, pool, rng);
    s = reduceQuem(s, { type: "answer", value: "sim" }, pool, rng);
    s = reduceQuem(s, { type: "answer", value: "nao" }, pool, rng);
    s = reduceQuem(s, { type: "hit" }, pool, rng);
    expect(s.gained).toBe(9);
    expect(s.scores[guesser]).toBe(9);
    expect(quemPoints(10, 10)).toBe(1);
  });

  it("trava no limite de perguntas, errar não pontua e todo mundo joga uma vez por volta", () => {
    const rng = seeded(4);
    let s = createQuem({ rounds: 1, questions: 3, seconds: 0 }, players, pool, rng);
    const seen = new Set<string>();
    for (let t = 0; t < players.length; t++) {
      seen.add(s.guesserId);
      s = reduceQuem(s, { type: "start" }, pool, rng);
      for (let q = 0; q < 3; q++) s = reduceQuem(s, { type: "answer", value: "nao" }, pool, rng);
      expect(() => reduceQuem(s, { type: "answer", value: "sim" }, pool, rng)).toThrow(/Acabaram/);
      s = reduceQuem(s, { type: t === 0 ? "timeout" : "miss" }, pool, rng);
      expect(s.gained).toBe(0);
      s = reduceQuem(s, { type: "next" }, pool, rng);
    }
    expect(seen.size).toBe(3);
    expect(s.phase).toBe("end");
    expect(new Set(s.history.map((h) => h.name)).size).toBe(3);
  });
});

describe("Quiz Relâmpago", () => {
  const pool = challengesFor("quiz");

  it("pontua por acerto e velocidade, com o tempo medido no servidor", () => {
    const rng = seeded(5);
    let s = createQuiz({ ...DEFAULT_QUIZ_CONFIG, seconds: 10 }, players, pool, rng, 1_000);
    const right = s.question.answer;
    const wrong = (right + 1) % s.question.options.length;
    s = reduceQuiz(s, { type: "answer", playerId: "p0", choice: right, at: 1_000 }, pool, rng);
    s = reduceQuiz(s, { type: "answer", playerId: "p1", choice: right, at: 6_000 }, pool, rng);
    expect(() => reduceQuiz(s, { type: "answer", playerId: "p1", choice: wrong, at: 6_500 }, pool, rng)).toThrow(/já respondeu/);
    s = reduceQuiz(s, { type: "answer", playerId: "p2", choice: wrong, at: 2_000 }, pool, rng);
    // Todos responderam: fecha sozinho.
    expect(s.phase).toBe("reveal");
    expect(s.gained).toEqual({ p0: 200, p1: 150, p2: 0 });
    expect(s.correct).toEqual({ p0: 1, p1: 1, p2: 0 });
    expect(quizPoints(4_000, 10_000, false)).toBe(100);
  });

  it("recusa resposta fora do prazo e esconde a certa até fechar", () => {
    const rng = seeded(6);
    let s = createQuiz({ ...DEFAULT_QUIZ_CONFIG, seconds: 10 }, players, pool, rng, 0);
    expect(() => reduceQuiz(s, { type: "answer", playerId: "p0", choice: 0, at: 20_000 }, pool, rng)).toThrow(RuleError);
    s = reduceQuiz(s, { type: "answer", playerId: "p0", choice: 1, at: 3_000 }, pool, rng);
    const v = viewQuizFor(s, "p1");
    expect(v.question.answer).toBeNull();
    expect(v.answers).toBeNull();
    expect(v.answered).toEqual(["p0"]);
    expect(JSON.stringify(v)).not.toContain('"choice":1');
    expect(viewQuizFor(s, "p0").myAnswer?.choice).toBe(1);
    s = reduceQuiz(s, { type: "close" }, pool, rng);
    expect(viewQuizFor(s, "p1").question.answer).toBe(s.question.answer);
  });

  it("embaralha as alternativas mantendo a certa e termina na última pergunta", () => {
    const rng = seeded(7);
    let s = createQuiz({ questions: 3, seconds: 10, speed: false }, players, pool, rng, 0);
    for (let i = 0; i < 3; i++) {
      const src = pool.find((q) => q.id === s.question.id)!;
      expect(s.question.options[s.question.answer]).toBe(src.options[src.answer]);
      s = reduceQuiz(s, { type: "close" }, pool, rng);
      s = reduceQuiz(s, { type: "next", at: 0 }, pool, rng);
    }
    expect(s.phase).toBe("end");
  });
});
