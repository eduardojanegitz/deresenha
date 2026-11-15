"use client";

import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Piece } from "@/brand/Piece";
import { challengesFor, themeLabel, themesFor } from "@/content/library";
import type { RankingChallenge } from "@/content/types";
import type { Player } from "@/engine/core";
import { createRanking, currentItem, DEFAULT_RANKING_CONFIG, reduceRanking, type RankingAction, type RankingConfig, type RankingState } from "@/engine/ranking";
import { EndActions, MatchFrame, SetupShell } from "@/ui/frame";
import { IconLock, IconShare } from "@/ui/Icons";
import { PlayersEditor, toPlayers, usePlayerNames } from "@/ui/players";
import { ChipGroup, ErrorNote, PhaseStage, Progress, Stepper, useEngine } from "@/ui/play";
import { useSound } from "@/ui/sound";
import { shareRankingImage } from "./shareImage";

export function RankingGame() {
  const [names, setNames] = usePlayerNames();
  const [config, setConfig] = useState<RankingConfig>(DEFAULT_RANKING_CONFIG);
  const all = themesFor("ranking").map((t) => t.id);
  const [themes, setThemes] = useState<string[]>(all);
  const [match, setMatch] = useState<{ key: number; players: Player[]; pool: RankingChallenge[] } | null>(null);
  const start = () => setMatch({ key: Date.now(), players: toPlayers(names), pool: challengesFor("ranking", themes) });

  if (match) return <RankingMatch key={match.key} config={config} players={match.players} pool={match.pool} onRematch={start} onSetup={() => setMatch(null)} />;

  return (
    <SetupShell title="Ranking às Cegas" subtitle="Cada rodada, uma pessoa monta o ranking. A turma pode palpitar, mas quem decide é ela." canStart={names.length >= 1} onStart={start} hint="Coloque pelo menos uma pessoa.">
      <PlayersEditor names={names} onChange={setNames} min={1} />
      <ChipGroup
        label="Temas"
        multi
        options={all.map((id) => ({ value: id, label: themeLabel(id) }))}
        value={themes}
        onToggle={(id) => setThemes((t) => (t.includes(id) ? (t.length === 1 ? t : t.filter((x) => x !== id)) : [...t, id]))}
      />
      <Stepper label="Rodadas" value={config.rounds} min={1} max={10} onChange={(rounds) => setConfig((c) => ({ ...c, rounds }))} />
    </SetupShell>
  );
}

const MEDAL = ["var(--color-gema)", "var(--color-ceu)", "var(--color-chiclete)", "var(--color-lilas)", "var(--color-menta)", "var(--color-gema-t)", "var(--color-ceu-t)"];

function RankingMatch({ config, players, pool, onRematch, onSetup }: { config: RankingConfig; players: Player[]; pool: RankingChallenge[]; onRematch: () => void; onSetup: () => void }) {
  const { state: s, dispatch, error } = useEngine<RankingState, RankingAction>(() => createRanking(config, players, pool, Math.random), (st, a, rng) => reduceRanking(st, a, pool, rng));
  const { play } = useSound();
  const reduce = useReducedMotion();
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const player = s.players.find((p) => p.id === s.playerId) as Player;
  const item = currentItem(s);

  const share = async () => {
    const res = await shareRankingImage(s.list.title, s.slots as string[], player.name);
    setShareMsg(res === "shared" ? "Compartilhado." : res === "downloaded" ? "Imagem salva no aparelho." : "Não deu para gerar a imagem neste navegador.");
  };

  let body: React.ReactNode;
  if (s.phase === "end") {
    body = (
      <>
        <h1 className="text-center">Os rankings da turma</h1>
        <ul className="grid gap-3">
          {s.history.map((h, i) => {
            const p = s.players.find((x) => x.id === h.playerId)!;
            return (
              <li key={i} className="card grid gap-2 p-4">
                <div className="flex items-center gap-2.5">
                  <Piece kind={p.piece} size={36} />
                  <div>
                    <b className="font-display text-lg font-extrabold">{h.title}</b>
                    <div className="text-sm text-[var(--fg-2)]">por {p.name}</div>
                  </div>
                </div>
                <ol className="grid gap-1 pl-1">
                  {h.ranking.map((it, k) => (
                    <li key={it} className="flex gap-2.5">
                      <span className="num w-5 text-[var(--fg-2)]">{k + 1}</span>
                      {it}
                    </li>
                  ))}
                </ol>
              </li>
            );
          })}
        </ul>
        <EndActions onRematch={onRematch} onSetup={onSetup} />
      </>
    );
  } else {
    body = (
      <>
        <Progress round={s.round} total={s.config.rounds} />
        <div className="flex items-center gap-3">
          <Piece kind={player.piece} mood={s.phase === "done" ? "happy" : "neutral"} size={44} alive />
          <div>
            <span className="muted text-[15px]">Ranking de {player.name}</span>
            <h1 className="text-[clamp(24px,6.4vw,34px)]">{s.list.title}</h1>
          </div>
        </div>

        <div className="relative grid min-h-[104px] place-items-center rounded-[24px] bg-[var(--color-ceu-t)] p-4" aria-live="polite">
          <AnimatePresence mode="popLayout" initial={false}>
            {item ? (
              <motion.div key={item} layoutId={`item-${item}`} className="font-display rounded-[18px] bg-white px-5 py-3.5 text-center text-[clamp(22px,6vw,30px)] leading-tight font-black text-[var(--color-tinta)] shadow-[0_5px_0_var(--color-ceu-d)]" initial={reduce ? { opacity: 0 } : { opacity: 0, y: -30, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 480, damping: 24 }}>
                <span className="sr-only">Item {s.index + 1} de {s.queue.length}: </span>
                {item}
              </motion.div>
            ) : (
              <motion.p key="done" className="font-display text-xl font-extrabold text-[var(--color-tinta)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                Ranking completo!
              </motion.p>
            )}
          </AnimatePresence>
          {item && <span className="absolute top-2.5 right-3.5 text-[13px] font-bold text-[var(--color-tinta-2)]">{s.index + 1} de {s.queue.length}</span>}
        </div>

        <LayoutGroup>
          <ol className="grid gap-2.5" aria-label="Posições do ranking">
            {s.slots.map((filled, i) => (
              <li key={i}>
                <button
                  disabled={filled !== null || s.phase !== "placing"}
                  onClick={() => dispatch({ type: "place", slot: i }) && play(s.index + 1 >= s.queue.length ? "win" : "confirm")}
                  className={`grid min-h-[62px] w-full grid-cols-[48px_1fr_auto] items-center gap-3 rounded-[20px] pr-4 pl-2 text-left transition-[transform,box-shadow] duration-100 ${filled ? "bg-[var(--card)] shadow-[0_4px_0_var(--line)]" : "border-[2.5px] border-dashed border-[var(--line)] bg-transparent active:translate-y-1 enabled:hover:border-[var(--color-tinta)]"}`}
                  aria-label={filled ? `Posição ${i + 1}: ${filled}, travada` : `Colocar ${item ?? ""} na posição ${i + 1}`}
                >
                  <span className="num grid size-10 place-items-center rounded-[14px] text-xl text-[var(--color-tinta)]" style={{ background: MEDAL[i] }}>
                    {i + 1}
                  </span>
                  {filled ? (
                    <motion.span layoutId={`item-${filled}`} className="font-display text-[19px] font-extrabold" transition={{ type: "spring", stiffness: 520, damping: 32 }}>
                      {filled}
                    </motion.span>
                  ) : (
                    <span className="text-[15px] font-semibold text-[var(--fg-2)]">{item ? "Toque para colocar aqui" : ""}</span>
                  )}
                  {filled && (
                    <span className="text-[var(--fg-2)]" aria-hidden="true">
                      <IconLock />
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ol>
        </LayoutGroup>

        {s.phase === "done" && (
          <motion.div className="grid gap-2.5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduce ? 0 : 0.4 }}>
            <button className="btn btn-ghost" onClick={share}>
              <IconShare /> Compartilhar como imagem
            </button>
            {shareMsg && (
              <p role="status" className="text-center text-[15px] text-[var(--fg-2)]">
                {shareMsg}
              </p>
            )}
            <button className="btn btn-gema" onClick={() => dispatch({ type: "next" }) && play("tap")}>
              {s.round >= s.config.rounds ? "Ver todos os rankings" : "Próximo ranking"}
            </button>
          </motion.div>
        )}
      </>
    );
  }

  return (
    <MatchFrame onExit={onSetup}>
      <PhaseStage phaseKey={`${s.round}-${s.phase === "end" ? "end" : "play"}`}>
        {body}
        <ErrorNote message={error} />
      </PhaseStage>
    </MatchFrame>
  );
}
