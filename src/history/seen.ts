/**
 * Perguntas que já saíram neste aparelho, por jogo, para a próxima partida não repetir.
 * Fica só no navegador; se o armazenamento falhar, o jogo segue sorteando normalmente.
 */
const key = (game: string) => `deresenha:vistas:${game}`;
export const SEEN_MAX = 1000;

export function loadSeen(game: string): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(key(game)) ?? "[]");
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Guarda a lista de usados da partida (que já começa com o que tinha sido visto antes). */
export function saveSeen(game: string, used: readonly string[]) {
  try {
    localStorage.setItem(key(game), JSON.stringify(used.slice(-SEEN_MAX)));
  } catch {}
}
