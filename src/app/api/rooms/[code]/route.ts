import { codeSchema } from "@/rooms/schema";
import { rateLimit } from "@/server/rateLimit";
import { bearer, handle, json } from "@/server/http";
import { getView } from "@/server/rooms";

export const runtime = "nodejs";

/**
 * Estado da sala para quem pergunta. Com ?v=N, se nada mudou desde a versão N,
 * responde só { version } (consulta leve, usada a cada 1–2 s pelos celulares).
 */
export function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    rateLimit(req, "read");
    const code = codeSchema.parse((await params).code);
    const v = new URL(req.url).searchParams.get("v");
    const known = v !== null && /^\d+$/.test(v) ? Number(v) : undefined;
    return json(await getView(code, bearer(req), known));
  });
}
