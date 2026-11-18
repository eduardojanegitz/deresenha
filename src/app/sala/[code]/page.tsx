import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { codeSchema } from "@/rooms/schema";
import { RoomScreen } from "./RoomScreen";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  return { title: `Sala ${(await params).code.toUpperCase()}`, robots: { index: false } };
}

export default async function RoomPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const parsed = codeSchema.safeParse((await params).code);
  if (!parsed.success) notFound();
  // ?janela=1: a sala aberta dentro da janelinha flutuante.
  return <RoomScreen code={parsed.data} embed={(await searchParams).janela === "1"} />;
}
