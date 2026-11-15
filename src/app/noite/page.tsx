import type { Metadata } from "next";
import { NightGame } from "./NightGame";

export const metadata: Metadata = { title: "Noite de Jogos" };

export default function NoitePage() {
  return <NightGame />;
}
