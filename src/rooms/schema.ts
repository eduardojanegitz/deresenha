import { z } from "zod";
import { PIECE_KINDS } from "@/engine/core";

/** Validação de tudo que chega do cliente. Compartilhado entre rotas e telas. */

export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sem 0/O, 1/I/L
export const CODE_LENGTH = 4;
export const codeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((c) => c.length === CODE_LENGTH && [...c].every((ch) => CODE_ALPHABET.includes(ch)), "Código inválido. São 4 letras e números.");

export const pieceSchema = z.enum(PIECE_KINDS as unknown as [string, ...string[]]);
export const nicknameSchema = z.string().trim().min(1, "Escolha um apelido.").max(16, "Use até 16 letras.");

export const createRoomBody = z.object({ nickname: nicknameSchema, piece: pieceSchema, game: z.literal("nota").default("nota") });
export const joinRoomBody = z.object({ nickname: nicknameSchema, piece: pieceSchema });

const tableSchema = z.object({ exact: z.number().int().min(0).max(999), d1: z.number().int().min(0).max(999), d2: z.number().int().min(0).max(999), d3: z.number().int().min(0).max(999) });

const notaAction = z.discriminatedUnion("type", [
  z.object({ type: z.literal("begin-round") }),
  z.object({ type: z.literal("swap-prompt") }),
  z.object({ type: z.literal("answered") }),
  z.object({ type: z.literal("guess"), value: z.number().int().min(0).max(10) }),
  z.object({ type: z.literal("close-guesses") }),
  z.object({ type: z.literal("show-score") }),
  z.object({ type: z.literal("next") }),
]);

const infiltradoAction = z.discriminatedUnion("type", [
  z.object({ type: z.literal("seen") }),
  z.object({ type: z.literal("next-hint-round") }),
  z.object({ type: z.literal("open-vote") }),
  z.object({ type: z.literal("vote"), targetId: z.string().uuid() }),
  z.object({ type: z.literal("close-vote") }),
]);

const quizAction = z.discriminatedUnion("type", [z.object({ type: z.literal("answer"), choice: z.number().int().min(0).max(3) }), z.object({ type: z.literal("close") })]);

const prefereAction = z.discriminatedUnion("type", [z.object({ type: z.literal("choose"), choice: z.enum(["a", "b"]) }), z.object({ type: z.literal("swap") }), z.object({ type: z.literal("reveal") })]);

const limiteAction = z.discriminatedUnion("type", [
  z.object({ type: z.literal("guess"), value: z.number().finite().min(0).max(1e13) }),
  z.object({ type: z.literal("swap") }),
  z.object({ type: z.literal("reveal") }),
]);

const mentiraAction = z.discriminatedUnion("type", [
  z.object({ type: z.literal("seen") }),
  z.object({ type: z.literal("start-telling") }),
  z.object({ type: z.literal("open-vote") }),
  z.object({ type: z.literal("choose"), choice: z.enum(["verdade", "mentira"]) }),
]);

export const roomActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("set-game"), game: z.enum(["nota", "infiltrado", "quiz", "voce-prefere", "limite", "mentira"]) }),
  z.object({ type: z.literal("set-ready"), ready: z.boolean() }),
  z.object({
    type: z.literal("configure"),
    config: z
      .object({
        mode: z.enum(["secreta", "avaliacao"]),
        rounds: z.number().int().min(1).max(12),
        timerSec: z.number().int(),
        tellerBonus: z.boolean(),
        scoreAvaliacao: z.boolean(),
        table: tableSchema,
      })
      .partial()
      .optional(),
    infiltrado: z.object({ rounds: z.number().int().min(1).max(10), hintRounds: z.number().int().min(1).max(3) }).partial().optional(),
    quiz: z.object({ questions: z.number().int().min(3).max(20), seconds: z.number().int(), speed: z.boolean() }).partial().optional(),
    prefere: z.object({ rounds: z.number().int().min(1).max(20), scoreMajority: z.boolean() }).partial().optional(),
    limite: z.object({ rounds: z.number().int().min(1).max(20) }).partial().optional(),
    mentira: z.object({ turns: z.number().int().min(1).max(3) }).partial().optional(),
    themes: z.array(z.string().max(40)).max(30).optional(),
  }),
  z.object({ type: z.literal("start") }),
  z.object({ type: z.literal("kick"), playerId: z.string().uuid() }),
  z.object({ type: z.literal("transfer-host"), playerId: z.string().uuid() }),
  z.object({ type: z.literal("claim-host") }),
  z.object({ type: z.literal("leave") }),
  z.object({ type: z.literal("time-up") }),
  z.object({ type: z.literal("back-to-lobby") }),
  z.object({ type: z.literal("close") }),
  z.object({ type: z.literal("game"), action: z.union([notaAction, infiltradoAction, quizAction, prefereAction, limiteAction, mentiraAction]) }),
]);

export const actionBody = z.object({
  /** Identificador gerado no celular: o mesmo envio repetido é aplicado uma vez só. */
  id: z.string().min(8).max(64),
  action: roomActionSchema,
});

export interface ApiError {
  error: { code: string; message: string };
}
