"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { D_PATH } from "./Monogram";

/**
 * Assinatura: o monograma DR se abre e vira "DeResenha".
 *
 * Desenho: o mesmo traço redondo do monograma, mais gordo (22) e com minúsculas altas,
 * para a palavra ter peso de letreiro. Três cores fechadas com papéis fixos: o D é
 * verde-feltro e tem rosto (é o personagem da marca), o R é framboesa e o resto da palavra
 * é verde-noite. Cada letra tem a base sólida mais escura, como as peças.
 *
 * Abertura: o DR aparece encaixado no centro, o R se desencaixa do D, o "e" nasce no vão
 * e "esenha" sai de trás do R. Depois o D espia a palavra. Tudo em transform, com molas;
 * com "reduzir movimento", a assinatura aparece pronta.
 */

const STROKE = 22;
/** Quanto a base escura desce, como a sombra sólida das peças. */
const DEPTH = 7;

const FELTRO = ["var(--color-feltro)", "var(--color-feltro-d)"] as const;
const FRAMBOESA = ["var(--color-chiclete-d)", "#a8304f"] as const;
const NOITE = ["var(--color-noite)", "var(--color-noite-3)"] as const;

/** Minúsculas: linha de base 91, bojo de raio 30 centrado em 61. */
const e = (c: number) => `M${c - 30} 61H${c + 30}A30 30 0 1 0 ${c + 19.3} 84`;
const n = (x: number) => `M${x} 91V31M${x} 61A24 24 0 0 1 ${x + 48} 61V91`;
const h = (x: number) => `M${x} 91V9M${x} 61A24 24 0 0 1 ${x + 48} 61V91`;
const a = (c: number) => `M${c + 30} 31V91M${c + 30} 61A30 30 0 1 0 ${c - 30} 61A30 30 0 1 0 ${c + 30} 61`;
const s = (x: number) => {
  const p = (px: number, py: number) => `${(x + px).toFixed(1)} ${py}`;
  return `M${p(50, 41)}C${p(41, 31)} ${p(0, 29)} ${p(2, 48)}C${p(4, 63)} ${p(52, 57)} ${p(52, 74)}C${p(52, 93)} ${p(11, 95)} ${p(0, 82)}`;
};

/** Posição do R na palavra aberta e no monograma (haste do R = trecho reto do D). */
const R_X = 190;
const R_IN_MONOGRAM = 62;
const R_PATH = `M${R_X} 91V9H${R_X + 18}A21 21 0 0 1 ${R_X + 18} 51H${R_X}`;
const R_LEG = `M${R_X + 14} 51L${R_X + 42} 91`;

/** "esenha": o que sai de trás do R. Centro de cada letra para a animação. */
const TAIL: { key: string; d: string; center: number }[] = [
  { key: "e2", d: e(296), center: 296 },
  { key: "s", d: s(360), center: 386 },
  { key: "e3", d: e(476), center: 476 },
  { key: "n", d: n(540), center: 564 },
  { key: "h", d: h(622), center: 646 },
  { key: "a", d: a(734), center: 734 },
];
const E1 = e(126);

/** Centro da palavra e do monograma, para começar com o DR no meio. */
const WORD_CENTER = 387;
const MONOGRAM_CENTER = 56;

let playedThisSession = false;

export function Signature({ className = "", play = "once" }: { className?: string; play?: "once" | "always" | "never" }) {
  const ref = useRef<SVGSVGElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const root = ref.current;
    if (!root || reduce || play === "never") return;
    const q = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;
    const word = q<SVGGElement>(".sg-word");
    const dr = q<SVGGElement>(".sg-dr");
    const r = q<SVGGElement>(".sg-r");
    const leg = q<SVGGElement>(".sg-leg");
    const e1 = q<SVGGElement>(".sg-e1");
    const eyes = q<SVGGElement>(".sg-eyes");
    const tail = Array.from(root.querySelectorAll<SVGGElement>(".sg-tail"));
    const all = Array.from(root.querySelectorAll<SVGGElement>(".sg-letter"));
    const intro = play === "always" || !playedThisSession;
    playedThisSession = true;
    const running: { stop: () => void }[] = [];
    const run = (x: { stop: () => void }) => running.push(x);
    let alive = true;
    const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

    const glance = () => run(animate(eyes, { x: [0, 5, 5, -1, 0], y: [0, -1, -1, 0, 0] }, { duration: 1.7, times: [0, 0.15, 0.7, 0.85, 1], ease: "easeInOut" }));
    const wave = () => all.forEach((el, i) => run(animate(el, { y: [0, -7, 0], scaleY: [1, 1.04, 1] }, { duration: 0.6, delay: i * 0.045, ease: "easeInOut" })));

    const open = async () => {
      const spring = (stiffness: number, damping: number, delay = 0) => ({ type: "spring" as const, stiffness, damping, delay });
      // Estado inicial: DR encaixado no centro, o resto escondido.
      word.style.transform = `translateX(${WORD_CENTER - MONOGRAM_CENTER}px)`;
      r.style.transform = `translateX(${R_IN_MONOGRAM - R_X}px)`;
      e1.style.transform = "scale(0)";
      tail.forEach((el) => (el.style.opacity = "0"));
      dr.style.opacity = "0";

      // 1. O DR aparece com uma mola.
      run(animate(dr, { scale: [0.4, 1], opacity: [0, 1] }, { scale: spring(420, 17), opacity: { duration: 0.18 } }));
      await wait(380);
      if (!alive) return;
      // 2. A perna do R dá um chute: é ela que destrava o encaixe.
      run(animate(leg, { rotate: [0, -34, 6, 0] }, { duration: 0.5, times: [0, 0.4, 0.75, 1], ease: "easeOut" }));
      await wait(320);
      if (!alive) return;
      // 3. A palavra vai para o lugar e o R se desencaixa do D.
      run(animate(word, { x: [WORD_CENTER - MONOGRAM_CENTER, 0] }, spring(140, 21)));
      run(animate(r, { x: [R_IN_MONOGRAM - R_X, 0] }, spring(180, 16)));
      // 4. O "e" nasce no vão entre D e R.
      run(animate(e1, { scale: [0, 1] }, spring(320, 14, 0.12)));
      // 5. "esenha" sai de trás do R, uma letra puxando a outra.
      // Partem de trás do DR encaixado (o D, o "e" e o R são desenhados por cima).
      tail.forEach((el, i) => {
        const from = R_IN_MONOGRAM + 30 - Number(el.dataset.center);
        const delay = 0.12 + i * 0.05;
        run(animate(el, { x: [from, 0], opacity: [0, 1] }, { x: spring(150, 19, delay), opacity: { duration: 0.25, delay } }));
      });
      await wait(1300);
      if (!alive) return;
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
    else loop();

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
      for (const el of [word, dr, r, e1, ...tail]) {
        el.style.transform = "";
        el.style.opacity = "";
      }
    };
  }, [play, reduce]);

  return <SignatureSVG ref={ref} className={className} />;
}

const box = { transformBox: "fill-box", transformOrigin: "50% 100%" } as const;

/** Letra com base escura: o mesmo traço desenhado duas vezes, a base um pouco abaixo. */
function Stroke({ d, colors }: { d: string; colors: readonly [string, string] }) {
  return (
    <>
      <path d={d} stroke={colors[1]} transform={`translate(0 ${DEPTH})`} />
      <path d={d} stroke={colors[0]} />
    </>
  );
}

export function SignatureSVG({ ref, className = "" }: { ref?: React.Ref<SVGSVGElement>; className?: string }) {
  return (
    <svg ref={ref} className={`overflow-visible ${className}`} viewBox={`-16 -16 808 ${130 + DEPTH}`} role="img" aria-label="DeResenha">
      <g className="sg-word" fill="none" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round">
        {/* Desenhadas primeiro: ficam atrás do R e saem de trás dele. */}
        {TAIL.map((t) => (
          <g key={t.key} className="sg-tail" data-center={t.center}>
            <g className="sg-letter" style={box}>
              <Stroke d={t.d} colors={NOITE} />
            </g>
          </g>
        ))}
        <g className="sg-dr" style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}>
          <g className="sg-e1" style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}>
            <g className="sg-letter" style={box}>
              <Stroke d={E1} colors={NOITE} />
            </g>
          </g>
          {/* O D é a cabeça: letra e rosto se movem juntos. */}
          <g className="sg-letter" style={box}>
            <Stroke d={D_PATH} colors={FELTRO} />
            <g className="sg-eyes piece alive" style={{ ["--bd" as string]: "2.4s" }}>
              <rect className="eye" x={25} y={37} width={8} height={18} rx={4} fill="var(--color-tinta)" stroke="none" />
              <rect className="eye" x={39} y={37} width={8} height={18} rx={4} fill="var(--color-tinta)" stroke="none" />
            </g>
          </g>
          <g className="sg-r">
            <g className="sg-letter" style={box}>
              <Stroke d={R_PATH} colors={FRAMBOESA} />
              <g className="sg-leg" style={{ transformBox: "view-box", transformOrigin: `${R_X + 14}px 51px` }}>
                <Stroke d={R_LEG} colors={FRAMBOESA} />
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
