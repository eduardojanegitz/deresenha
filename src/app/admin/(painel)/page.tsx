import Link from "next/link";
import { ADMIN_GAMES, countsByGame, countsByTheme, GAME_LABEL, listThemes, STATUS_LABEL } from "@/server/admin/repo";
import type { PublishStatus } from "@/content/types";

export default async function PainelHome() {
  const [byGame, byTheme, themes] = await Promise.all([countsByGame(), countsByTheme(), listThemes()]);
  const n = (game: string, status: PublishStatus) => byGame.find((r) => r.game === game && r.status === status)?.n ?? 0;
  const t = (theme: string, game: string) => byTheme.find((r) => r.theme === theme && r.game === game)?.n ?? 0;
  return (
    <div className="grid gap-8">
      <section>
        <h1 className="mb-4 text-[clamp(28px,6vw,40px)]">Visão geral</h1>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {ADMIN_GAMES.map((g) => (
            <Link key={g} href={`/admin/desafios?game=${g}`} className="card grid gap-1 p-4 hover:-translate-y-0.5 transition-transform">
              <span className="text-sm font-bold text-[var(--fg-2)]">{GAME_LABEL[g]}</span>
              <span className="num text-4xl">{n(g, "published")}</span>
              <span className="text-[13px] text-[var(--fg-2)]">
                publicados · {n(g, "draft")} {STATUS_LABEL.draft.toLowerCase()}s · {n(g, "archived")} arquivados
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3">Publicados por tema</h2>
        <div className="card overflow-x-auto p-1">
          <table className="w-full min-w-[560px] border-collapse text-[15px]">
            <thead>
              <tr className="text-left text-[13px] text-[var(--fg-2)]">
                <th className="px-3 py-2 font-semibold">Tema</th>
                {ADMIN_GAMES.map((g) => (
                  <th key={g} className="px-3 py-2 text-right font-semibold">
                    {GAME_LABEL[g]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {themes.map((th) => (
                <tr key={th.id} className="border-t border-[var(--line)]">
                  <td className="px-3 py-2">
                    {th.label}
                    {!th.active && <span className="ml-2 rounded-full bg-[var(--color-sup-2)] px-2 py-0.5 text-xs font-semibold text-[var(--fg-2)]">inativo</span>}
                  </td>
                  {ADMIN_GAMES.map((g) => (
                    <td key={g} className="num px-3 py-2 text-right text-lg">
                      {t(th.id, g) || <span className="text-[var(--line)]">0</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
