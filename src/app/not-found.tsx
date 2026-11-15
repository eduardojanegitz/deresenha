import Link from "next/link";
import { Piece } from "@/brand/Piece";

export default function NotFound() {
  return (
    <div className="mx-auto grid max-w-[480px] justify-items-center gap-5 px-4 pt-10 pb-16 text-center">
      <Piece kind="pino" mood="sus" size={110} />
      <h1>Essa página não existe</h1>
      <p className="muted">O endereço pode ter um erro de digitação, ou o jogo mudou de lugar.</p>
      <Link href="/jogos" className="btn">
        Ver os jogos
      </Link>
    </div>
  );
}
