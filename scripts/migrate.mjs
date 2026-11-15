// Aplica as migrações de db/migrations em ordem, uma única vez cada.
// Uso: npm run db:migrate   (lê DATABASE_URL_UNPOOLED ou DATABASE_URL do .env)
import { Pool } from "@neondatabase/serverless";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error("Defina DATABASE_URL (ou DATABASE_URL_UNPOOLED) no .env");
  process.exit(1);
}

const dir = path.resolve("db/migrations");
const pool = new Pool({ connectionString: url });
const client = await pool.connect();
try {
  await client.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  const done = new Set((await client.query("select name from schema_migrations")).rows.map((r) => r.name));
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    if (done.has(f)) continue;
    const sqlText = await readFile(path.join(dir, f), "utf8");
    await client.query("begin");
    try {
      await client.query(sqlText);
      await client.query("insert into schema_migrations (name) values ($1)", [f]);
      await client.query("commit");
      console.log(`aplicada: ${f}`);
    } catch (e) {
      await client.query("rollback");
      throw e;
    }
  }
  console.log("migrações em dia");
} finally {
  client.release();
  await pool.end();
}
