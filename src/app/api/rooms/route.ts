import type { PieceKind } from "@/engine/core";
import { createRoomBody } from "@/rooms/schema";
import { rateLimit } from "@/server/rateLimit";
import { handle, json, parse } from "@/server/http";
import { createRoom } from "@/server/rooms";

export const runtime = "nodejs";

/** Cria uma sala. Quem cria vira o anfitrião e recebe a credencial (token). */
export function POST(req: Request) {
  return handle(async () => {
    rateLimit(req, "create");
    const body = await parse(req, createRoomBody);
    return json(await createRoom({ nickname: body.nickname, piece: body.piece as PieceKind }), 201);
  });
}
