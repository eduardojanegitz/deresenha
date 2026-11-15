"use client";

import { animate, useReducedMotion } from "motion/react";
import { useLayoutEffect, useRef } from "react";
import WORD from "./wordmark-glyphs.json";

/**
 * Assinatura "letreiro de boteco": o monograma DR se abre e vira "DeResenha".
 *
 * Desenho: letras gordas e arredondadas (contornos da Titan One, licença SIL OFL 1.1,
 * convertidos em caminhos em src/brand/wordmark-glyphs.json, sem carregar fonte), recheio creme, contorno verde-noite grosso e sombra em bloco
 * verde-feltro, como placa pintada à mão. O D é um bloco amarelo com rosto: o personagem da
 * marca, parente das peças. Escala: maiúscula com 100 de altura, linha de base em y = 100.
 *
 * Camadas: todas as sombras ficam atrás de todos os recheios, como numa placa pintada. Cada
 * letra existe nas duas camadas e as duas cópias se movem juntas.
 *
 * Abertura: o DR aparece encaixado no centro, o R se desencaixa do D, o "e" nasce no vão e
 * "esenha" sai de trás do DR. Molas em transform; com "reduzir movimento", aparece pronta.
 */

const COLORS = { face: "#fff3d6", d: "var(--color-gema)", line: "var(--color-noite)", shadow: "var(--color-feltro)", eye: "var(--color-noite)" };
/** Contorno (metade fica para fora) e profundidade da sombra em bloco, em unidades da letra. */
const LINE = 9;
const DEPTH = 9;
/** Olhos no corpo do D: centro, distância, tamanho. */
const EYES = { cx: 52, cy: 47, gap: 19, w: 8.5, h: 21 };
/** Quanto do R fica por baixo do D no monograma encaixado. */
const OVERLAP = 26;

type Letter = { ch: string; x: number; d: string; adv: number; bbox: [number, number, number, number] };
const LETTERS = WORD.letters as unknown as Letter[];
const [D, E1, R] = LETTERS as [Letter, Letter, Letter];
const TAIL = LETTERS.slice(3);

// Geometria do encaixe: o R começa com a haste por baixo da borda direita do D.
const R_SHIFT = D.x + D.bbox[2] - OVERLAP - (R.x + R.bbox[0]);
const MONO_LEFT = D.x + D.bbox[0];
const MONO_RIGHT = R.x + R.bbox[2] + R_SHIFT;
const CENTER_SHIFT = WORD.width / 2 - (MONO_LEFT + MONO_RIGHT) / 2;
const MONO_CENTER = { x: (MONO_LEFT + MONO_RIGHT) / 2, y: 50 };

let playedThisSession = false;

export function Signature({ className = "", play = "once" }: { className?: string; play?: "once" | "always" | "never" }) {
  const ref = useRef<SVGSVGElement>(null);
  const reduce = useReducedMotion();

  // Antes da primeira pintura: a palavra já começa escondida, sem piscar inteira.
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || reduce || play === "never") return;
    const both = (sel: string) => Array.from(root.querySelectorAll<SVGGElement>(sel));
    const word = both(".wm-word");
    const pop = both(".wm-pop");
    const r = both(".wm-l-2");
    const e1 = both(".wm-l-1");
    const eyes = root.querySelector<SVGGElement>(".wm-eyes")!;
    const tail = TAIL.map((_, i) => both(`.wm-l-${i + 3}`));
    const letters = LETTERS.map((_, i) => both(`.wm-l-${i}`));
    // Só conta como tocada quando a abertura termina (no modo de desenvolvimento o React
    // monta o efeito duas vezes e a primeira é desfeita na hora).
    const intro = play === "always" || !playedThisSession;
    const running: { stop: () => void }[] = [];
    const run = (x: { stop: () => void }) => running.push(x);
    let alive = true;
    const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));
    const spring = (stiffness: number, damping: number, delay = 0) => ({ type: "spring" as const, stiffness, damping, delay });

    const glance = () => run(animate(eyes, { x: [0, 6, 6, -1, 0], y: [0, -1, -1, 0, 0] }, { duration: 1.7, times: [0, 0.15, 0.7, 0.85, 1], ease: "easeInOut" }));
    const wave = () => letters.forEach((els, i) => run(animate(els, { y: [0, -7, 0] }, { duration: 0.55, delay: i * 0.04, ease: "easeInOut" })));

    const open = async () => {
      const set = (els: SVGGElement[], prop: "transform" | "opacity", v: string) => els.forEach((el) => (el.style[prop] = v));
      set(word, "transform", `translateX(${CENTER_SHIFT}px)`);
      set(r, "transform", `translateX(${R_SHIFT}px)`);
      set(e1, "transform", "scale(0)");
      tail.forEach((els) => set(els, "opacity", "0"));
      set(pop, "opacity", "0");

      // 1. O DR encaixado aparece com uma mola.
      run(animate(pop, { scale: [0.5, 1], opacity: [0, 1] }, { scale: spring(380, 18), opacity: { duration: 0.2 } }));
      await wait(650);
      if (!alive) return;
      // 2. A palavra vai para o lugar e o R se desencaixa do D.
      run(animate(word, { x: [CENTER_SHIFT, 0] }, spring(130, 21)));
      run(animate(r, { x: [R_SHIFT, 0] }, spring(170, 17)));
      // 3. O "e" nasce no vão entre D e R.
      run(animate(e1, { scale: [0, 1] }, spring(300, 16, 0.1)));
      // 4. "esenha" sai de trás do DR, uma letra puxando a outra.
      tail.forEach((els, i) => {
        const l = TAIL[i]!;
        const from = MONO_RIGHT - 40 - (l.x + (l.bbox[0] + l.bbox[2]) / 2);
        const delay = 0.12 + i * 0.05;
        run(animate(els, { x: [from, 0], opacity: [0, 1] }, { x: spring(150, 20, delay), opacity: { duration: 0.25, delay } }));
      });
      await wait(1300);
      if (!alive) return;
      playedThisSession = true;
      glance();
    };

    let timer = 0;
    const loop = () => {
      timer = window.setTimeout(() => {
        if (!alive) return;
        if (document.visibilityState === "visible") {
          glance();
          window.setTimeout(() => alive && wave(), 500);
        }
        loop();
      }, 9000);
    };

    if (intro) open().then(() => alive && loop());
    else {
      playedThisSession = true;
      loop();
    }

    const onTap = () => {
      glance();
      wave();
    };
    root.addEventListener("pointerdown", onTap);
    return () => {
      alive = false;
      window.clearTimeout(timer);
      root.removeEventListener("pointerdown", onTap);
      running.forEach((x) => x.stop());
      for (const el of [...word, ...pop, ...r, ...e1, ...tail.flat()]) {
        el.style.transform = "";
        el.style.opacity = "";
      }
    };
  }, [play, reduce]);

  return <SignatureSVG ref={ref} className={className} />;
}

const middle = { transformBox: "fill-box", transformOrigin: "50% 50%" } as const;
const popOrigin = { transformBox: "view-box", transformOrigin: `${MONO_CENTER.x}px ${MONO_CENTER.y}px` } as const;

/** Uma camada da placa: as sombras ("shadow") ou os recheios com contorno ("face"). */
function Layer({ kind }: { kind: "shadow" | "face" }) {
  const paint = (l: Letter, i: number) => {
    if (kind === "shadow") {
      // Sombra em bloco: cópias empilhadas na diagonal, já com a espessura do contorno.
      return Array.from({ length: DEPTH }, (_, k) => (
        <path key={k} d={l.d} transform={`translate(${l.x + (k + 1) * 0.8} ${k + 1})`} fill={COLORS.shadow} stroke={COLORS.shadow} strokeWidth={LINE * 2} />
      ));
    }
    return <path d={l.d} transform={`translate(${l.x} 0)`} fill={i === 0 ? COLORS.d : COLORS.face} stroke={COLORS.line} strokeWidth={LINE * 2} paintOrder="stroke" />;
  };
  const letter = (i: number, extra?: React.ReactNode) => (
    <g className={`wm-l-${i}`} style={i === 1 ? middle : undefined}>
      {paint(LETTERS[i]!, i)}
      {extra}
    </g>
  );
  const eyes = kind === "face" && (
    <g className="wm-eyes piece alive" style={{ ["--bd" as string]: "2.4s" }}>
      {[-1, 1].map((s) => (
        <rect key={s} className="eye" x={D.x + EYES.cx + (s * EYES.gap) / 2 - EYES.w / 2} y={EYES.cy - EYES.h / 2} width={EYES.w} height={EYES.h} rx={EYES.w / 2} fill={COLORS.eye} />
      ))}
    </g>
  );
  return (
    <g className="wm-word" strokeLinejoin="round">
      {/* "esenha" por baixo do DR: sai de trás dele. */}
      {TAIL.map((_, i) => (
        <g key={i}>{letter(i + 3)}</g>
      ))}
      <g className="wm-pop" style={popOrigin}>
        {letter(1)}
        {letter(2)}
        {letter(0, eyes)}
      </g>
    </g>
  );
}

export function SignatureSVG({ ref, className = "" }: { ref?: React.Ref<SVGSVGElement>; className?: string }) {
  const pad = LINE + 4;
  return (
    <svg ref={ref} className={`overflow-visible ${className}`} viewBox={`${-pad} ${-10 - pad} ${WORD.width + pad * 2 + DEPTH} ${112 + pad * 2 + DEPTH}`} role="img" aria-label="DeResenha">
      <Layer kind="shadow" />
      <Layer kind="face" />
    </svg>
  );
}
