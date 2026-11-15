import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { passwordVersion, readSession, signSession, verifyPassword } from "./crypto";

export const ADMIN_COOKIE = "dr_admin";
const SESSION_MS = 8 * 60 * 60 * 1000;
const MAX_FAILS = 5;
const FAIL_WINDOW = "15 minutes";

function config() {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!hash || !secret || secret.length < 32) return null;
  return { hash, secret };
}

export const adminConfigured = () => config() !== null;

/** Sessão atual do painel, ou null. Toda página e ação do painel começa por aqui. */
export async function getAdmin() {
  const c = config();
  if (!c) return null;
  const s = readSession((await cookies()).get(ADMIN_COOKIE)?.value, c.secret);
  return s && s.v === passwordVersion(c.hash) ? s : null;
}

export async function requireAdmin() {
  const s = await getAdmin();
  if (!s) redirect("/admin/entrar");
  return s;
}

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

export type LoginResult = { ok: true } | { ok: false; message: string };

export async function login(password: string): Promise<LoginResult> {
  const c = config();
  if (!c) return { ok: false, message: "O painel ainda não foi configurado neste servidor." };
  const ip = await clientIp();
  const fails = (await db()`select count(*)::int as n from admin_login_attempts where ip = ${ip} and not ok and at > now() - ${FAIL_WINDOW}::interval`) as { n: number }[];
  if ((fails[0]?.n ?? 0) >= MAX_FAILS) return { ok: false, message: "Muitas tentativas erradas. Espere 15 minutos e tente de novo." };

  const ok = typeof password === "string" && password.length > 0 && password.length <= 200 && verifyPassword(password, c.hash);
  await db()`insert into admin_login_attempts (ip, ok) values (${ip}, ${ok})`;
  await db()`delete from admin_login_attempts where at < now() - interval '1 day'`;
  if (!ok) return { ok: false, message: "Senha incorreta." };

  (await cookies()).set(ADMIN_COOKIE, signSession({ exp: Date.now() + SESSION_MS, v: passwordVersion(c.hash) }, c.secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_MS / 1000,
  });
  return { ok: true };
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
}
