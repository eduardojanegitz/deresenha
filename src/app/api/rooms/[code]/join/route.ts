import type { PieceKind } from "@/engine/core";
import { codeSchema, joinRoomBody } from "@/rooms/schema";
import { bearer, handle, json, parse } from "@/server/http";
import { joinRoomByCode } from "@/server/rooms";

export const runtime = "nodejs";

/** Entra na sala. Se o celular já tem credencial desta sala, é reentrada (mesma identidade). */
export function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const code = codeSchema.parse((await params).code);
    const body = await parse(req, joinRoomBody);
    return json(await joinRoomByCode(code, { nickname: body.nickname, piece: body.piece as PieceKind }, bearer(req)));
  });
}
