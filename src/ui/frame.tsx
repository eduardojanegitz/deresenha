"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Piece } from "@/brand/Piece";
import { recordMatch } from "@/history/history";
import { Sheet } from "./play";
import { shareResultImage } from "./shareResult";

/** Cabeçalho da tela de configuração, igual para todos os jogos. */
export function SetupShell({ title, subtitle, children, canStart, onStart, startLabel = "Começar partida", hint }: { title: string; subtitle?: string; children: React.ReactNode; canStart: boolean; onStart: () => void; startLabel?: string; hint?: string }) {
  return (
    <div className="mx-auto max-w-[560px] px-4 pt-2 pb-6">
      <h1>{title}</h1>
      {subtitle && <p className="muted mt-2">{subtitle}</p>}
      <div className="mt-8 grid gap-8">{children}</div>
      <div className="sticky-cta">
        <button className="btn" disabled={!canStart} onClick={onStart}>
          {startLabel}
        </button>
        {!canStart && hint && <p className="muted text-center text-[15px]">{hint}</p>}
      </div>
    </div>
  );
}

/** Moldura da partida: protege contra sair sem querer e oferece "Sair da partida". */
export function MatchFrame({ children, onExit }: { children: React.ReactNode; onExit: () => void }) {
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  return (
    <div className="mx-auto max-w-[560px] px-4 pt-1 pb-14">
      {children}
      <div className="mt-10 text-center">
        <button className="text-[15px] font-semibold text-[var(--fg-2)] underline underline-offset-4" onClick={() => setConfirm(true)}>
          Sair da partida
        </button>
      </div>
      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Sair da partida?" piece={<Piece kind="meialua" mood="sad" size={44} />}>
        <p className="text-[var(--color-tinta-2)]">O placar desta partida vai se perder.</p>
        <div className="mt-1.5 grid gap-2.5">
          <button className="btn btn-rosa" onClick={onExit}>
            Sair da partida
          </button>
          <button className="btn btn-ghost" onClick={() => setConfirm(false)}>
            Continuar jogando
          </button>
        </div>
      </Sheet>
    </div>
  );
}

/** Resultado de uma partida, para o histórico, o compartilhamento e a Noite de Jogos. */
export interface MatchSummary {
  game: string;
  gameName: string;
  players: { id: string; name: string; score: number }[];
  scored: boolean;
  unit?: string;
}

/** Ligação com a Noite de Jogos: em vez de revanche, a partida devolve os pontos. */
export interface NightLink {
  name: string;
  onContinue: (scores: Record<string, number>) => void;
  last: boolean;
}

/** Ações do fim de partida, iguais em todos os jogos. Também registra a partida no histórico. */
export function EndActions({ onRematch, onSetup, result, night }: { onRematch: () => void; onSetup: () => void; result?: MatchSummary; night?: NightLink }) {
  const router = useRouter();
  const recordId = useRef(`${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!result) return;
    recordMatch({ id: recordId.current, game: result.game, at: Date.now(), scored: result.scored, players: result.players.map(({ name, score }) => ({ name, score })), night: night?.name });
  }, [result, night?.name]);
  const share = async () => {
    if (!result) return;
    const rows = [...result.players].sort((a, b) => b.score - a.score).map((p) => ({ name: p.name, value: result.scored ? `${p.score}${result.unit ? ` ${result.unit}` : ""}` : "" }));
    const r = await shareResultImage({ title: result.gameName, subtitle: night ? night.name : new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long" }), rows, filename: "resultado-deresenha.png" });
    setShareMsg(r === "shared" ? "Compartilhado." : r === "downloaded" ? "Imagem salva no aparelho." : "Não deu para gerar a imagem neste navegador.");
  };
  const scores = result ? Object.fromEntries(result.players.map((p) => [p.id, result.scored ? p.score : 0])) : {};
  return (
    <div className="mt-2 grid gap-2.5">
      {night ? (
        <button className="btn btn-gema" onClick={() => night.onContinue(scores)}>
          {night.last ? "Ver o campeão da noite" : "Continuar a Noite de Jogos"}
        </button>
      ) : (
        <button className="btn btn-gema" onClick={onRematch}>
          Revanche
        </button>
      )}
      {result?.scored && (
        <button className="btn btn-ghost" onClick={share}>
          Compartilhar resultado
        </button>
      )}
      {shareMsg && (
        <p role="status" className="text-center text-[15px] text-[var(--fg-2)]">
          {shareMsg}
        </p>
      )}
      {!night && (
        <>
          <button className="btn btn-ghost" onClick={onSetup}>
            Mudar configuração
          </button>
          <button className="btn btn-ghost" onClick={() => router.push("/jogos")}>
            Escolher outro jogo
          </button>
        </>
      )}
    </div>
  );
}

/** Jogo desativado no painel administrativo. */
export function Unavailable() {
  return (
    <div className="mx-auto grid max-w-[480px] justify-items-center gap-5 px-4 pt-10 pb-16 text-center">
      <Piece kind="tijolo" mood="sleep" size={100} />
      <h1>Jogo em pausa</h1>
      <p className="muted max-w-[34ch]">Esse jogo está temporariamente fora do ar enquanto ajustamos o conteúdo. Que tal outro?</p>
      <a href="/jogos" className="btn">
        Ver os jogos
      </a>
    </div>
  );
}
