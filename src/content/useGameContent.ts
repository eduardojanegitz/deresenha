"use client";

import { useEffect, useMemo, useState } from "react";
import { challengesFor, registerThemes, themesFor } from "./library";
import type { Challenge, GameId, Theme } from "./types";

type Playable = Extract<GameId, "nota" | "mimica" | "infiltrado" | "ranking">;

interface Bundle<G extends Playable> {
  challenges: Extract<Challenge, { game: G }>[];
  themes: Theme[];
  settings: { enabled: boolean; defaultRounds: number } | null;
}

/**
 * Conteúdo de um jogo no navegador. Começa com o conteúdo embutido (abre na hora, funciona
 * sem internet) e troca pelo publicado no painel assim que a API responde.
 */
export function useGameContent<G extends Playable>(game: G) {
  const [bundle, setBundle] = useState<Bundle<G>>(() => ({ challenges: challengesFor(game) as unknown as Bundle<G>["challenges"], themes: themesFor(game), settings: null }));
  const [fresh, setFresh] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch(`/api/content/${game}`)
      .then((r) => (r.ok ? (r.json() as Promise<Bundle<G>>) : null))
      .then((d) => {
        if (!alive || !d || !Array.isArray(d.challenges) || d.challenges.length === 0) return;
        registerThemes(d.themes);
        setBundle(d);
        setFresh(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [game]);
  return { ...bundle, fresh };
}

/** IDs de tema com conteúdo, na ordem dos temas, opcionalmente filtrando desafios. */
export function useThemeIds<C extends Challenge>(challenges: C[], themes: Theme[], filter?: (c: C) => boolean) {
  return useMemo(() => {
    const used = new Set(challenges.filter((c) => !filter || filter(c)).map((c) => c.theme));
    return themes.filter((t) => used.has(t.id)).map((t) => t.id);
    // filter é estável por chamada (definido inline com dependências implícitas do jogo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenges, themes]);
}
