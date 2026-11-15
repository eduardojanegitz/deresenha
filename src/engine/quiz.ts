import type { QuizChallenge } from "@/content/types";
import { assertRule, drawFresh, shuffle, type Player, type Rng, zeroScores } from "./core";

/**
 * Quiz Relâmpago: perguntas de múltipla escolha, cada um responde no próprio celular.
 * O tempo de cada resposta é medido pelo servidor (o instante chega na ação, não do
 * cliente), e a alternativa correta só sai do servidor depois que a pergunta fecha.
 */
export interface QuizConfig {
  questions: number;
  seconds: number;
  /** Responder mais rápido vale mais. */
  speed: boolean;
}
export const DEFAULT_QUIZ_CONFIG: QuizConfig = { questions: 8, seconds: 15, speed: true };
export const QUIZ_MIN = 2;
export const QUIZ_SECONDS_OPTIONS = [10, 15, 20, 30];
/** Folga para a latência da rede: uma resposta que chega logo após o prazo ainda vale. */
export const QUIZ_GRACE_MS = 1_500;
export const QUIZ_BASE_POINTS = 100;
export const QUIZ_SPEED_POINTS = 100;

export type QuizPhase = "question" | "reveal" | "end";

export interface QuizAnswer {
  choice: number;
  ms: number;
}

export interface QuizState {
  game: "quiz";
  config: QuizConfig;
  players: Player[];
  index: number;
  phase: QuizPhase;
  question: { id: string; theme: string; text: string; options: string[]; answer: number };
  startedAt: number;
  answers: Record<string, QuizAnswer>;
  gained: Record<string, number>;
  scores: Record<string, number>;
  correct: Record<string, number>;
  used: string[];
}

export type QuizAction = { type: "answer"; playerId: string; choice: number; at: number } | { type: "close" } | { type: "next"; at: number };

export const quizLimitMs = (c: QuizConfig) => c.seconds * 1000;

/** Acertou: base + bônus proporcional ao tempo que sobrou (se ligado). Errou: zero. */
export function quizPoints(ms: number, limitMs: number, speed: boolean) {
  if (!speed) return QUIZ_BASE_POINTS;
  const left = Math.max(0, Math.min(1, 1 - ms / limitMs));
  return QUIZ_BASE_POINTS + Math.round(QUIZ_SPEED_POINTS * left);
}

function ask(s: QuizState, pool: readonly QuizChallenge[], rng: Rng, at: number): QuizState {
  const d = drawFresh(rng, pool, s.used, s.question?.id);
  // Embaralha as alternativas para a posição da certa não virar padrão.
  const order = shuffle(
    rng,
    d.item.options.map((_, i) => i),
  );
  const question = { id: d.item.id, theme: d.item.theme, text: d.item.question, options: order.map((i) => d.item.options[i]!), answer: order.indexOf(d.item.answer) };
  return { ...s, index: s.index + 1, phase: "question", question, startedAt: at, answers: {}, gained: {}, used: d.used };
}

export function createQuiz(config: QuizConfig, players: Player[], pool: readonly QuizChallenge[], rng: Rng, at: number): QuizState {
  assertRule(players.length >= QUIZ_MIN, "players", `O Quiz precisa de pelo menos ${QUIZ_MIN} pessoas.`);
  assertRule(Number.isInteger(config.questions) && config.questions >= 3 && config.questions <= 20, "questions", "Escolha de 3 a 20 perguntas.");
  assertRule(QUIZ_SECONDS_OPTIONS.includes(config.seconds), "seconds", "Tempo por pergunta inválido.");
  const ids = players.map((p) => p.id);
  const s = {
    game: "quiz",
    config,
    players,
    index: 0,
    phase: "question",
    question: undefined as unknown as QuizState["question"],
    startedAt: at,
    answers: {},
    gained: {},
    scores: zeroScores(ids),
    correct: zeroScores(ids),
    used: [],
  } satisfies QuizState;
  return ask(s, pool, rng, at);
}

function close(s: QuizState): QuizState {
  const limit = quizLimitMs(s.config);
  const gained: Record<string, number> = {};
  const scores = { ...s.scores };
  const correct = { ...s.correct };
  for (const p of s.players) {
    const a = s.answers[p.id];
    const g = a && a.choice === s.question.answer ? quizPoints(a.ms, limit, s.config.speed) : 0;
    gained[p.id] = g;
    scores[p.id] = (scores[p.id] ?? 0) + g;
    if (g > 0) correct[p.id] = (correct[p.id] ?? 0) + 1;
  }
  return { ...s, phase: "reveal", gained, scores, correct };
}

export function reduceQuiz(s: QuizState, act: QuizAction, pool: readonly QuizChallenge[], rng: Rng): QuizState {
  switch (act.type) {
    case "answer": {
      assertRule(s.phase === "question", "phase", "Essa pergunta já fechou.");
      assertRule(s.players.some((p) => p.id === act.playerId), "forbidden", "Você não está nesta partida.");
      assertRule(s.answers[act.playerId] === undefined, "answered", "Você já respondeu. A resposta não muda.");
      assertRule(Number.isInteger(act.choice) && act.choice >= 0 && act.choice < s.question.options.length, "choice", "Escolha uma das alternativas.");
      const ms = Math.max(0, act.at - s.startedAt);
      assertRule(ms <= quizLimitMs(s.config) + QUIZ_GRACE_MS, "late", "O tempo dessa pergunta acabou.");
      const next = { ...s, answers: { ...s.answers, [act.playerId]: { choice: act.choice, ms: Math.min(ms, quizLimitMs(s.config)) } } };
      return Object.keys(next.answers).length === s.players.length ? close(next) : next;
    }
    case "close":
      assertRule(s.phase === "question", "phase", "Essa pergunta já fechou.");
      return close(s);
    case "next":
      assertRule(s.phase === "reveal", "phase", "Feche a pergunta antes de avançar.");
      if (s.index >= s.config.questions) return { ...s, phase: "end" };
      return ask(s, pool, rng, act.at);
  }
}

/** O que cada participante recebe. Antes de fechar: sem a certa e sem a escolha dos outros. */
export interface QuizView extends Omit<QuizState, "question" | "answers" | "used"> {
  question: { theme: string; text: string; options: string[]; answer: number | null };
  answered: string[];
  myAnswer: QuizAnswer | null;
  answers: Record<string, QuizAnswer> | null;
}

export function viewQuizFor(s: QuizState, viewerId: string): QuizView {
  const open = s.phase === "question";
  const { used: _u, answers, question, ...rest } = s;
  return {
    ...rest,
    question: { theme: question.theme, text: question.text, options: question.options, answer: open ? null : question.answer },
    answered: Object.keys(answers),
    myAnswer: answers[viewerId] ?? null,
    answers: open ? null : answers,
  };
}
