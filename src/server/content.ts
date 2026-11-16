import { CHALLENGES, THEMES } from "@/content/library";
import { TURMA_THEMES } from "@/content/turma";
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
    case "voce-prefere":
      return { ...base, game: "voce-prefere", a: String(d.a ?? ""), b: String(d.b ?? "") };
    case "quem-sou-eu":
      return { ...base, game: "quem-sou-eu", name: String(d.name ?? "") };
    case "quiz": {
      const options = Array.isArray(d.options) ? d.options.map(String) : [];
      const answer = Number(d.answer);
      return options.length >= 2 && Number.isInteger(answer) && answer >= 0 && answer < options.length ? { ...base, game: "quiz", question: String(d.question ?? ""), options, answer } : null;
    }
    case "limite": {
      const answer = Number(d.answer);
      return Number.isFinite(answer) && answer > 0
        ? { ...base, game: "limite", question: String(d.question ?? ""), answer, unit: String(d.unit ?? ""), ...(d.fact ? { fact: String(d.fact) } : {}) }
        : null;
    }
    default:
      return null;
  }
}

/** Temas da turma (os mais divertidos) no topo, na ordem em que foram pensados; o resto em ordem alfabética. */
function featuredFirst(themes: Theme[]): Theme[] {
  const rank = new Map(TURMA_THEMES.map((t, i) => [t.id, i]));
  return [...themes].sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999) || a.label.localeCompare(b.label, "pt-BR"));
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
      themes: featuredFirst(themes),
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
  let challenges = b.challenges.filter((c) => c.game === game) as Extract<Challenge, { game: G }>[];
  let themes = b.themes;
  // Jogo novo cujo conteúdo ainda não foi copiado para o banco (falta rodar o seed):
  // usa o embutido, para o jogo funcionar mesmo assim.
  if (challenges.length === 0 && b.source === "db") {
    challenges = CHALLENGES.filter((c) => c.game === game && c.status === "published") as Extract<Challenge, { game: G }>[];
    themes = THEMES;
  }
  const used = new Set(challenges.map((c) => c.theme));
  return { challenges, themes: themes.filter((t) => used.has(t.id)), settings: b.settings[game] ?? null, source: b.source };
}
