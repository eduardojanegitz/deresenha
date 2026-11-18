import webpush from "web-push";
import { z } from "zod";
import { db } from "./db";

/**
 * Notificação push do Modo Sala ("A partida começou!"). Usa as chaves VAPID das variáveis
 * de ambiente; sem elas, o aviso fica desligado e o resto da sala funciona normalmente.
 *
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY  chave pública (vai para o navegador)
 *   VAPID_PRIVATE_KEY             chave privada (só no servidor)
 *   VAPID_SUBJECT                 contato do responsável, ex.: mailto:voce@exemplo.com
 */
const PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:avisos@deresenha.app";

export const pushEnabled = () => PUBLIC.length > 0 && PRIVATE.length > 0;

let configured = false;
function setup() {
  if (configured || !pushEnabled()) return pushEnabled();
  webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
  configured = true;
  return true;
}

/** O que o navegador entrega em pushManager.subscribe(). */
export const subscriptionSchema = z.object({
  endpoint: z.string().url().max(1000).refine((u) => u.startsWith("https://"), "Endereço de aviso inválido."),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});
export type PushSubscriptionInput = z.infer<typeof subscriptionSchema>;

export async function saveSubscription(roomId: string, playerId: string, s: PushSubscriptionInput) {
  await db()`
    insert into room_push_subscriptions (room_id, player_id, endpoint, p256dh, auth)
    values (${roomId}, ${playerId}, ${s.endpoint}, ${s.keys.p256dh}, ${s.keys.auth})
    on conflict (room_id, endpoint) do update set player_id = excluded.player_id, p256dh = excluded.p256dh, auth = excluded.auth`;
}

export async function removeSubscription(roomId: string, endpoint: string) {
  await db()`delete from room_push_subscriptions where room_id = ${roomId} and endpoint = ${endpoint}`;
}

/** Manda o aviso para todos os aparelhos inscritos na sala, menos os de quem fez a ação. */
export async function notifyRoom(roomId: string, exceptPlayerId: string, payload: { title: string; body: string; url: string; tag: string }) {
  if (!setup()) return;
  const subs = (await db()`select id, endpoint, p256dh, auth from room_push_subscriptions where room_id = ${roomId} and player_id <> ${exceptPlayerId}`) as {
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }[];
  const gone: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 600, urgency: "high", topic: payload.tag.slice(0, 32) });
      } catch (e) {
        // 404/410: o aparelho cancelou o aviso. Qualquer outro erro: tenta de novo na próxima.
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) gone.push(s.id);
        else console.error("[push] falha ao avisar:", status ?? (e instanceof Error ? e.message : e));
      }
    }),
  );
  if (gone.length) await db()`delete from room_push_subscriptions where id = any(${gone}::uuid[])`;
}
