import { randomBytes } from "node:crypto";
import { z } from "zod";
import type { Difficulty, GameId, PublishStatus } from "@/content/types";
import { parseGuess } from "@/engine/limite";
import { db } from "@/server/db";

/** Acesso ao banco usado só pelo painel. Toda escrita passa por validação com zod. */

export const ADMIN_GAMES = ["nota", "mimica", "infiltrado", "ranking", "voce-prefere", "quem-sou-eu", "quiz", "limite", "mentira"] as const;
export type AdminGame = (typeof ADMIN_GAMES)[number];
export const GAME_LABEL: Record<AdminGame, string> = { nota: "Jogo da Nota", mimica: "Mímica", infiltrado: "Infiltrado", ranking: "Ranking às Cegas", "voce-prefere": "Você Prefere?", "quem-sou-eu": "Quem Sou Eu?", quiz: "Quiz Relâmpago", limite: "Jogo do Limite", mentira: "Mentira Sincera" };
export const STATUS_LABEL: Record<PublishStatus, string> = { published: "Publicado", draft: "Rascunho", archived: "Arquivado" };
export const DIFF_LABEL: Record<Difficulty, string> = { facil: "Fácil", medio: "Médio", dificil: "Difícil" };

export interface ChallengeRow {
  id: string;
  game: AdminGame;
  theme: string;
  difficulty: Difficulty;
  min_age: number | null;
  status: PublishStatus;
  data: Record<string, unknown>;
  updated_at: string;
}
export interface ThemeRow {
  id: string;
  label: string;
  active: boolean;
  total: number;
}

const q = <T>(p: unknown) => p as Promise<T>;

/* ---------- leitura ---------- */

export async function countsByGame() {
  return q<{ game: AdminGame; status: PublishStatus; n: number }[]>(db()`select game, status, count(*)::int as n from challenges group by game, status`);
}

export async function listThemes() {
  return q<ThemeRow[]>(db()`
    select t.id, t.label, t.active, count(c.id)::int as total
    from themes t left join challenges c on c.theme = t.id
    group by t.id order by t.label`);
}

export async function countsByTheme() {
  return q<{ theme: string; game: AdminGame; n: number }[]>(db()`select theme, game, count(*)::int as n from challenges where status = 'published' group by theme, game`);
}

export async function listChallenges(f: { game?: string; theme?: string; status?: string; q?: string; page: number }) {
  const limit = 40;
  const offset = (f.page - 1) * limit;
  const like = f.q ? `%${f.q.toLowerCase()}%` : null;
  const rows = await q<(ChallengeRow & { total: number })[]>(db()`
    select id, game, theme, difficulty, min_age, status, data, updated_at, count(*) over ()::int as total
    from challenges
    where (${f.game ?? null}::text is null or game = ${f.game ?? null})
      and (${f.theme ?? null}::text is null or theme = ${f.theme ?? null})
      and (${f.status ?? null}::text is null or status = ${f.status ?? null})
      and (${like}::text is null or lower(data::text) like ${like})
    order by updated_at desc, id
    limit ${limit} offset ${offset}`);
  return { rows, total: rows[0]?.total ?? 0, limit };
}

export async function getChallenge(id: string) {
  const rows = await q<ChallengeRow[]>(db()`select id, game, theme, difficulty, min_age, status, data, updated_at from challenges where id = ${id}`);
  return rows[0] ?? null;
}

export async function listGameSettings() {
  return q<{ game: AdminGame; enabled: boolean; default_rounds: number }[]>(db()`select game, enabled, default_rounds from game_settings order by game`);
}

/* ---------- validação ---------- */

const text = (min: number, max: number, label: string) => z.string().trim().min(min, `${label}: escreva pelo menos ${min} caracteres.`).max(max, `${label}: use até ${max} caracteres.`);

export const challengeSchema = z
  .object({
    id: z.string().max(120).optional(),
    game: z.enum(ADMIN_GAMES),
    theme: z.string().min(1, "Escolha um tema."),
    difficulty: z.enum(["facil", "medio", "dificil"]),
    minAge: z.preprocess((v) => (v === "" || v === null || v === undefined ? null : Number(v)), z.number().int().min(0).max(21).nullable()),
    status: z.enum(["published", "draft", "archived"]),
    kind: z.enum(["secreta", "avaliacao"]).optional(),
    text: z.string().optional(),
    major: z.string().optional(),
    impostor: z.string().optional(),
    title: z.string().optional(),
    items: z.string().optional(),
    a: z.string().optional(),
    b: z.string().optional(),
    name: z.string().optional(),
    question: z.string().optional(),
    /** Quiz: a primeira linha é a alternativa correta. */
    options: z.string().optional(),
    /** Jogo do Limite: o valor real, escrito como brasileiro escreve ("1.500", "2,5"). */
    answer: z.string().optional(),
    unit: z.string().optional(),
    fact: z.string().optional(),
  })
  .transform((v, ctx) => {
    const issue = (message: string) => {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    };
    let data: Record<string, unknown>;
    switch (v.game) {
      case "nota": {
        if (!v.kind) return issue("Escolha se é Nota Secreta ou Avaliação.");
        const t = text(3, 140, "Texto").safeParse(v.text ?? "");
        if (!t.success) return issue(t.error.issues[0]!.message);
        data = { kind: v.kind, text: t.data };
        break;
      }
      case "mimica": {
        const t = text(1, 60, "Palavra ou situação").safeParse(v.text ?? "");
        if (!t.success) return issue(t.error.issues[0]!.message);
        data = { text: t.data };
        break;
      }
      case "infiltrado": {
        const a = text(1, 40, "Palavra da maioria").safeParse(v.major ?? "");
        const b = text(1, 40, "Palavra do infiltrado").safeParse(v.impostor ?? "");
        if (!a.success) return issue(a.error.issues[0]!.message);
        if (!b.success) return issue(b.error.issues[0]!.message);
        if (a.data.toLowerCase() === b.data.toLowerCase()) return issue("As duas palavras precisam ser diferentes.");
        data = { major: a.data, impostor: b.data };
        break;
      }
      case "ranking": {
        const t = text(3, 80, "Título").safeParse(v.title ?? "");
        if (!t.success) return issue(t.error.issues[0]!.message);
        const items = (v.items ?? "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        if (items.length < 5) return issue("O ranking precisa de pelo menos 5 itens, um por linha.");
        if (items.length > 20) return issue("Use até 20 itens.");
        if (items.some((i) => i.length > 40)) return issue("Cada item pode ter até 40 caracteres.");
        if (new Set(items.map((i) => i.toLowerCase())).size !== items.length) return issue("Há itens repetidos.");
        data = { title: t.data, items };
        break;
      }
      case "voce-prefere": {
        const a = text(2, 100, "Opção A").safeParse(v.a ?? "");
        const b = text(2, 100, "Opção B").safeParse(v.b ?? "");
        if (!a.success) return issue(a.error.issues[0]!.message);
        if (!b.success) return issue(b.error.issues[0]!.message);
        if (a.data.toLowerCase() === b.data.toLowerCase()) return issue("As duas opções precisam ser diferentes.");
        data = { a: a.data, b: b.data };
        break;
      }
      case "quem-sou-eu": {
        const n = text(1, 40, "Identidade").safeParse(v.name ?? "");
        if (!n.success) return issue(n.error.issues[0]!.message);
        data = { name: n.data };
        break;
      }
      case "quiz": {
        const t = text(5, 160, "Pergunta").safeParse(v.question ?? "");
        if (!t.success) return issue(t.error.issues[0]!.message);
        const options = (v.options ?? "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        if (options.length < 2 || options.length > 4) return issue("Escreva de 2 a 4 alternativas, uma por linha. A primeira é a correta.");
        if (options.some((o) => o.length > 60)) return issue("Cada alternativa pode ter até 60 caracteres.");
        if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) return issue("Há alternativas repetidas.");
        data = { question: t.data, options, answer: 0 };
        break;
      }
      case "mentira": {
        const t = text(5, 140, "Pergunta").safeParse(v.text ?? "");
        if (!t.success) return issue(t.error.issues[0]!.message);
        data = { text: t.data };
        break;
      }
      case "limite": {
        const t = text(5, 200, "Pergunta").safeParse(v.question ?? "");
        if (!t.success) return issue(t.error.issues[0]!.message);
        const answer = parseGuess(v.answer ?? "");
        if (answer === null || answer <= 0) return issue("Escreva o valor real como número, por exemplo 8,65 ou 1.500.");
        const unit = (v.unit ?? "").trim();
        if (unit.length > 30) return issue("A unidade pode ter até 30 caracteres.");
        const fact = (v.fact ?? "").trim();
        if (fact.length > 200) return issue("A curiosidade pode ter até 200 caracteres.");
        data = { question: t.data, answer, unit, ...(fact ? { fact } : {}) };
        break;
      }
    }
    return { id: v.id, game: v.game, theme: v.theme, difficulty: v.difficulty, minAge: v.minAge, status: v.status, data };
  });

export type ChallengeInput = z.output<typeof challengeSchema>;

/* ---------- escrita ---------- */

export async function upsertChallenge(c: ChallengeInput) {
  const theme = await q<{ id: string }[]>(db()`select id from themes where id = ${c.theme}`);
  if (!theme[0]) throw new Error("Tema não encontrado.");
  const id = c.id || `${c.game}-${c.theme}-${randomBytes(4).toString("hex")}`;
  await db()`
    insert into challenges (id, game, theme, difficulty, min_age, status, data)
    values (${id}, ${c.game}, ${c.theme}, ${c.difficulty}, ${c.minAge}, ${c.status}, ${JSON.stringify(c.data)}::jsonb)
    on conflict (id) do update set game = excluded.game, theme = excluded.theme, difficulty = excluded.difficulty,
      min_age = excluded.min_age, status = excluded.status, data = excluded.data, updated_at = now()`;
  return id;
}

export async function setChallengeStatus(id: string, status: PublishStatus) {
  await db()`update challenges set status = ${status}, updated_at = now() where id = ${id}`;
}

export const themeSchema = z.object({
  id: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{2,30}$/, "O identificador usa só letras minúsculas, números e hífen (2 a 30)."),
  label: z.string().trim().min(2, "O nome precisa de pelo menos 2 letras.").max(40, "Use até 40 letras."),
});

export async function createTheme(t: z.output<typeof themeSchema>) {
  const rows = await q<{ id: string }[]>(db()`insert into themes (id, label) values (${t.id}, ${t.label}) on conflict (id) do nothing returning id`);
  return rows.length > 0;
}

export async function updateTheme(id: string, patch: { label?: string; active?: boolean }) {
  if (patch.label !== undefined) await db()`update themes set label = ${patch.label}, updated_at = now() where id = ${id}`;
  if (patch.active !== undefined) await db()`update themes set active = ${patch.active}, updated_at = now() where id = ${id}`;
}

export async function updateGameSettings(game: GameId, enabled: boolean, defaultRounds: number) {
  await db()`
    insert into game_settings (game, enabled, default_rounds) values (${game}, ${enabled}, ${defaultRounds})
    on conflict (game) do update set enabled = excluded.enabled, default_rounds = excluded.default_rounds, updated_at = now()`;
}
