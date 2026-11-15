import { CHALLENGES, THEMES } from "@/content/library";
import type { Challenge, Difficulty, GameId, PublishStatus, Theme } from "@/content/types";
import { db } from "./db";

/**
 * Conteúdo publicado, lido do banco (editado pelo painel). Fica em cache por instância
 * por alguns segundos. Se o banco estiver fora, usa o conteúdo embutido no app:
 * o jogo nunca para por causa do painel.
 */
export interface GameSettings {
  enabled: boolean;
  defaultRounds: number;
}
export interface ContentBundle {
  themes: Theme[];
  challenges: Challenge[];
  settings: Partial<Record<GameId, GameSettings>>;
  source: "db" | "fallback";
}

interface Row {
  id: string;
  game: GameId;
  theme: string;
  difficulty: Difficulty;
  min_age: number | null;
  status: PublishStatus;
  lang: "pt-BR";
  data: Record<string, unknown>;
}

export function rowToChallenge(r: Row): Challenge | null {
  const base = { id: r.id, theme: r.theme, difficulty: r.difficulty, status: r.status, lang: r.lang, ...(r.min_age !== null ? { minAge: r.min_age } : {}) };
  const d = r.data;
  switch (r.game) {
    case "nota":
      return d.kind === "secreta" || d.kind === "avaliacao" ? { ...base, game: "nota", kind: d.kind, text: String(d.text ?? "") } : null;
    case "mimica":
      return { ...base, game: "mimica", text: String(d.text ?? "") };
    case "infiltrado":
      return { ...base, game: "infiltrado", major: String(d.major ?? ""), impostor: String(d.impostor ?? "") };
    case "ranking":
      return Array.isArray(d.items) ? { ...base, game: "ranking", title: String(d.title ?? ""), items: d.items.map(String) } : null;
    default:
      return null;
  }
}

const TTL_MS = 30_000;
let cache: { at: number; bundle: ContentBundle } | null = null;

const fallback = (): ContentBundle => ({ themes: THEMES, challenges: CHALLENGES.filter((c) => c.status === "published"), settings: {}, source: "fallback" });

export async function loadContent(): Promise<ContentBundle> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.bundle;
  try {
    const [themes, rows, settings] = await Promise.all([
      db()`select id, label from themes where active order by label` as unknown as Promise<Theme[]>,
      db()`select c.id, c.game, c.theme, c.difficulty, c.min_age, c.status, c.lang, c.data
            from challenges c join themes t on t.id = c.theme
            where c.status = 'published' and t.active` as unknown as Promise<Row[]>,
      db()`select game, enabled, default_rounds from game_settings` as unknown as Promise<{ game: GameId; enabled: boolean; default_rounds: number }[]>,
    ]);
    if (rows.length === 0) return fallback(); // banco vazio (sem seed): usa o embutido
    const bundle: ContentBundle = {
      themes,
      challenges: rows.map(rowToChallenge).filter((c): c is Challenge => c !== null),
      settings: Object.fromEntries(settings.map((s) => [s.game, { enabled: s.enabled, defaultRounds: s.default_rounds }])),
      source: "db",
    };
    cache = { at: Date.now(), bundle };
    return bundle;
  } catch (e) {
    console.error("[conteúdo] usando conteúdo embutido:", e instanceof Error ? e.message : e);
    return fallback();
  }
}

/** Chamado pelo painel depois de salvar, para as mudanças valerem na hora nesta instância. */
export function invalidateContent() {
  cache = null;
}

export async function contentFor<G extends GameId>(game: G) {
  const b = await loadContent();
  const challenges = b.challenges.filter((c) => c.game === game) as Extract<Challenge, { game: G }>[];
  const used = new Set(challenges.map((c) => c.theme));
  return { challenges, themes: b.themes.filter((t) => used.has(t.id)), settings: b.settings[game] ?? null, source: b.source };
}
