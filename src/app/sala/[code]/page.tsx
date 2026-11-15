import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { codeSchema } from "@/rooms/schema";
import { RoomScreen } from "./RoomScreen";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  return { title: `Sala ${(await params).code.toUpperCase()}`, robots: { index: false } };
}

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const parsed = codeSchema.safeParse((await params).code);
  if (!parsed.success) notFound();
  return <RoomScreen code={parsed.data} />;
}
