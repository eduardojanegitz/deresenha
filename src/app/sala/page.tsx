import type { Metadata } from "next";
import { SalaHome } from "./SalaHome";

export const metadata: Metadata = { title: "Sala" };

export default function SalaPage() {
  return <SalaHome />;
}
