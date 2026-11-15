import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { RoomError } from "./rooms";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
export const fail = (status: number, code: string, message: string) => json({ error: { code, message } }, status);

export function bearer(req: Request) {
  const h = req.headers.get("authorization");
  return h?.startsWith("Bearer ") ? h.slice(7) : null;
}

export async function parse<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new RoomError(400, "bad-json", "Não entendemos o pedido.");
  }
  return schema.parse(body);
}

/** Converte qualquer erro em resposta amigável, sem vazar detalhes internos. */
export async function handle(fn: () => Promise<Response>) {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof RoomError) return fail(e.status, e.code, e.message);
    if (e instanceof ZodError) return fail(400, "invalid", e.issues[0]?.message ?? "Dados inválidos.");
    console.error("[sala]", e);
    return fail(500, "server", "Algo deu errado do nosso lado. Tente de novo em instantes.");
  }
}
