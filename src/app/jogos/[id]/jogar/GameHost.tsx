"use client";

import type { GameId } from "@/content/types";
import { InfiltradoGame } from "@/games/infiltrado/InfiltradoGame";
import { MimicaGame } from "@/games/mimica/MimicaGame";
import { NotaGame } from "@/games/nota/NotaGame";
import { RankingGame } from "@/games/ranking/RankingGame";

/** Mapa de jogos jogáveis. Um jogo novo entra aqui e no registro. */
const SCREENS: Partial<Record<GameId, React.ComponentType>> = {
  nota: NotaGame,
  mimica: MimicaGame,
  infiltrado: InfiltradoGame,
  ranking: RankingGame,
};

export function GameHost({ id }: { id: GameId }) {
  const Screen = SCREENS[id];
  if (!Screen) return <p className="p-6">Esse jogo ainda não está disponível.</p>;
  return <Screen />;
}
