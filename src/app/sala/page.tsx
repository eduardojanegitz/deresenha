import type { Metadata } from "next";
import Link from "next/link";
import { Piece } from "@/brand/Piece";

export const metadata: Metadata = { title: "Entrar numa sala" };

export default function SalaPage() {
  return (
    <div className="mx-auto grid max-w-[480px] justify-items-center gap-5 px-4 pt-10 pb-16 text-center">
      <Piece kind="bolota" mood="sleep" size={110} />
      <h1>O Modo Sala chega na etapa 4</h1>
      <p className="muted max-w-[36ch]">Cada um no seu celular, entrando com código, link ou QR Code. Enquanto isso, todos os jogos funcionam num celular só, que passa de mão em mão.</p>
      <div className="grid w-full gap-2.5">
        <Link href="/jogos" className="btn">
          Jogar num celular só
        </Link>
        <Link href="/" className="btn btn-ghost">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
