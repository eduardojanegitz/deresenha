"use client";

import Link from "next/link";
import { useState } from "react";
import { Piece } from "@/brand/Piece";
import { GAMES, MODE_LABEL, type PlayMode } from "@/games/registry";
import { IconPhone, IconPhones } from "@/ui/Icons";

type Filter = "all" | "ready" | PlayMode;
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "ready", label: "Jogue agora" },
  { id: "shared", label: "Num celular só" },
  { id: "room", label: "Cada um no seu" },
];

export function Library() {
  const [f, setF] = useState<Filter>("all");
  const list = GAMES.filter((g) => f === "all" || (f === "ready" ? g.status === "ready" : g.modes.includes(f)));
  return (
    <>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar jogos">
        {FILTERS.map((x) => (
          <button key={x.id} className="chip" aria-pressed={f === x.id} onClick={() => setF(x.id)}>
            {x.label}
          </button>
        ))}
      </div>
      {f === "room" && <p className="muted mt-3.5 text-[15px]">Cada um no seu celular é o Modo Sala. Por enquanto ele funciona no Jogo da Nota e no Infiltrado.</p>}
      <ul className="mt-[18px] grid grid-cols-2 gap-3.5 md:grid-cols-3 lg:grid-cols-4">
        {list.map((g) => {
          const ready = g.status === "ready";
          return (
            <li key={g.id}>
              <Link
                href={`/jogos/${g.id}`}
                className="card mb-[5px] grid h-full grid-rows-[auto_1fr] overflow-hidden transition-[transform,box-shadow] duration-100 active:translate-y-[5px] active:shadow-none"
              >
                <div className="relative grid aspect-[5/4] place-items-center" style={{ background: g.tint }}>
                  <span className={`absolute top-2.5 left-2.5 rounded-full px-2.5 py-[7px] text-xs leading-none font-bold ${ready ? "bg-[var(--color-feltro)] text-white" : "bg-white text-[var(--color-tinta)]"}`}>
                    {ready ? "Jogue agora" : g.stage ? `Etapa ${g.stage}` : "Em breve"}
                  </span>
                  <Piece kind={g.piece} mood={ready ? "happy" : "sleep"} size={88} alive={ready} />
                </div>
                <div className="grid content-start gap-1 px-3.5 pt-3 pb-4">
                  <h2 className="text-lg font-extrabold">{g.name}</h2>
                  <p className="text-sm leading-snug text-[var(--fg-2)]">{g.tagline}</p>
                  <div className="mt-1.5 flex items-center gap-1.5 text-[var(--fg-2)]">
                    {g.modes.map((m) => (
                      <span key={m} title={MODE_LABEL[m]}>
                        {m === "shared" ? <IconPhone /> : <IconPhones />}
                      </span>
                    ))}
                    <span className="sr-only">{g.modes.map((m) => MODE_LABEL[m]).join(", ")}</span>
                    <span className="ml-1 text-[13px] font-semibold">
                      {g.players.min} a {g.players.max}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
        {list.length === 0 && <li className="col-span-full py-10 text-center text-[var(--fg-2)]">Nenhum jogo com esse filtro.</li>}
      </ul>
    </>
  );
}
