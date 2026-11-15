import { RoomError } from "./rooms";

/**
 * Limite simples por IP, em memória (janela deslizante). Em hospedagem serverless cada
 * instância tem a sua memória, então isto barra abuso óbvio (criar centenas de salas,
 * chutar códigos em sequência), não um ataque distribuído. Para isso, usar um limitador
 * compartilhado (Postgres ou Redis) na mesma interface.
 */
const hits = new Map<string, number[]>();
let lastSweep = Date.now();

export const LIMITS = {
  create: { max: 10, windowMs: 60_000 },
  join: { max: 30, windowMs: 60_000 },
  action: { max: 240, windowMs: 60_000 },
  read: { max: 400, windowMs: 60_000 },
} as const;

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

export function rateLimit(req: Request, kind: keyof typeof LIMITS) {
  const { max, windowMs } = LIMITS[kind];
  const now = Date.now();
  const key = `${kind}:${clientIp(req)}`;
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) throw new RoomError(429, "rate-limited", "Muitas tentativas seguidas. Espere um minuto e tente de novo.");
  list.push(now);
  hits.set(key, list);
  if (now - lastSweep > 5 * 60_000) {
    lastSweep = now;
    for (const [k, v] of hits) if (v.every((t) => now - t >= 60_000)) hits.delete(k);
  }
}
