import Link from "next/link";
import type { PublishStatus } from "@/content/types";
import { ADMIN_GAMES, DIFF_LABEL, GAME_LABEL, listChallenges, listThemes, STATUS_LABEL, type ChallengeRow } from "@/server/admin/repo";
import { setStatusAction } from "../../actions";

function summary(c: Pick<ChallengeRow, "game" | "data">) {
  const d = c.data;
  if (c.game === "infiltrado") return `${d.major} × ${d.impostor}`;
  if (c.game === "ranking") return `${d.title} (${(d.items as string[]).length} itens)`;
  return String(d.text ?? "");
}

const STATUS_STYLE: Record<PublishStatus, string> = {
  published: "bg-[var(--color-menta-t)] text-[var(--color-tinta)]",
  draft: "bg-[var(--color-gema-t)] text-[var(--color-tinta)]",
  archived: "bg-[var(--color-sup-2)] text-[var(--fg-2)]",
};

export default async function DesafiosPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.pagina) || 1);
  const filters = {
    game: ADMIN_GAMES.includes(sp.game as never) ? sp.game : undefined,
    theme: sp.tema || undefined,
    status: ["published", "draft", "archived"].includes(sp.status ?? "") ? sp.status : undefined,
    q: sp.q?.slice(0, 60) || undefined,
    page,
  };
  const [{ rows, total, limit }, themes] = await Promise.all([listChallenges(filters), listThemes()]);
  const label = (id: string) => themes.find((t) => t.id === id)?.label ?? id;
  const pages = Math.max(1, Math.ceil(total / limit));
  const qs = (p: number) => {
    const u = new URLSearchParams();
    if (filters.game) u.set("game", filters.game);
    if (filters.theme) u.set("tema", filters.theme);
    if (filters.status) u.set("status", filters.status);
    if (filters.q) u.set("q", filters.q);
    u.set("pagina", String(p));
    return `?${u}`;
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-[clamp(28px,6vw,40px)]">Desafios</h1>
        <Link href={`/admin/desafios/novo${filters.game ? `?game=${filters.game}` : ""}`} className="btn btn-gema btn-small">
          Novo desafio
        </Link>
      </div>
      {sp.salvo && (
        <p role="status" className="rounded-2xl bg-[var(--color-menta-t)] px-4 py-3 text-[15px] font-semibold">
          Desafio salvo. Os jogos já usam a versão nova em até 30 segundos.
        </p>
      )}

      <form className="card grid grid-cols-2 gap-3 p-4 md:grid-cols-[1fr_1fr_1fr_2fr_auto]" role="search">
        <select name="game" defaultValue={filters.game ?? ""} className="input" aria-label="Jogo">
          <option value="">Todos os jogos</option>
          {ADMIN_GAMES.map((g) => (
            <option key={g} value={g}>
              {GAME_LABEL[g]}
            </option>
          ))}
        </select>
        <select name="tema" defaultValue={filters.theme ?? ""} className="input" aria-label="Tema">
          <option value="">Todos os temas</option>
          {themes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={filters.status ?? ""} className="input" aria-label="Situação">
          <option value="">Qualquer situação</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <input name="q" defaultValue={filters.q ?? ""} className="input col-span-2 md:col-span-1" placeholder="Buscar no texto" aria-label="Buscar no texto" />
        <button className="btn btn-small col-span-2 md:col-span-1">Filtrar</button>
      </form>

      <p className="muted text-[15px]">
        {total} {total === 1 ? "desafio" : "desafios"}
      </p>

      <ul className="grid gap-2.5">
        {rows.map((c) => (
          <li key={c.id} className="card grid gap-3 rounded-[20px] p-4 md:grid-cols-[1fr_auto] md:items-center">
            <div className="grid gap-1">
              <Link href={`/admin/desafios/${encodeURIComponent(c.id)}`} className="font-display text-lg leading-snug font-extrabold hover:underline">
                {summary(c)}
              </Link>
              <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-[var(--fg-2)]">
                <span className={`rounded-full px-2 py-0.5 font-semibold ${STATUS_STYLE[c.status]}`}>{STATUS_LABEL[c.status]}</span>
                <span>{GAME_LABEL[c.game]}</span>
                {c.game === "nota" && <span>· {c.data.kind === "secreta" ? "Nota Secreta" : "Avaliação"}</span>}
                <span>· {label(c.theme)}</span>
                <span>· {DIFF_LABEL[c.difficulty]}</span>
                {c.min_age !== null && <span>· {c.min_age}+</span>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["published", "draft", "archived"] as const)
                .filter((s) => s !== c.status)
                .map((s) => (
                  <form key={s} action={setStatusAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="status" value={s} />
                    <button className={`btn btn-small ${s === "published" ? "" : "btn-ghost"}`}>{s === "published" ? "Publicar" : s === "draft" ? "Rascunho" : "Arquivar"}</button>
                  </form>
                ))}
            </div>
          </li>
        ))}
        {rows.length === 0 && <li className="py-10 text-center text-[var(--fg-2)]">Nenhum desafio com esses filtros.</li>}
      </ul>

      {pages > 1 && (
        <nav className="flex items-center justify-center gap-3" aria-label="Páginas">
          {page > 1 && (
            <Link href={qs(page - 1)} className="btn btn-ghost btn-small">
              Anterior
            </Link>
          )}
          <span className="muted text-[15px]">
            Página {page} de {pages}
          </span>
          {page < pages && (
            <Link href={qs(page + 1)} className="btn btn-ghost btn-small">
              Próxima
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
