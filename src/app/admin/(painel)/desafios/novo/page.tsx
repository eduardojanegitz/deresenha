import { ADMIN_GAMES, listThemes, type AdminGame } from "@/server/admin/repo";
import { ChallengeForm } from "../ChallengeForm";

export default async function NovoDesafio({ searchParams }: { searchParams: Promise<{ game?: string }> }) {
  const sp = await searchParams;
  const themes = await listThemes();
  const game = ADMIN_GAMES.includes(sp.game as AdminGame) ? (sp.game as AdminGame) : undefined;
  return (
    <div className="grid gap-5">
      <h1 className="text-[clamp(28px,6vw,40px)]">Novo desafio</h1>
      <ChallengeForm initial={null} themes={themes} defaultGame={game} />
    </div>
  );
}
