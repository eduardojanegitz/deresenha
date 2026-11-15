"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Piece, PIECES } from "@/brand/Piece";
import { PIECE_KINDS, type PieceKind } from "@/engine/core";
import { useSound } from "@/ui/sound";

/** A mesa de feltro com as cinco peças. Tocar numa peça faz ela pular e falar. */
export function GamePieceTable() {
  const [said, setSaid] = useState<{ k: PieceKind; n: number } | null>(null);
  const [hopping, setHopping] = useState<PieceKind | null>(null);
  const { play } = useSound();
  return (
    <div>
      <div className="relative mt-1.5">
        <div className="relative z-[1] flex items-end justify-around px-1.5">
          {PIECE_KINDS.map((k, i) => (
            <button
              key={k}
              aria-label={`${PIECES[k].name}: ${PIECES[k].role}`}
              className="rounded-2xl"
              onClick={() => {
                setHopping(null);
                requestAnimationFrame(() => setHopping(k));
                setSaid((s) => ({ k, n: (s?.n ?? 0) + 1 }));
                play("tap");
              }}
            >
              <Piece kind={k} size={62} alive blinkDelay={i * 1.3} className={hopping === k ? "hop" : ""} />
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
        </AnimatePresence>
      </div>
    </div>
  );
}
