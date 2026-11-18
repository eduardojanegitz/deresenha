import { z } from "zod";
import { codeSchema } from "@/rooms/schema";
import { bearer, fail, handle, json, parse } from "@/server/http";
import { pushEnabled, removeSubscription, saveSubscription, subscriptionSchema } from "@/server/push";
import { rateLimit } from "@/server/rateLimit";
import { authRoom } from "@/server/rooms";

export const runtime = "nodejs";

/** Pede para este aparelho ser avisado quando a partida da sala começar. */
export function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    rateLimit(req, "action");
    if (!pushEnabled()) return fail(503, "push-off", "Os avisos ainda não foram configurados neste servidor.");
    const code = codeSchema.parse((await params).code);
    const { roomId, playerId } = await authRoom(code, bearer(req));
    const sub = await parse(req, subscriptionSchema);
    await saveSubscription(roomId, playerId, sub);
    return json({ ok: true }, 201);
  });
}

/** Cancela o aviso deste aparelho nesta sala. */
export function DELETE(req: Request, { params }: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const code = codeSchema.parse((await params).code);
    const { roomId } = await authRoom(code, bearer(req));
    const { endpoint } = await parse(req, z.object({ endpoint: z.string().max(1000) }));
    await removeSubscription(roomId, endpoint);
    return json({ ok: true });
  });
}
