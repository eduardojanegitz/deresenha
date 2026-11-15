/**
 * Histórico de partidas, guardado só neste aparelho (sem conta, sem servidor).
 * Guarda o mínimo: jogo, data, apelidos e pontos. Dá para apagar tudo pela tela de histórico.
 */
export interface MatchRecord {
  id: string;
  game: string;
  at: number;
  players: { name: string; score: number }[];
  /** false para jogos sem placar (Avaliação sem pontos, Ranking, Você Prefere). */
  scored: boolean;
  /** Nome da Noite de Jogos, quando a partida fez parte de uma. */
  night?: string;
}

export const HISTORY_KEY = "deresenha:historico";
export const HISTORY_MAX = 100;

export function addRecord(list: MatchRecord[], r: MatchRecord): MatchRecord[] {
  if (list.some((x) => x.id === r.id)) return list; // a mesma partida nunca entra duas vezes
  return [r, ...list].slice(0, HISTORY_MAX);
}

export function winnersOf(r: MatchRecord): string[] {
  if (!r.scored || r.players.length === 0) return [];
  const top = Math.max(...r.players.map((p) => p.score));
  if (top <= 0) return [];
  return r.players.filter((p) => p.score === top).map((p) => p.name);
}

export interface HistoryStats {
  matches: number;
  favoriteGame: { game: string; count: number } | null;
  topWinner: { name: string; wins: number } | null;
  regulars: { name: string; matches: number }[];
  byGame: { game: string; count: number }[];
}

export function computeStats(list: MatchRecord[]): HistoryStats {
  const byGame = new Map<string, number>();
  const wins = new Map<string, number>();
  const plays = new Map<string, number>();
  // Apelidos comparados sem diferenciar maiúsculas.
  const display = new Map<string, string>();
  for (const r of list) {
    byGame.set(r.game, (byGame.get(r.game) ?? 0) + 1);
    for (const p of r.players) {
      const k = p.name.trim().toLowerCase();
      display.set(k, display.get(k) ?? p.name.trim());
      plays.set(k, (plays.get(k) ?? 0) + 1);
    }
    for (const w of winnersOf(r)) {
      const k = w.trim().toLowerCase();
      wins.set(k, (wins.get(k) ?? 0) + 1);
    }
  }
  const games = [...byGame.entries()].map(([game, count]) => ({ game, count })).sort((a, b) => b.count - a.count);
  const winner = [...wins.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    matches: list.length,
    favoriteGame: games[0] ?? null,
    topWinner: winner ? { name: display.get(winner[0])!, wins: winner[1] } : null,
    regulars: [...plays.entries()]
      .map(([k, matches]) => ({ name: display.get(k)!, matches }))
      .sort((a, b) => b.matches - a.matches)
      .slice(0, 5),
    byGame: games,
  };
}

/* ---------- armazenamento no navegador ---------- */

export function loadHistory(): MatchRecord[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
    return Array.isArray(v) ? (v.filter((r) => r && typeof r === "object" && typeof r.id === "string" && Array.isArray(r.players)) as MatchRecord[]) : [];
  } catch {
    return [];
  }
}

export function recordMatch(r: MatchRecord) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(addRecord(loadHistory(), r)));
  } catch {}
}

export function clearHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {}
}
