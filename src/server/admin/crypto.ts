import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Senha do painel: guardada só como hash scrypt na variável ADMIN_PASSWORD_HASH,
 * no formato "scrypt:N:r:p:salt:hash" (base64url). Sem "$", que o carregador de .env tentaria expandir. A sessão é um cookie assinado com
 * HMAC-SHA256 usando ADMIN_SESSION_SECRET. Sem dependências externas.
 */

const N = 2 ** 15;
const R = 8;
const P = 1;
const KEYLEN = 32;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEYLEN, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  return ["scrypt", N, R, P, salt.toString("base64url"), hash.toString("base64url")].join(":");
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, hashB64] = parts as [string, string, string, string, string, string];
  const expected = Buffer.from(hashB64, "base64url");
  const actual = scryptSync(password, Buffer.from(saltB64, "base64url"), expected.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024 });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export interface SessionPayload {
  /** Expira em (epoch ms). */
  exp: number;
  /** Muda quando a senha muda: sessões antigas deixam de valer. */
  v: string;
}

const b64 = (s: string) => Buffer.from(s).toString("base64url");
const sign = (data: string, secret: string) => createHmac("sha256", secret).update(data).digest("base64url");

export function signSession(p: SessionPayload, secret: string): string {
  const body = b64(JSON.stringify(p));
  return `${body}.${sign(body, secret)}`;
}

export function readSession(token: string | undefined, secret: string, now = Date.now()): SessionPayload | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = Buffer.from(sign(body, secret));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (typeof p.exp !== "number" || p.exp < now) return null;
    return p;
  } catch {
    return null;
  }
}

/** Versão da senha atual (prefixo do hash do hash), embutida na sessão. */
export const passwordVersion = (stored: string) => createHmac("sha256", "v").update(stored).digest("base64url").slice(0, 12);
