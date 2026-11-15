import type { Challenge, Theme } from "@/content/types";

/**
 * Temas personalizados: conjuntos de desafios criados pela turma ("Nossa turma da faculdade",
 * "Viagem de fim de ano"…). Ficam no aparelho e entram nas partidas como qualquer tema.
 * O formato já é o mesmo da tabela `challenges` (origin = "comunidade") para permitir,
 * no futuro, compartilhar, moderar e publicar.
 */
export type CustomGame = "nota-secreta" | "nota-avaliacao" | "mimica" | "infiltrado" | "ranking" | "prefere" | "quem";

export interface CustomSet {
  id: string;
  name: string;
  game: CustomGame;
  /** Uma linha por desafio. Infiltrado: "maioria / infiltrado". Prefere: "opção A / opção B". Ranking: itens. */
  lines: string[];
  updatedAt: number;
}

export const CUSTOM_GAME_LABEL: Record<CustomGame, string> = {
  "nota-secreta": "Jogo da Nota: Nota Secreta",
  "nota-avaliacao": "Jogo da Nota: Avaliação",
  mimica: "Mímica",
  infiltrado: "Infiltrado",
  ranking: "Ranking às Cegas",
  prefere: "Você Prefere?",
  quem: "Quem Sou Eu?",
};

export const CUSTOM_HELP: Record<CustomGame, { placeholder: string; hint: string; min: number }> = {
  "nota-secreta": { placeholder: "Apelidos para o professor de cálculo\nLugares para o próximo rolê", hint: "Uma categoria por linha. Quem pensa vai dar um exemplo que vale a nota sorteada.", min: 1 },
  "nota-avaliacao": { placeholder: "O churrasco do Beto em 2025\nChegar atrasado na aula das 7h", hint: "Uma situação por linha. A turma dá nota de 0 a 10.", min: 1 },
  mimica: { placeholder: "O Caio dançando no casamento\nPerder o ônibus da excursão", hint: "Uma palavra ou situação por linha.", min: 1 },
  infiltrado: { placeholder: "Praia / Piscina\nBar do Zé / Boteco da esquina", hint: "Duas palavras parecidas por linha, separadas por barra: a da maioria e a do infiltrado.", min: 1 },
  ranking: { placeholder: "Pastel da cantina\nMarmita da Duda\nCoxinha do posto\nPão de queijo da padaria\nSalgado da festa", hint: "O nome do tema vira o título do ranking. Um item por linha, de 5 a 20.", min: 5 },
  prefere: { placeholder: "Pagar a conta de todo mundo / Lavar a louça de todo mundo", hint: "Duas opções por linha, separadas por barra.", min: 1 },
  quem: { placeholder: "Tia Cida\nO cachorro do Beto\nO professor de física", hint: "Uma identidade por linha: gente da turma, personagens, o que vocês quiserem.", min: 3 },
};

const clean = (lines: string[]) => lines.map((l) => l.trim().replace(/\s+/g, " ")).filter(Boolean);
const pair = (l: string) => {
  const [a, b, ...rest] = l.split("/").map((x) => x.trim());
  return a && b && rest.length === 0 && a.toLowerCase() !== b.toLowerCase() ? ([a, b] as const) : null;
};

/** Confere o conjunto e devolve uma mensagem de erro amigável, ou null se estiver bom. */
export function validateSet(s: Pick<CustomSet, "name" | "game" | "lines">): string | null {
  const name = s.name.trim();
  if (name.length < 2 || name.length > 40) return "O nome precisa ter de 2 a 40 letras.";
  const lines = clean(s.lines);
  const help = CUSTOM_HELP[s.game];
  if (lines.length < help.min) return help.min > 1 ? `Escreva pelo menos ${help.min} linhas.` : "Escreva pelo menos uma linha.";
  if (lines.length > 200) return "Use até 200 linhas por tema.";
  if (lines.some((l) => l.length > 140)) return "Cada linha pode ter até 140 caracteres.";
  if (s.game === "infiltrado" || s.game === "prefere") {
    const bad = lines.findIndex((l) => !pair(l));
    if (bad >= 0) return `A linha ${bad + 1} precisa de duas opções diferentes separadas por barra, como “Praia / Piscina”.`;
  }
  if (s.game === "ranking") {
    if (lines.length > 20) return "O ranking aceita até 20 itens.";
    if (new Set(lines.map((l) => l.toLowerCase())).size !== lines.length) return "Há itens repetidos.";
  }
  return null;
}

export const customThemeId = (s: Pick<CustomSet, "id">) => `meu-${s.id}`;
export const customTheme = (s: CustomSet): Theme => ({ id: customThemeId(s), label: s.name.trim() });

const base = (s: CustomSet, i: number) => ({ id: `${customThemeId(s)}-${i}`, theme: customThemeId(s), difficulty: "medio" as const, status: "published" as const, lang: "pt-BR" as const });

/** Converte um conjunto em desafios no mesmo formato do conteúdo oficial. */
export function toChallenges(s: CustomSet): Challenge[] {
  const lines = clean(s.lines);
  switch (s.game) {
    case "nota-secreta":
    case "nota-avaliacao":
      return lines.map((text, i) => ({ ...base(s, i), game: "nota", kind: s.game === "nota-secreta" ? "secreta" : "avaliacao", text }));
    case "mimica":
      return lines.map((text, i) => ({ ...base(s, i), game: "mimica", text }));
    case "infiltrado":
      return lines.flatMap((l, i) => {
        const p = pair(l);
        return p ? [{ ...base(s, i), game: "infiltrado" as const, major: p[0], impostor: p[1] }] : [];
      });
    case "ranking":
      return [{ ...base(s, 0), game: "ranking", title: s.name.trim(), items: lines }];
    case "prefere":
      return lines.flatMap((l, i) => {
        const p = pair(l);
        return p ? [{ ...base(s, i), game: "voce-prefere" as const, a: p[0], b: p[1] }] : [];
      });
    case "quem":
      return lines.map((name, i) => ({ ...base(s, i), game: "quem-sou-eu" as const, name }));
  }
}

/** Jogo do conteúdo a que um conjunto pertence. */
export const contentGameOf = (g: CustomGame): Challenge["game"] => (g.startsWith("nota") ? "nota" : g === "prefere" ? "voce-prefere" : g === "quem" ? "quem-sou-eu" : (g as Challenge["game"]));

/* ---------- armazenamento no navegador ---------- */

export const CUSTOM_KEY = "deresenha:temas";

export function loadSets(): CustomSet[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? "[]");
    return Array.isArray(v) ? (v.filter((s) => s && typeof s.id === "string" && Array.isArray(s.lines) && s.game in CUSTOM_GAME_LABEL) as CustomSet[]) : [];
  } catch {
    return [];
  }
}

export function saveSets(list: CustomSet[]) {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event("deresenha:temas"));
  } catch {}
}
