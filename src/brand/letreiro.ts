import WORD from "./wordmark-glyphs.json";

/**
 * Geometria e cores do letreiro, compartilhadas pela assinatura e pelo monograma.
 *
 * Letras: contornos da Titan One (licença SIL OFL 1.1) convertidos em caminhos em
 * wordmark-glyphs.json. Escala: maiúscula com 100 de altura, linha de base em y = 100.
 * O D é só a silhueta (sem miolo): um bloco com rosto, parente das peças.
 */

export type Letter = { ch: string; x: number; d: string; adv: number; bbox: [number, number, number, number] };

export const LETTERS = WORD.letters as unknown as Letter[];
export const WORD_WIDTH = WORD.width;
export const [D, E1, R] = LETTERS as [Letter, Letter, Letter];
export const TAIL = LETTERS.slice(3);

export const COLORS = { face: "#fff3d6", d: "#ffc23d", line: "#0b3b2e", shadow: "#0f6b52", eye: "#0b3b2e" };
/** Contorno (metade fica para fora) e profundidade da sombra em bloco, em unidades da letra. */
export const LINE = 9;
export const DEPTH = 9;
/** Passo da sombra em bloco: desce 1 e anda 0,8 para a direita a cada camada. */
export const DEPTH_SLANT = 0.8;
/** Olhos no corpo do D: centro, distância, tamanho. */
export const EYES = { cx: 52, cy: 47, gap: 19, w: 8.5, h: 21 };
/** Quanto do R fica por baixo do D no monograma encaixado. */
export const OVERLAP = 12;

/** Deslocamento do R para encaixar no D (monograma) a partir da posição na palavra. */
export const R_SHIFT = D.x + D.bbox[2] - OVERLAP - (R.x + R.bbox[0]);
export const MONO_LEFT = D.x + D.bbox[0];
export const MONO_RIGHT = R.x + R.bbox[2] + R_SHIFT;
