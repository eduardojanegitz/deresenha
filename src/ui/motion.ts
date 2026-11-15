import type { Transition, Variants } from "motion/react";

/**
 * Biblioteca de movimento do DeResenha. Os nomes batem com docs/01-direcao.md.
 *  - deslize: navegação e troca de fase (suave, curta, sem passar do ponto)
 *  - encaixe: algo que chega ao lugar (mola com leve passada)
 *  - queda:  peças caindo no placar (mola mais solta, escalonada)
 */
export const EASE_SOFT = [0.22, 1, 0.36, 1] as const;

export const deslize: Transition = { duration: 0.32, ease: EASE_SOFT };
export const springy: Transition = { type: "spring", stiffness: 380, damping: 22 };
export const encaixe: Transition = { type: "spring", stiffness: 520, damping: 30 };
export const queda = (i: number): Transition => ({ type: "spring", stiffness: 420, damping: 15, delay: i * 0.18 });

export const phaseVariants = (reduce: boolean): Variants =>
  reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1, transition: { duration: 0.12 } }, exit: { opacity: 0, transition: { duration: 0.06 } } }
    : {
        // Troca de fase logo depois de um toque: a tela antiga sai rápido e a nova já chega
        // quase inteira, para o toque parecer instantâneo.
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE_SOFT } },
        exit: { opacity: 0, y: -6, transition: { duration: 0.08, ease: "easeIn" } },
      };

/** Entrada escalonada de uma lista (usar com variants filhos). */
export const stagger = (gap = 0.06): Variants => ({ animate: { transition: { staggerChildren: gap } } });
export const rise: Variants = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0, transition: deslize } };
