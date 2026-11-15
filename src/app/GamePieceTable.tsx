"use client";

import { animate, AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { Piece, PIECES } from "@/brand/Piece";
import { PIECE_KINDS, type PieceKind } from "@/engine/core";
import { useSound } from "@/ui/sound";

let landedThisSession = false;

/**
 * A mesa de feltro com as cinco peças. Na primeira visita, elas pulam para a mesa logo
 * depois da assinatura. Tocar numa peça faz ela pular e falar.
 */
export function GamePieceTable() {
  const reduce = useReducedMotion();
  const row = useRef<HTMLDivElement>(null);
  // A entrada é decidida só no navegador (o servidor sempre desenha as peças no lugar),
  // antes da primeira pintura, para não haver diferença de hidratação nem piscada.
  useLayoutEffect(() => {
    if (landedThisSession || reduce || !row.current) return;
    const buttons = Array.from(row.current.children) as HTMLElement[];
    const anims = buttons.map((el, i) => {
      el.style.opacity = "0";
      const delay = 0.75 + i * 0.09;
      return animate(el, { y: [-90, 0], scaleY: [1.25, 1], opacity: [0, 1] }, { y: { type: "spring", stiffness: 520, damping: 15, mass: 0.9, delay }, scaleY: { type: "spring", stiffness: 520, damping: 15, delay }, opacity: { duration: 0.15, delay } });
    });
    Promise.all(anims).then(() => (landedThisSession = true));
    return () => {
      anims.forEach((a) => a.stop());
      buttons.forEach((el) => {
        el.style.opacity = "";
        el.style.transform = "";
      });
    };
  }, [reduce]);
  const [said, setSaid] = useState<{ k: PieceKind; n: number } | null>(null);
  const [hopping, setHopping] = useState<PieceKind | null>(null);
  const { play } = useSound();
  return (
    <div>
      <div className="relative mt-1.5">
        <div ref={row} className="relative z-[1] flex items-end justify-around px-1.5">
          {PIECE_KINDS.map((k, i) => (
            <button
              key={k}
              style={{ transformOrigin: "50% 100%" }}
              aria-label={`${PIECES[k].name}: ${PIECES[k].role}`}
              className="rounded-2xl"
              onClick={() => {
                setHopping(null);
                requestAnimationFrame(() => setHopping(k));
                setSaid((s) => ({ k, n: (s?.n ?? 0) + 1 }));
                play("tap");
              }}
            >
              <Piece kind={k} size={68} alive blinkDelay={i * 1.3} className={hopping === k ? "hop" : ""} />
            </button>
          ))}
        </div>
        <div className="-mt-1.5 h-[22px] rounded-xl bg-[var(--color-feltro)] shadow-[0_5px_0_var(--color-feltro-d)]" />
      </div>
      <div className="font-display mt-4 min-h-[46px] text-lg leading-snug font-extrabold text-[var(--color-tinta)]" aria-live="polite">
        <AnimatePresence mode="wait">
          {said && (
            <motion.span
              key={said.n}
              className="inline-block rounded-2xl bg-white px-3.5 py-2.5 shadow-[0_3px_0_var(--color-linha)]"
              initial={{ opacity: 0, scale: 0.7, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
            >
              {PIECES[said.k].name}: {PIECES[said.k].line}
            </motion.span>
          )}
          {!said && (
            <motion.span key="hint" className="inline-block py-2.5 text-base font-semibold text-[var(--fg-2)]" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 1.5 } }} exit={{ opacity: 0, transition: { duration: 0.1 } }}>
              Toque numa peça para ela falar.
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
