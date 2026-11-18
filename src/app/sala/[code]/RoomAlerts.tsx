"use client";

import { useEffect, useState } from "react";
import { Piece } from "@/brand/Piece";
import { usePush } from "@/rooms/alerts";

/** Cartão do lobby: pedir para ser avisado no celular quando a partida começar. */
export function PushCard({ code, token, amHost }: { code: string; token: string | null; amHost: boolean }) {
  const { state, error, enable, disable } = usePush(code, token);
  if (state === "hidden" || state === "loading") return null;
  const text: Record<string, string> = {
    unsupported: "Este navegador não recebe notificações. O alerta toca só com a sala aberta na tela.",
    "ios-install": "No iPhone, o aviso só chega com o DeResenha instalado na tela inicial (botão Compartilhar, depois Adicionar à Tela de Início). Instale e abra a sala por lá.",
    denied: "As notificações deste site estão bloqueadas. Libere nas configurações do navegador para receber o aviso.",
    off: amHost ? "Vai sair da tela enquanto espera a turma? Ative o aviso e o celular toca quando alguém precisar de você." : "Pode mexer em outros apps enquanto espera: quando a partida começar, o celular avisa.",
    busy: "Ativando o aviso…",
    on: "Aviso ligado. Quando a partida começar, o celular avisa mesmo com o DeResenha fechado.",
  };
  const canToggle = state === "off" || state === "on" || state === "busy";
  return (
    <section className="card flex items-start gap-3 rounded-[22px] p-4" aria-label="Aviso de início">
      <Piece kind="capsula" mood={state === "on" ? "happy" : "wow"} size={40} />
      <div className="grid flex-1 gap-2">
        <b className="font-display text-lg leading-tight font-extrabold">{state === "on" ? "Você vai ser avisado" : "Avisar quando começar"}</b>
        <p className="muted text-[15px] leading-snug">{text[state]}</p>
        {canToggle && (
          <button className={`btn btn-small ${state === "on" ? "btn-ghost" : "btn-gema"}`} disabled={state === "busy"} onClick={state === "on" ? disable : enable}>
            {state === "on" ? "Desligar o aviso" : "Ativar o aviso"}
          </button>
        )}
        {error && (
          <p role="alert" className="text-[14px] font-semibold text-[var(--color-erro)]">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}

/** Botão para abrir a sala na janelinha flutuante (só aparece onde o navegador permite). */
export function PipButton({ supported, onOpen, error }: { supported: boolean; onOpen: () => void; error: string | null }) {
  if (!supported) return null;
  return (
    <div className="mt-6 grid justify-items-center gap-2 text-center">
      <button className="btn btn-ghost btn-small w-auto" onClick={onOpen}>
        <PipIcon />
        Abrir numa janelinha por cima de tudo
      </button>
      {error && (
        <p role="alert" className="text-[14px] font-semibold text-[var(--color-erro)]">
          {error}
        </p>
      )}
    </div>
  );
}

/** Tela da aba principal enquanto a sala está na janelinha. */
export function PipPlaceholder({ code, onBack }: { code: string; onBack: () => void }) {
  return (
    <div className="mx-auto grid max-w-[460px] justify-items-center gap-4 px-4 pt-12 pb-16 text-center">
      <Piece kind="meialua" mood="happy" size={90} alive />
      <h1 className="text-[clamp(26px,7vw,34px)]">A sala {code} está na janelinha</h1>
      <p className="muted max-w-[34ch]">Pode usar o computador à vontade: a janelinha fica por cima das outras e avisa quando a partida começar.</p>
      <button className="btn btn-ghost w-auto px-8" onClick={onBack}>
        Trazer a sala de volta para cá
      </button>
    </div>
  );
}

/** Dentro da janelinha: esconde a barra do topo e pede um toque para liberar o som. */
export function useEmbedMode(embed: boolean) {
  const [needsTap, setNeedsTap] = useState(embed);
  useEffect(() => {
    if (!embed) return;
    document.documentElement.dataset.embed = "1";
    const tap = () => setNeedsTap(false);
    window.addEventListener("pointerdown", tap, { once: true });
    return () => {
      delete document.documentElement.dataset.embed;
      window.removeEventListener("pointerdown", tap);
    };
  }, [embed]);
  return needsTap;
}

export function SoundTapBanner() {
  return (
    <div className="mb-3 rounded-2xl bg-[var(--color-gema)] px-4 py-2.5 text-center text-[15px] font-semibold text-[var(--color-tinta)]" role="note">
      Toque aqui uma vez para o alerta sonoro funcionar na janelinha.
    </div>
  );
}

const PipIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2.5" y="4" width="19" height="15" rx="3" />
    <rect x="12" y="11" width="7" height="5.5" rx="1.5" fill="currentColor" stroke="none" />
  </svg>
);
