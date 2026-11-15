import type { Metadata } from "next";
import { CustomThemes } from "./CustomThemes";

export const metadata: Metadata = { title: "Meus temas" };

export default function TemasPage() {
  return <CustomThemes />;
}
