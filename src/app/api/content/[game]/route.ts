import { z } from "zod";
import { contentFor } from "@/server/content";
import { fail, json } from "@/server/http";

export const runtime = "nodejs";

const gameSchema = z.enum(["nota", "mimica", "infiltrado", "ranking", "voce-prefere", "quem-sou-eu", "quiz", "limite", "mentira"]);

/** Conteúdo publicado de um jogo para o modo compartilhado (público: não há segredo aqui). */
export async function GET(_req: Request, { params }: { params: Promise<{ game: string }> }) {
  const g = gameSchema.safeParse((await params).game);
  if (!g.success) return fail(404, "not-found", "Jogo desconhecido.");
  const data = await contentFor(g.data);
  const res = json(data);
  res.headers.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=300");
  return res;
}
