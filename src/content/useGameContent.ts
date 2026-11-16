"use client";

import { useEffect, useMemo, useState } from "react";
import { contentGameOf, customTheme, loadSets, toChallenges, type CustomSet } from "@/custom/customSets";
import { challengesFor, registerThemes, themesFor } from "./library";
import type { Challenge, GameId, Theme } from "./types";

export type Playable = Extract<GameId, "nota" | "mimica" | "infiltrado" | "ranking" | "voce-prefere" | "quem-sou-eu" | "quiz" | "limite" | "mentira">;

interface Bundle<G extends Playable> {
  challenges: Extract<Challenge, { game: G }>[];
  themes: Theme[];
  settings: { enabled: boolean; defaultRounds: number } | null;
}

/** Temas personalizados da turma (guardados neste aparelho), atualizados quando mudam. */
export function useCustomSets() {
  const [sets, setSets] = useState<CustomSet[]>([]);
  useEffect(() => {
    const load = () => setSets(loadSets());
    load();
    window.addEventListener("deresenha:temas", load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener("deresenha:temas", load);
      window.removeEventListener("storage", load);
    };
  }, []);
  return sets;
}

/**
 * Conteúdo de um jogo no navegador. Começa com o conteúdo embutido (abre na hora, funciona
 * sem internet), troca pelo publicado no painel assim que a API responde e soma os temas
 * personalizados da turma, que aparecem primeiro.
 */
export function useGameContent<G extends Playable>(game: G) {
  const [bundle, setBundle] = useState<Bundle<G>>(() => ({ challenges: challengesFor(game) as unknown as Bundle<G>["challenges"], themes: themesFor(game), settings: null }));
  const [fresh, setFresh] = useState(false);
  const sets = useCustomSets();
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

  const merged = useMemo(() => {
    const mine = sets.filter((s) => contentGameOf(s.game) === game);
    if (!mine.length) return bundle;
    const themes = mine.map(customTheme);
    registerThemes(themes);
    const extra = mine.flatMap(toChallenges) as Bundle<G>["challenges"];
    return { ...bundle, challenges: [...extra, ...bundle.challenges], themes: [...themes, ...bundle.themes] };
  }, [bundle, sets, game]);

  return { ...merged, fresh };
}

/** IDs de tema com conteúdo, na ordem dos temas. */
export function useThemeIds<C extends Challenge>(challenges: C[], themes: Theme[]) {
  return useMemo(() => {
    const used = new Set(challenges.map((c) => c.theme));
    return themes.filter((t) => used.has(t.id)).map((t) => t.id);
  }, [challenges, themes]);
}
