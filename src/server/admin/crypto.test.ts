import { describe, expect, it } from "vitest";
import { hashPassword, passwordVersion, readSession, signSession, verifyPassword } from "./crypto";

describe("senha do painel", () => {
  it("confere a senha certa e recusa a errada", () => {
    const h = hashPassword("cavalo-bateria-grampo");
    expect(h.startsWith("scrypt:")).toBe(true);
    expect(verifyPassword("cavalo-bateria-grampo", h)).toBe(true);
    expect(verifyPassword("cavalo-bateria-grampa", h)).toBe(false);
    expect(verifyPassword("x", "lixo")).toBe(false);
  });
});

describe("sessão assinada", () => {
  const secret = "s".repeat(40);
  it("aceita a sessão válida e recusa adulterada, expirada ou com outro segredo", () => {
    const tok = signSession({ exp: Date.now() + 1000, v: "a" }, secret);
    expect(readSession(tok, secret)?.v).toBe("a");
    const [body, mac] = tok.split(".");
    const forged = Buffer.from(JSON.stringify({ exp: Date.now() + 9e9, v: "a" })).toString("base64url");
    expect(readSession(`${forged}.${mac}`, secret)).toBeNull();
    expect(readSession(`${body}.${mac}x`, secret)).toBeNull();
    expect(readSession(tok, "t".repeat(40))).toBeNull();
    expect(readSession(signSession({ exp: Date.now() - 1, v: "a" }, secret), secret)).toBeNull();
  });
  it("trocar a senha invalida sessões antigas", () => {
    expect(passwordVersion(hashPassword("a"))).not.toBe(passwordVersion(hashPassword("a")));
  });
});
