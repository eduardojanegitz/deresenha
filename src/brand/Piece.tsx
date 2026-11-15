import type { PieceKind } from "@/engine/core";

export type Mood = "neutral" | "happy" | "wow" | "sus" | "sad" | "sleep";

export const PIECES: Record<PieceKind, { name: string; c: string; d: string; t: string; face: [number, number]; role: string; line: string }> = {
  bolota: { name: "Bolota", c: "var(--color-chiclete)", d: "var(--color-chiclete-d)", t: "var(--color-chiclete-t)", face: [32, 30], role: "Recebe a turma. Aparece quando alguém entra e quando a rodada começa.", line: "Chegou mais um! Puxa uma cadeira." },
  tijolo: { name: "Tijolo", c: "var(--color-gema)", d: "var(--color-gema-d)", t: "var(--color-gema-t)", face: [32, 30], role: "O juiz. Segura as notas e os placares. Fala pouco, pisca muito.", line: "Nota 7. Sem direito a recurso." },
  pino: { name: "Pino", c: "var(--color-lilas)", d: "var(--color-lilas-d)", t: "var(--color-lilas-t)", face: [32, 40], role: "Desconfiado. Mora nos segredos: nota secreta, Infiltrado, votos.", line: "Hmm. Alguém aqui tá blefando." },
  meialua: { name: "Meia-Lua", c: "var(--color-ceu)", d: "var(--color-ceu-d)", t: "var(--color-ceu-t)", face: [32, 42], role: "Dramática. Espia antes das revelações e segura o suspense.", line: "Prepara… que lá vem revelação." },
  capsula: { name: "Cápsula", c: "var(--color-menta)", d: "var(--color-menta-d)", t: "var(--color-menta-t)", face: [32, 26], role: "A animada. Estica e pula nos acertos e nas comemorações.", line: "Acertou na mosca! De novo! De novo!" },
};

function Shape({ kind }: { kind: PieceKind }) {
  switch (kind) {
    case "bolota":
      return <circle cx="32" cy="30" r="25" strokeWidth={0} />;
    case "tijolo":
      return <rect x="8" y="7" width="48" height="46" rx="15" strokeWidth={0} />;
    case "pino":
      return <path d="M32 10L55 51H9Z" strokeWidth={10} strokeLinejoin="round" />;
    case "meialua":
      return <path d="M7 52A25 25 0 0 1 57 52Z" strokeWidth={8} strokeLinejoin="round" />;
    case "capsula":
      return <rect x="15" y="4" width="34" height="52" rx="17" strokeWidth={0} />;
  }
}

function Face({ x, y, mood }: { x: number; y: number; mood: Mood }) {
  const eye = (dx: number, h = 10, w = 5) => <rect className="eye" x={x + dx - w / 2} y={y - 4 - h / 2} width={w} height={h} rx={w / 2} strokeWidth={0} />;
  const line = (d: string) => <path d={d} fill="none" strokeWidth={2.8} strokeLinecap="round" />;
  let eyes: React.ReactNode;
  let mouth: React.ReactNode;
  switch (mood) {
    case "happy":
      eyes = line(`M${x - 10} ${y - 3}q3-5 6 0M${x + 4} ${y - 3}q3-5 6 0`);
      mouth = line(`M${x - 6} ${y + 4}q6 7 12 0`);
      break;
    case "wow":
      eyes = (
        <>
          {eye(-7, 12)}
          {eye(7, 12)}
        </>
      );
      mouth = <circle cx={x} cy={y + 8} r={3.4} strokeWidth={0} />;
      break;
    case "sus":
      eyes = (
        <>
          <rect x={x - 9} y={y - 6} width={6} height={4} rx={2} strokeWidth={0} />
          <rect x={x + 5} y={y - 6} width={6} height={4} rx={2} strokeWidth={0} />
        </>
      );
      mouth = line(`M${x - 1} ${y + 6}h7`);
      break;
    case "sad":
      eyes = (
        <>
          {eye(-7)}
          {eye(7)}
        </>
      );
      mouth = line(`M${x - 5} ${y + 9}q5-5 10 0`);
      break;
    case "sleep":
      eyes = line(`M${x - 10} ${y - 3}h6M${x + 4} ${y - 3}h6`);
      mouth = <circle cx={x} cy={y + 6} r={1.9} strokeWidth={0} />;
      break;
    default:
      eyes = (
        <>
          {eye(-7)}
          {eye(7)}
        </>
      );
      mouth = line(`M${x - 4} ${y + 6}h8`);
  }
  return (
    <g style={{ fill: "var(--color-tinta)", stroke: "var(--color-tinta)" }}>
      {eyes}
      {mouth}
    </g>
  );
}

/** Uma peça: forma sólida com espessura colorida e um rosto. Puramente decorativa. */
export function Piece({ kind, mood = "neutral", size = 64, alive = false, className = "", blinkDelay }: { kind: PieceKind; mood?: Mood; size?: number; alive?: boolean; className?: string; blinkDelay?: number }) {
  const p = PIECES[kind];
  return (
    <svg
      className={`piece block overflow-visible ${alive ? "alive" : ""} ${className}`}
      style={alive ? ({ "--bd": `${blinkDelay ?? (kind.length % 5) * 0.9}s` } as React.CSSProperties) : undefined}
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <g style={{ fill: p.d, stroke: p.d }} transform="translate(0 4)">
        <Shape kind={kind} />
      </g>
      <g style={{ fill: p.c, stroke: p.c }}>
        <Shape kind={kind} />
      </g>
      <Face x={p.face[0]} y={p.face[1]} mood={mood} />
    </svg>
  );
}
