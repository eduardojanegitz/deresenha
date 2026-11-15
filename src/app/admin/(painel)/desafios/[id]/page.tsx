import { notFound } from "next/navigation";
import { getChallenge, listThemes } from "@/server/admin/repo";
import { ChallengeForm } from "../ChallengeForm";

export default async function EditarDesafio({ params }: { params: Promise<{ id: string }> }) {
  const id = decodeURIComponent((await params).id);
  const [c, themes] = await Promise.all([getChallenge(id), listThemes()]);
  if (!c) notFound();
  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-[clamp(28px,6vw,40px)]">Editar desafio</h1>
        <p className="muted mt-1 text-[13px]">{c.id}</p>
      </div>
      <ChallengeForm initial={c} themes={themes} />
    </div>
  );
}
