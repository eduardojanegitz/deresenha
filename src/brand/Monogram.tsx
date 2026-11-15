/** Geometria do monograma: traço de 18 em caixa de 100, pontas redondas. O trecho reto do D é a haste do R. */
export const D_PATH = "M9 91V9H30A32 32 0 0 1 62 41V59A32 32 0 0 1 30 91Z";
export const R_BOWL = "M0 91V9H18A21 21 0 0 1 18 51H0";
export const R_LEG = "M14 51L42 91";

export function Monogram({ className = "", label }: { className?: string; label?: string }) {
  return (
    <svg className={className} viewBox="-6 -6 125 112" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <g fill="none" stroke="currentColor" strokeWidth={18} strokeLinecap="round" strokeLinejoin="round">
        <path d={D_PATH} />
        <g transform="translate(62 0)">
          <path d={R_BOWL} />
          <path d={R_LEG} />
        </g>
      </g>
    </svg>
  );
}
