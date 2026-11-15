import { COLORS, D, DEPTH, DEPTH_SLANT, EYES, LINE, MONO_LEFT, MONO_RIGHT, R, R_SHIFT, type Letter } from "./letreiro";

/**
 * Monograma: o DR encaixado do letreiro (o mesmo estado em que a assinatura começa).
 * O D amarelo com rosto fica por cima do R creme; contorno verde-noite e sombra em bloco.
 *
 * `shadow` troca a cor da sombra quando o fundo já é verde-feltro (senão ela some).
 * `tone="flat"` desenha numa cor só (currentColor), para lugares discretos como o verso
 * das cartas; o rosto continua lá.
 */

const PAD = LINE + 2;
const X0 = MONO_LEFT - PAD;
const Y0 = Math.min(D.bbox[1], R.bbox[1]) - PAD;
const W = MONO_RIGHT - MONO_LEFT + PAD * 2 + DEPTH * DEPTH_SLANT;
const H = 100 - Math.min(D.bbox[1], R.bbox[1]) + PAD * 2 + DEPTH;
export const MONOGRAM_VIEWBOX = `${X0.toFixed(1)} ${Y0.toFixed(1)} ${W.toFixed(1)} ${H.toFixed(1)}`;

const at = (l: Letter, dx = 0, dy = 0) => `translate(${(l.x + dx).toFixed(2)} ${dy})`;

export function Monogram({ className = "", label, shadow = COLORS.shadow, tone = "color" }: { className?: string; label?: string; shadow?: string; tone?: "color" | "flat" }) {
  const eyes = (fill: string) =>
    [-1, 1].map((s) => <rect key={s} x={D.x + EYES.cx + (s * EYES.gap) / 2 - EYES.w / 2} y={EYES.cy - EYES.h / 2} width={EYES.w} height={EYES.h} rx={EYES.w / 2} fill={fill} />);
  return (
    <svg className={className} viewBox={MONOGRAM_VIEWBOX} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {tone === "flat" ? (
        <g fill="currentColor">
          <path d={R.d} transform={at(R, R_SHIFT)} opacity={0.55} />
          <path d={D.d} transform={at(D)} />
          {eyes("rgba(0,0,0,.35)")}
        </g>
      ) : (
        <g strokeLinejoin="round" strokeWidth={LINE * 2}>
          {[R, D].map((l) =>
            Array.from({ length: DEPTH }, (_, k) => <path key={`${l.ch}${k}`} d={l.d} transform={at(l, (l === R ? R_SHIFT : 0) + (k + 1) * DEPTH_SLANT, k + 1)} fill={shadow} stroke={shadow} />),
          )}
          <path d={R.d} transform={at(R, R_SHIFT)} fill={COLORS.face} stroke={COLORS.line} paintOrder="stroke" />
          <path d={D.d} transform={at(D)} fill={COLORS.d} stroke={COLORS.line} paintOrder="stroke" />
          {eyes(COLORS.eye)}
        </g>
      )}
    </svg>
  );
}
