"use client";

import { motion, useReducedMotion } from "motion/react";
import { Piece, type Mood } from "@/brand/Piece";
import type { Player } from "@/engine/core";
import { queda } from "./motion";

/**
 * Régua de 0 a 10 onde as peças dos jogadores caem no número que escolheram.
 * Quem escolheu o mesmo número empilha. `hit` destaca o número certo.
 */
export function Track({ items, hit, show, min = 0, max = 10 }: { items: { player: Player; value: number; mood: Mood }[]; hit: number | null; show: boolean; min?: number; max?: number }) {
  const reduce = useReducedMotion();
  const span = max - min;
  const pos = (v: number) => `${4.5 + ((v - min) / span) * 91}%`;
  const stack: Record<number, number> = {};
  const tallest = Math.max(1, ...Object.values(items.reduce<Record<number, number>>((a, it) => ((a[it.value] = (a[it.value] ?? 0) + 1), a), {})));
  return (
    <div className="relative w-full max-w-[520px]" style={{ paddingTop: 18 + tallest * 50 }}>
      {items.map((it, k) => {
        const s = (stack[it.value] = (stack[it.value] ?? 0) + 1);
        return (
          <motion.div
            key={it.player.id}
            className="absolute grid -translate-x-1/2 justify-items-center"
            style={{ left: pos(it.value), bottom: 46 + (s - 1) * 50 }}
            initial={{ opacity: 0, y: reduce ? 0 : -80 }}
            animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: reduce ? 0 : -80 }}
            transition={reduce ? { duration: 0 } : queda(k)}
          >
            <Piece kind={it.player.piece} mood={it.mood} size={34} />
            <small className="mt-0.5 max-w-14 truncate text-[11px] leading-none font-bold text-[#CFE3DA]">{it.player.name}</small>
          </motion.div>
        );
      })}
      <div className="relative h-[42px] rounded-[14px] bg-[var(--color-noite-3)]" aria-hidden="true">
        {Array.from({ length: span + 1 }, (_, i) => min + i).map((n) => {
          const isHit = show && n === hit;
          return (
            <motion.span
              key={n}
              className={`num absolute top-1/2 grid place-items-center rounded-full ${isHit ? "size-[34px] bg-[var(--color-gema)] text-[17px] text-[var(--color-tinta)]" : "size-7 text-sm text-[#6FA48F]"}`}
              style={{ left: pos(n), x: "-50%", y: "-50%" }}
              animate={{ scale: isHit && !reduce ? [1.7, 1] : 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 14 }}
            >
              {n}
            </motion.span>
          );
        })}
      </div>
    </div>
  );
}
