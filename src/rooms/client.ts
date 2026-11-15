"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RoomAction, RoomView } from "./room";

/**
 * Cliente do Modo Sala. Pergunta ao servidor "mudou algo desde a versão N?" a cada 1–2 s
 * (mais devagar com a aba em segundo plano). Se a rede cair, continua tentando e mostra
 * "reconectando"; quando volta, busca o estado atual e segue do ponto certo.
 * Trocar por avisos em tempo real (Ably, Supabase Realtime…) muda só este arquivo.
 */

export interface Creds {
  token: string;
  playerId: string;
}
type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; code: string; message: string };

const key = (code: string) => `deresenha:sala:${code}`;
export function loadCreds(code: string): Creds | null {
  try {
    const raw = localStorage.getItem(key(code));
    const v: unknown = raw ? JSON.parse(raw) : null;
    if (v && typeof v === "object" && "token" in v && "playerId" in v) return v as Creds;
  } catch {}
  return null;
}
export function saveCreds(code: string, c: Creds) {
  try {
    localStorage.setItem(key(code), JSON.stringify(c));
  } catch {}
}
export function clearCreds(code: string) {
  try {
    localStorage.removeItem(key(code));
  } catch {}
}

export async function api<T>(path: string, init: RequestInit & { token?: string | null } = {}): Promise<ApiResult<T>> {
  const { token, ...rest } = init;
  try {
    const r = await fetch(path, {
      ...rest,
      cache: "no-store",
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    });
    const body = (await r.json().catch(() => null)) as (T & { error?: { code: string; message: string } }) | null;
    if (!r.ok) return { ok: false, status: r.status, code: body?.error?.code ?? "http", message: body?.error?.message ?? "Algo deu errado. Tente de novo." };
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, status: 0, code: "offline", message: "Sem conexão. Confira a internet e tente de novo." };
  }
}

export type Connection = "connecting" | "ok" | "reconnecting";

export function useRoom(code: string) {
  const [creds, setCreds] = useState<Creds | null | undefined>(undefined);
  const [view, setView] = useState<RoomView | null>(null);
  const [conn, setConn] = useState<Connection>("connecting");
  const [fatal, setFatal] = useState<{ code: string; message: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const version = useRef<number | null>(null);
  const offset = useRef(0); // relógio do servidor - relógio local
  const credsRef = useRef<Creds | null>(null);

  useEffect(() => {
    const c = loadCreds(code);
    credsRef.current = c;
    setCreds(c);
  }, [code]);

  const accept = useCallback((data: { version: number; view: RoomView | null }) => {
    if (data.view) {
      // Nunca volta para uma versão mais antiga (respostas podem chegar fora de ordem).
      if (version.current !== null && data.version < version.current) return;
      offset.current = data.view.serverNow - Date.now();
      setView(data.view);
    }
    version.current = data.version;
  }, []);

  const handleError = useCallback(
    (e: { status: number; code: string; message: string }) => {
      if (e.status === 401) {
        clearCreds(code);
        credsRef.current = null;
        setCreds(null);
        setView(null);
        version.current = null;
      } else if (e.status === 404 || e.status === 410) {
        setFatal({ code: e.code, message: e.message });
      } else if (e.status === 0 || e.status >= 500) {
        setConn("reconnecting");
      }
    },
    [code],
  );

  // Laço de sincronização.
  useEffect(() => {
    if (!creds || fatal) return;
    let stop = false;
    let timer: number;
    let failures = 0;
    const tick = async () => {
      const v = version.current;
      const res = await api<{ version: number; view: RoomView | null }>(`/api/rooms/${code}${v !== null ? `?v=${v}` : ""}`, { token: credsRef.current?.token });
      if (stop) return;
      if (res.ok) {
        failures = 0;
        setConn("ok");
        accept(res.data);
      } else {
        failures++;
        handleError(res);
        if (res.status === 401 || res.status === 404 || res.status === 410) return;
      }
      // Consulta barata (sem estado quando nada mudou): dá para olhar mais vezes com a tela aberta.
      const base = document.visibilityState === "visible" ? 700 : 5000;
      timer = window.setTimeout(tick, failures ? Math.min(5000, 1000 * 2 ** failures) : base);
    };
    tick();
    const wake = () => {
      if (document.visibilityState === "visible") {
        window.clearTimeout(timer);
        tick();
      }
    };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", wake);
    return () => {
      stop = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("online", wake);
    };
  }, [creds, code, fatal, accept, handleError]);

  const act = useCallback(
    async (action: RoomAction, opts: { quiet?: boolean } = {}) => {
      if (!credsRef.current) return false;
      // O mesmo id em todas as tentativas: se a resposta se perder, reenviar é seguro.
      const id = crypto.randomUUID();
      if (!opts.quiet) setPending(true);
      setActionError(null);
      let res = await api<{ version: number; view: RoomView }>(`/api/rooms/${code}/actions`, { method: "POST", token: credsRef.current.token, body: JSON.stringify({ id, action }) });
      if (!res.ok && res.status === 0) {
        res = await api(`/api/rooms/${code}/actions`, { method: "POST", token: credsRef.current.token, body: JSON.stringify({ id, action }) });
      }
      if (!opts.quiet) setPending(false);
      if (res.ok) {
        accept(res.data);
        return true;
      }
      handleError(res);
      if (!opts.quiet) setActionError(res.message);
      return false;
    },
    [code, accept, handleError],
  );

  const enter = useCallback(
    async (nickname: string, piece: string) => {
      const res = await api<{ code: string; token: string; playerId: string }>(`/api/rooms/${code}/join`, { method: "POST", body: JSON.stringify({ nickname, piece }) });
      if (!res.ok) return res.message;
      const c = { token: res.data.token, playerId: res.data.playerId };
      saveCreds(code, c);
      credsRef.current = c;
      version.current = null;
      setCreds(c);
      return null;
    },
    [code],
  );

  const forget = useCallback(() => {
    clearCreds(code);
    credsRef.current = null;
    setCreds(null);
    setView(null);
  }, [code]);

  return { creds, view, conn, fatal, pending, actionError, act, enter, forget, serverNow: () => Date.now() + offset.current };
}
