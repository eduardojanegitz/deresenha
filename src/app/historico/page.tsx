import type { Metadata } from "next";
import { History } from "./History";

export const metadata: Metadata = { title: "Histórico" };

export default function HistoricoPage() {
  return <History />;
}
