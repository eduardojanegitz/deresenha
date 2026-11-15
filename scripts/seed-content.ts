// Copia o conteúdo inicial (src/content/library.ts) para o banco.
// Não sobrescreve o que já foi editado no painel: só insere o que ainda não existe.
// Uso: npm run db:seed
import { Pool } from "@neondatabase/serverless";
import { CHALLENGES, THEMES } from "../src/content/library.ts";
import type { Challenge } from "../src/content/types.ts";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error("Defina DATABASE_URL no .env");
  process.exit(1);
}

function dataOf(c: Challenge) {
  switch (c.game) {
    case "nota":
      return { kind: c.kind, text: c.text };
    case "mimica":
      return { text: c.text };
    case "infiltrado":
      return { major: c.major, impostor: c.impostor };
    case "ranking":
      return { title: c.title, items: c.items };
    case "voce-prefere":
      return { a: c.a, b: c.b };
    case "quem-sou-eu":
      return { name: c.name };
    case "quiz":
      return { question: c.question, options: c.options, answer: c.answer };
  }
}

const pool = new Pool({ connectionString: url });
const client = await pool.connect();
try {
  await client.query("begin");
  for (const t of THEMES) await client.query("insert into themes (id, label) values ($1, $2) on conflict (id) do nothing", [t.id, t.label]);
  let added = 0;
  for (const c of CHALLENGES) {
    const r = await client.query(
      `insert into challenges (id, game, theme, difficulty, min_age, status, lang, data)
       values ($1, $2, $3, $4, $5, $6, $7, $8) on conflict (id) do nothing`,
      [c.id, c.game, c.theme, c.difficulty, c.minAge ?? null, c.status, c.lang, JSON.stringify(dataOf(c))],
    );
    added += r.rowCount ?? 0;
  }
  for (const g of ["nota", "mimica", "infiltrado", "ranking", "voce-prefere", "quem-sou-eu", "quiz"]) {
    const rounds = g === "nota" ? 4 : g === "voce-prefere" ? 6 : g === "quiz" ? 8 : g === "quem-sou-eu" ? 1 : 3;
    await client.query("insert into game_settings (game, default_rounds) values ($1, $2) on conflict (game) do nothing", [g, rounds]);
  }
  await client.query("commit");
  console.log(`temas: ${THEMES.length}, desafios novos: ${added} de ${CHALLENGES.length}`);
} catch (e) {
  await client.query("rollback");
  throw e;
} finally {
  client.release();
  await pool.end();
}
