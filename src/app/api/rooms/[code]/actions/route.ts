import type { RoomAction } from "@/rooms/room";
import { actionBody, codeSchema } from "@/rooms/schema";
import { bearer, handle, json, parse } from "@/server/http";
import { act } from "@/server/rooms";

export const runtime = "nodejs";

/** Aplica uma ação de quem está autenticado. Quem age é sempre definido pela credencial. */
export function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const code = codeSchema.parse((await params).code);
    const body = await parse(req, actionBody);
    return json(await act(code, bearer(req), body.id, body.action as RoomAction));
  });
}
