import type { Metadata } from "next";
import { GAMES } from "@/games/registry";
import { Library } from "./Library";

export const metadata: Metadata = { title: "Jogos" };

const NUMBERS = ["Zero", "Um", "Dois", "Três", "Quatro", "Cinco", "Seis", "Sete", "Oito", "Nove", "Dez"];

export default function JogosPage() {
  const n = GAMES.filter((g) => g.status === "ready").length;
  const ready = NUMBERS[n] ?? String(n);
  return (
    <div className="mx-auto max-w-[1120px] px-4 pt-2 pb-14">
      <h1>Jogos</h1>
      <p className="muted mt-2 mb-[18px] max-w-[52ch]">
        {ready} jogos prontos. A maioria funciona num celular só, passando de mão em mão; alguns também com cada um no seu celular. Os que ainda não chegaram aparecem dormindo.
      </p>
      <Library />
    </div>
  );
}
