import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GAMES, getGame } from "@/games/registry";
import { GameHost } from "./GameHost";

export function generateStaticParams() {
  return GAMES.filter((g) => g.status === "ready" && g.available.includes("shared")).map((g) => ({ id: g.id }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  return { title: getGame((await params).id)?.name ?? "Jogar" };
}

export default async function JogarPage({ params }: { params: Promise<{ id: string }> }) {
  const g = getGame((await params).id);
  if (!g || g.status !== "ready" || !g.available.includes("shared")) notFound();
  return <GameHost id={g.id} />;
}
