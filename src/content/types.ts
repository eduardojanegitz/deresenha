/**
 * Modelo de conteúdo. Espelha a tabela `challenges` (ver supabase/schema.sql):
 * cada desafio sabe a que jogo e tema pertence, sua dificuldade, faixa etária,
 * status de publicação e idioma. O motor só recebe desafios publicados.
 */

export type GameId = "nota" | "mimica" | "infiltrado" | "ranking" | "quem-sou-eu" | "voce-prefere" | "quiz" | "musica";
export type Difficulty = "facil" | "medio" | "dificil";
export type PublishStatus = "published" | "draft" | "archived";

export interface Theme {
  id: string;
  label: string;
}

interface BaseChallenge {
  id: string;
  game: GameId;
  theme: string;
  difficulty: Difficulty;
  /** Idade mínima recomendada, quando aplicável. */
  minAge?: number;
  status: PublishStatus;
  lang: "pt-BR";
}

/** Jogo da Nota. `kind` diz em qual modo o texto funciona. */
export interface NotaChallenge extends BaseChallenge {
  game: "nota";
  kind: "secreta" | "avaliacao";
  text: string;
}

export interface MimicaChallenge extends BaseChallenge {
  game: "mimica";
  text: string;
}

/** Infiltrado: a maioria recebe `major`, o infiltrado recebe `impostor`. */
export interface InfiltradoChallenge extends BaseChallenge {
  game: "infiltrado";
  major: string;
  impostor: string;
}

/** Ranking às Cegas: um título e um conjunto de itens (sorteamos 5). */
export interface RankingChallenge extends BaseChallenge {
  game: "ranking";
  title: string;
  items: string[];
}

export type Challenge = NotaChallenge | MimicaChallenge | InfiltradoChallenge | RankingChallenge;
