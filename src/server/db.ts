import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

/**
 * Único ponto de acesso ao Postgres. Trocar de provedor (Neon, Supabase, RDS…) é mudar
 * este arquivo e a DATABASE_URL; o resto do servidor só usa `db()`.
 */
let client: NeonQueryFunction<false, false> | null = null;

export function db() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL não configurada");
    client = neon(url);
  }
  return client;
}
