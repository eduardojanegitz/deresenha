"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { D_PATH } from "./Monogram";

/**
 * Assinatura viva: "DeResenha" com o mesmo traço do monograma. A cor fica no par do
 * monograma (D verde-feltro, R chiclete); o resto da palavra é tinta, com uma base clara
 * no lugar da sombra. O D tem olhos (é o rosto da marca): pisca e espia o R.
 *
 * Movimento: as letras descem em sequência e assentam com uma mola curta.
 * Depois, de tempos em tempos, uma onda passa pelas letras. Tocar na assinatura repete a onda.
 * Tudo em transform; com "reduzir movimento", a assinatura aparece parada.
 */

type Glyph = { d: string; c: string; s: string; key: string };

const C = {
  feltro: ["var(--color-feltro)", "var(--color-feltro-d)"],
  chiclete: ["var(--color-chiclete)", "var(--color-chiclete-d)"],
  tinta: ["var(--color-tinta)", "#c3cfc4"],
} as const;
const g = (key: string, d: string, [c, s]: readonly [string, string]): Glyph => ({ key, d, c, s });

/** Letras depois do D, já na posição final (mesma geometria da assinatura original). */
const GLYPHS: Glyph[] = [
  g("e1", "M92 64H146A27 27 0 1 0 136.4 84.7", C.tinta),
  g("R", `M176 91V9H194A21 21 0 0 1 194 51H176M190 51L218 91`, C.chiclete),
  g("e2", "M246 64H300A27 27 0 1 0 290.4 84.7", C.tinta),
  g("s", "M376 45C368 36 330 34 332 52C334 66 378 60 378 76C378 94 340 96 330 84", C.tinta),
  g("e3", "M408 64H462A27 27 0 1 0 452.4 84.7", C.tinta),
  g("n", "M492 91V37M492 62A23 23 0 0 1 538 62V91", C.tinta),
  g("h", "M568 9V91M568 62A23 23 0 0 1 614 62V91", C.tinta),
  g("a", "M698 37V91M698 64A27 27 0 1 0 644 64A27 27 0 1 0 698 64", C.tinta),
];

/** Quanto a base desce, como a sombra sólida das peças. */
const DEPTH = 6;

let playedThisSession = false;

export function Signature({ className = "", play = "once" }: { className?: string; play?: "once" | "always" | "never" }) {
  const ref = useRef<SVGSVGElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const root = ref.current;
    if (!root || reduce) return;
    const letters = Array.from(root.querySelectorAll<SVGGElement>(".sg-letter"));
    const eyes = root.querySelector<SVGGElement>(".sg-eyes");
    const intro = play === "always" || (play === "once" && !playedThisSession);
    playedThisSession = true;
    const running: { stop: () => void }[] = [];
    let alive = true;

    const drop = () =>
      Promise.all(
        letters.map((el, i) => {
          const a = animate(
            el,
            { y: [-44, 0, -4, 0], scaleY: [1.06, 0.95, 1.01, 1], scaleX: [0.97, 1.03, 1, 1], opacity: [0, 1, 1, 1] },
            { duration: 0.8, delay: i * 0.055, times: [0, 0.5, 0.75, 1], ease: ["easeIn", "easeOut", "easeInOut"] },
          );
          running.push(a);
          return a;
        }),
      );

    const wave = () =>
      letters.forEach((el, i) => {
        running.push(
          animate(el, { y: [0, -6, 0], scaleY: [1, 1.03, 1] }, { duration: 0.6, delay: i * 0.045, ease: "easeInOut" }),
        );
      });

    /** Os olhos do D espiam o resto da palavra e voltam. */
    const glance = () => {
      if (!eyes) return;
      running.push(animate(eyes, { x: [0, 4, 4, -2, 0], y: [0, -1, -1, 0, 0] }, { duration: 1.6, times: [0, 0.15, 0.7, 0.85, 1], ease: "easeInOut" }));
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

    if (intro) {
      for (const el of letters) el.style.opacity = "0";
      drop().then(() => {
        if (!alive) return;
        glance();
        loop();
      });
    } else loop();

    const onTap = () => {
      glance();
      wave();
    };
    root.addEventListener("pointerdown", onTap);
    return () => {
      alive = false;
      window.clearTimeout(timer);
      root.removeEventListener("pointerdown", onTap);
      running.forEach((a) => a.stop());
      for (const el of letters) el.style.opacity = "";
    };
  }, [play, reduce]);

  return <SignatureSVG ref={ref} className={className} />;
}

export function SignatureSVG({ ref, className = "" }: { ref?: React.Ref<SVGSVGElement>; className?: string }) {
  const letter = (key: string, d: string, c: string, s: string) => (
    <g key={key} className="sg-letter" style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}>
      <path d={d} stroke={s} transform={`translate(0 ${DEPTH})`} />
      <path d={d} stroke={c} />
    </g>
  );
  return (
    <svg ref={ref} className={`overflow-visible ${className}`} viewBox={`-10 -10 728 ${120 + DEPTH}`} role="img" aria-label="DeResenha">
      <g fill="none" strokeWidth={18} strokeLinecap="round" strokeLinejoin="round">
        {/* O D é a cabeça: letra e rosto se movem juntos. */}
        <g className="sg-letter" style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}>
          <path d={D_PATH} stroke={C.feltro[1]} transform={`translate(0 ${DEPTH})`} />
          <path d={D_PATH} stroke={C.feltro[0]} />
          <g className="sg-eyes piece alive" style={{ ["--bd" as string]: "2.2s" }}>
            <rect className="eye" x={25} y={36} width={8} height={17} rx={4} fill="var(--color-tinta)" stroke="none" />
            <rect className="eye" x={39} y={36} width={8} height={17} rx={4} fill="var(--color-tinta)" stroke="none" />
          </g>
        </g>
        {GLYPHS.map((gl) => letter(gl.key, gl.d, gl.c, gl.s))}
      </g>
    </svg>
  );
}
