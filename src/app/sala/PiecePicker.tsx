"use client";

import { Piece, PIECES } from "@/brand/Piece";
import { PIECE_KINDS, type PieceKind } from "@/engine/core";

export function PiecePicker({ value, onChange, taken = [] }: { value: PieceKind; onChange: (p: PieceKind) => void; taken?: PieceKind[] }) {
  return (
    <div className="grid gap-2.5">
      <span className="label" id="avatar-l">
        Sua peça
      </span>
      <div className="flex justify-between gap-2" role="radiogroup" aria-labelledby="avatar-l">
        {PIECE_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={value === k}
            aria-label={`${PIECES[k].name}${taken.includes(k) ? ", já escolhida por alguém" : ""}`}
            onClick={() => onChange(k)}
            className={`grid flex-1 place-items-center rounded-[18px] border-[2.5px] py-2.5 transition-transform active:scale-95 ${value === k ? "border-[var(--color-tinta)] bg-white" : "border-transparent"} ${taken.includes(k) && value !== k ? "opacity-50" : ""}`}
          >
            <Piece kind={k} mood={value === k ? "happy" : "neutral"} size={46} />
          </button>
        ))}
      </div>
    </div>
  );
}
