"use client";

import { useEffect, useRef } from "react";
import { D_PATH, R_BOWL } from "./Monogram";

/**
 * Assinatura: o monograma DR vira "DeResenha".
 * Todas as letras usam o mesmo traço do monograma, então a transformação é tipográfica:
 * o R se desencaixa do D, o "e" nasce no espaço aberto e "esenha" sai de trás do R.
 * Usa Web Animations direto nos grupos SVG (transform/opacity apenas).
 */
const SPRING = "cubic-bezier(.34,1.56,.64,1)";
const OUT = "cubic-bezier(.22,1,.36,1)";

let playedThisSession = false;

export function Signature({ className = "", play = "once" }: { className?: string; play?: "once" | "always" | "never" }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || play === "never" || (play === "once" && playedThisSession)) return;
    playedThisSession = true;
    // Sem cleanup: no StrictMode o efeito roda duas vezes no mesmo nó e a animação deve seguir.
    playSignature(root);
  }, [play]);

  return <SignatureSVG ref={ref} className={className} />;
}

export function playSignature(root: SVGSVGElement): () => void {
  const q = (s: string) => root.querySelector(s) as SVGGElement;
  const letters = Array.from(root.querySelectorAll<SVGPathElement>(".sg-l"));
  const anims: Animation[] = [];
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    anims.push(root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250 }));
  } else {
    const o = (delay: number, duration: number, easing = OUT): KeyframeAnimationOptions => ({ delay, duration, easing, fill: "both" });
    anims.push(
      q(".sg-pop").animate([{ transform: "scale(.2)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], o(0, 420, SPRING)),
      q(".sg-leg").animate(
        [{ transform: "rotate(0deg)" }, { transform: "rotate(-40deg)", offset: 0.45 }, { transform: "rotate(8deg)", offset: 0.8 }, { transform: "rotate(0deg)" }],
        o(380, 420, "ease-out"),
      ),
      q(".sg-shift").animate([{ transform: "translateX(297px)" }, { transform: "translateX(0px)" }], o(700, 620)),
      q(".sg-r").animate([{ transform: "translateX(-114px)" }, { transform: "translateX(0px)" }], o(700, 620, SPRING)),
      q(".sg-e").animate([{ transform: "scale(0)" }, { transform: "scale(1)" }], o(820, 460, SPRING)),
      ...letters.map((l, i) => l.animate([{ transform: "translateX(-36px)", opacity: 0 }, { transform: "translateX(0px)", opacity: 1 }], o(1000 + i * 70, 420))),
    );
  }
  return () => anims.forEach((a) => a.finish());
}

export function SignatureSVG({ ref, className = "" }: { ref?: React.Ref<SVGSVGElement>; className?: string }) {
  return (
    <svg ref={ref} className={className} viewBox="-6 -6 720 112" role="img" aria-label="DeResenha">
      <g fill="none" stroke="currentColor" strokeWidth={18} strokeLinecap="round" strokeLinejoin="round">
        <g className="sg-shift">
          <g transform="translate(56 50)">
            <g className="sg-pop">
              <g transform="translate(-56 -50)">
                <path d={D_PATH} />
                <g transform="translate(119 64)">
                  <g className="sg-e">
                    <path d="M-27 0H27A27 27 0 1 0 17.4 20.7" />
                  </g>
                </g>
                <g className="sg-r">
                  <g transform="translate(176 0)">
                    <path d={R_BOWL} />
                    <g transform="translate(14 51)">
                      <g className="sg-leg">
                        <path d="M0 0L28 40" />
                      </g>
                    </g>
                  </g>
                </g>
                <path className="sg-l" d="M246 64H300A27 27 0 1 0 290.4 84.7" />
                <path className="sg-l" d="M376 45C368 36 330 34 332 52C334 66 378 60 378 76C378 94 340 96 330 84" />
                <path className="sg-l" d="M408 64H462A27 27 0 1 0 452.4 84.7" />
                <path className="sg-l" d="M492 91V37M492 62A23 23 0 0 1 538 62V91" />
                <path className="sg-l" d="M568 9V91M568 62A23 23 0 0 1 614 62V91" />
                <path className="sg-l" d="M698 37V91M698 64A27 27 0 1 0 644 64A27 27 0 1 0 698 64" />
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
