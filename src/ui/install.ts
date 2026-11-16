"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * Instalação do app na tela inicial.
 *
 * O Chrome (Android e computador) avisa uma vez, logo no carregamento, que o site pode ser
 * instalado (`beforeinstallprompt`). Esse aviso é guardado aqui, num módulo carregado pela
 * barra do topo, para não se perder quando a pessoa chega por outra página. O iPhone não tem
 * esse aviso: lá a instalação é sempre pelo menu Compartilhar do navegador.
 */

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installed = true;
    emit();
  });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/**
 * - `standalone`: já está aberto como app instalado (não mostra nada).
 * - `ios`: Safari do iPhone/iPad. `ios-other`: Chrome, Firefox ou Edge no iPhone.
 * - `ios-inapp`: navegador de dentro do Instagram, Facebook etc., que não instala.
 * - `android`: Android sem o aviso do Chrome (Samsung Internet, Firefox, ou o aviso ainda não veio).
 * - `desktop`: computador.
 */
export type InstallPlatform = "standalone" | "ios" | "ios-other" | "ios-inapp" | "android" | "desktop";

export function detectPlatform(ua: string, touchPoints: number, standalone: boolean): InstallPlatform {
  if (standalone) return "standalone";
  // iPad com iPadOS se apresenta como Mac; o toque denuncia.
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1);
  if (ios) {
    if (/Instagram|FBAN|FBAV|FB_IAB|Line\/|TikTok|musical_ly|Snapchat|LinkedInApp|Twitter/.test(ua)) return "ios-inapp";
    if (/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)) return "ios-other";
    return "ios";
  }
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

export function useInstall() {
  const canPrompt = useSyncExternalStore(
    subscribe,
    () => deferred !== null,
    () => false,
  );
  const justInstalled = useSyncExternalStore(
    subscribe,
    () => installed,
    () => false,
  );
  // A plataforma só é conhecida no navegador; no servidor fica nula para não divergir na hidratação.
  const [platform, setPlatform] = useState<InstallPlatform | null>(null);
  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const standalone = window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
    setPlatform(detectPlatform(nav.userAgent, nav.maxTouchPoints ?? 0, standalone));
  }, []);

  /** Abre o pedido de instalação do próprio navegador. Devolve se a pessoa aceitou. */
  const prompt = async () => {
    const e = deferred;
    if (!e) return false;
    deferred = null;
    emit();
    await e.prompt();
    const { outcome } = await e.userChoice;
    return outcome === "accepted";
  };

  return { platform, canPrompt, justInstalled, prompt };
}
