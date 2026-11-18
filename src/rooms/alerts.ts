"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Sfx } from "@/ui/sound";
import { api } from "./client";
import type { RoomView } from "./room";

/* ---------- alerta quando a partida começa (com a página aberta) ---------- */

/**
 * Toca o som de início, vibra e, se a aba estiver em segundo plano, pisca o título da aba
 * até a pessoa voltar. Só dispara na passagem do lobby para a partida, nunca ao abrir a sala.
 */
export function useStartAlert(view: RoomView | null, play: (s: Sfx) => void) {
  const prev = useRef<RoomView["status"] | null>(null);
  useEffect(() => {
    const status = view?.status ?? null;
    const was = prev.current;
    prev.current = status;
    if (!view || was === null || was === status || status !== "playing" || was === "playing") return;
    play("start");
    window.setTimeout(() => play("start"), 450);
    try {
      navigator.vibrate?.([220, 90, 220, 90, 320]);
    } catch {}
    if (document.visibilityState === "visible") return;
    const original = document.title;
    let on = false;
    const blink = window.setInterval(() => {
      on = !on;
      document.title = on ? "🎲 A partida começou!" : original;
    }, 900);
    const back = () => {
      if (document.visibilityState !== "visible") return;
      window.clearInterval(blink);
      document.title = original;
      document.removeEventListener("visibilitychange", back);
    };
    document.addEventListener("visibilitychange", back);
    return () => {
      window.clearInterval(blink);
      document.title = original;
      document.removeEventListener("visibilitychange", back);
    };
  }, [view, play]);
}

/* ---------- notificação push ---------- */

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const flagKey = (code: string) => `deresenha:aviso:${code}`;

/**
 * - `hidden`: o servidor não tem avisos configurados (o cartão nem aparece).
 * - `unsupported`: este navegador não recebe notificação.
 * - `ios-install`: iPhone fora do app instalado (no iPhone, só o app da tela inicial recebe).
 * - `denied`: a pessoa bloqueou as notificações do site.
 */
export type PushState = "loading" | "hidden" | "unsupported" | "ios-install" | "denied" | "off" | "busy" | "on";

const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

function keyBytes(base64url: string) {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function usePush(code: string, token: string | null) {
  const [state, setState] = useState<PushState>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!VAPID) return setState("hidden");
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!supported) return setState(isIos() && !isStandalone() ? "ios-install" : "unsupported");
    if (Notification.permission === "denied") return setState("denied");
    let on = false;
    try {
      on = localStorage.getItem(flagKey(code)) === "1";
    } catch {}
    if (!on) return setState("off");
    // Confere se a inscrição do navegador ainda existe.
    navigator.serviceWorker
      .getRegistration("/sw.js")
      .then((r) => r?.pushManager.getSubscription())
      .then((s) => setState(s && Notification.permission === "granted" ? "on" : "off"))
      .catch(() => setState("off"));
  }, [code]);

  const enable = useCallback(async () => {
    if (!token) return;
    setError(null);
    setState("busy");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID) }));
      const res = await api(`/api/rooms/${code}/push`, { method: "POST", token, body: JSON.stringify(sub.toJSON()) });
      if (!res.ok) throw new Error(res.message);
      try {
        localStorage.setItem(flagKey(code), "1");
      } catch {}
      setState("on");
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Não deu para ativar o aviso neste aparelho.");
      setState("off");
    }
  }, [code, token]);

  const disable = useCallback(async () => {
    if (!token) return;
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) await api(`/api/rooms/${code}/push`, { method: "DELETE", token, body: JSON.stringify({ endpoint: sub.endpoint }) });
    } catch {}
    try {
      localStorage.removeItem(flagKey(code));
    } catch {}
    setState("off");
  }, [code, token]);

  return { state, error, enable, disable };
}

/* ---------- janelinha flutuante (computador) ---------- */

interface DocumentPip {
  requestWindow: (opts: { width: number; height: number }) => Promise<Window>;
  window: Window | null;
}
const pipApi = () => (typeof window !== "undefined" ? (window as Window & { documentPictureInPicture?: DocumentPip }).documentPictureInPicture : undefined);

/**
 * Abre a sala numa janela que fica por cima de tudo (Document Picture-in-Picture, Chrome e
 * Edge no computador). A janelinha carrega a própria sala num iframe: assim ela tem relógio
 * e animações próprios e continua viva mesmo com a aba principal escondida.
 */
export function usePip(code: string) {
  const [supported, setSupported] = useState(false);
  const [win, setWin] = useState<Window | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setSupported(!!pipApi()), []);

  const open = useCallback(async () => {
    const api = pipApi();
    if (!api) return;
    setError(null);
    let w: Window;
    try {
      w = await api.requestWindow({ width: 420, height: 760 });
    } catch {
      setError("Este navegador não deixou abrir a janelinha. Ela funciona no Chrome e no Edge do computador.");
      return;
    }
    const d = w.document;
    d.title = `Sala ${code} · DeResenha`;
    d.body.style.margin = "0";
    d.body.style.background = "#F1F4EF";
    const frame = d.createElement("iframe");
    frame.src = `/sala/${code}?janela=1`;
    frame.title = `Sala ${code}`;
    frame.allow = "autoplay; vibrate";
    Object.assign(frame.style, { border: "0", width: "100vw", height: "100vh", display: "block" });
    d.body.append(frame);
    w.addEventListener("pagehide", () => setWin(null), { once: true });
    setWin(w);
  }, [code]);

  const close = useCallback(() => {
    win?.close();
    setWin(null);
  }, [win]);

  return { supported, open, close, error, isOpen: win !== null };
}
