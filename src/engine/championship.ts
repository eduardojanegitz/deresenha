/**
 * Pontuação normalizada para a Noite de Jogos (etapa 5).
 * Cada jogo tem sua escala (Nota vai a centenas, Infiltrado a poucas unidades), então
 * convertemos o resultado de cada jogo para 0–100 relativo ao melhor da partida.
 * Assim nenhum jogo pesa mais no ranking geral só por ter números maiores.
 */
export function normalizeScores(scores: Readonly<Record<string, number>>): Record<string, number> {
  const values = Object.values(scores);
  const max = Math.max(0, ...values);
  const min = Math.min(0, ...values);
  const span = max - min;
  return Object.fromEntries(Object.entries(scores).map(([id, v]) => [id, span === 0 ? 0 : Math.round(((v - min) / span) * 100)]));
}

export function addChampionship(total: Readonly<Record<string, number>>, gameScores: Readonly<Record<string, number>>) {
  const n = normalizeScores(gameScores);
  const out = { ...total };
  Object.entries(n).forEach(([id, v]) => (out[id] = (out[id] ?? 0) + v));
  return out;
}
