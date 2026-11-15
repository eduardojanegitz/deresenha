import type { Metadata } from "next";
import { Library } from "./Library";

export const metadata: Metadata = { title: "Jogos" };

export default function JogosPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-4 pt-2 pb-14">
      <h1>Jogos</h1>
      <p className="muted mt-2 mb-[18px] max-w-[52ch]">Quatro jogos prontos para jogar num celular só. Os outros estão no plano e aparecem aqui dormindo até chegar a vez deles.</p>
      <Library />
    </div>
  );
}
