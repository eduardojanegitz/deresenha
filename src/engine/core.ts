/**
 * Núcleo compartilhado pelos motores de jogo.
 *
 * Todo motor é uma função pura `reduce(state, action, rng)`. Isso permite rodar exatamente
 * a mesma regra no navegador (modo compartilhado) e no servidor (Modo Sala, etapa 4),
 * onde o servidor é a autoridade e o cliente só recebe a projeção que pode ver.
 */

export type Rng = () => number;

export type PieceKind = "bolota" | "tijolo" | "pino" | "meialua" | "capsula";
export const PIECE_KINDS: readonly PieceKind[] = ["bolota", "tijolo", "pino", "meialua", "capsula"];

export interface Player {
  id: string;
  name: string;
  piece: PieceKind;
}

/** Erro de regra: a ação não é permitida no estado atual. Mensagem pronta para a interface. */
export class RuleError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "RuleError";
  }
}

export function assertRule(cond: unknown, code: string, message: string): asserts cond {
  if (!cond) throw new RuleError(code, message);
}

/** PRNG determinístico (mulberry32) para testes e para sorteios reproduzíveis no servidor. */
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randInt = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1));

export function pick<T>(rng: Rng, items: readonly T[]): T {
  assertRule(items.length > 0, "empty", "Não há itens para sortear.");
  return items[Math.floor(rng() * items.length)] as T;
}

export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

/**
 * Sorteia um item ainda não usado na sessão. Quando tudo já saiu, recomeça o baralho
 * (evitando repetir o último item). Retorna o item e a nova lista de usados.
 */
export function drawFresh<T extends { id: string }>(
  rng: Rng,
  pool: readonly T[],
  used: readonly string[],
  avoidId?: string,
): { item: T; used: string[] } {
  assertRule(pool.length > 0, "no-content", "Nenhum conteúdo disponível para os temas escolhidos.");
  const usedSet = new Set(used);
  let fresh = pool.filter((p) => !usedSet.has(p.id) && p.id !== avoidId);
  let nextUsed = [...used];
  if (fresh.length === 0) {
    nextUsed = [];
    fresh = pool.filter((p) => p.id !== avoidId);
    if (fresh.length === 0) fresh = [...pool];
  }
  const item = pick(rng, fresh);
  nextUsed.push(item.id);
  return { item, used: nextUsed };
}

/**
 * Perguntas já vistas em partidas anteriores que ainda estão neste baralho. Se sobrar pouca
 * coisa inédita (menos que `need`), recomeça do zero para não repetir dentro da mesma partida.
 */
export function carryUsed<T extends { id: string }>(pool: readonly T[], seen: readonly string[], need: number): string[] {
  const ids = new Set(pool.map((p) => p.id));
  const carried = [...new Set(seen)].filter((id) => ids.has(id));
  return ids.size - carried.length >= need ? carried : [];
}

export function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? (s[mid] as number) : ((s[mid - 1] as number) + (s[mid] as number)) / 2;
}

/** Ordena jogadores por pontos (desc), mantendo a ordem original em empates. */
export function standings(players: readonly Player[], scores: Readonly<Record<string, number>>) {
  return players
    .map((p, i) => ({ player: p, score: scores[p.id] ?? 0, i }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map(({ player, score }, idx, arr) => ({
      player,
      score,
      // posição com empate: quem tem a mesma pontuação divide a posição
      position: arr.findIndex((x) => x.score === score) + 1,
    }));
}

export const zeroScores = (ids: readonly string[]) => Object.fromEntries(ids.map((id) => [id, 0])) as Record<string, number>;
