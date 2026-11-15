import Link from "next/link";
import { listThemes } from "@/server/admin/repo";
import { updateThemeAction } from "../../actions";
import { NewThemeForm } from "./NewThemeForm";

export default async function TemasPage() {
  const themes = await listThemes();
  return (
    <div className="grid gap-6">
      <h1 className="text-[clamp(28px,6vw,40px)]">Temas</h1>
      <p className="muted max-w-[60ch]">Um tema inativo some de todos os jogos, com todos os seus desafios, sem apagar nada. Os desafios de cada tema se escolhem por jogo na tela de desafios.</p>
      <NewThemeForm />
      <ul className="grid gap-2.5">
        {themes.map((t) => (
          <li key={t.id} className={`card grid gap-3 rounded-[20px] p-4 md:grid-cols-[1fr_auto_auto] md:items-center ${t.active ? "" : "opacity-70"}`}>
            <form action={updateThemeAction} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={t.id} />
              <label className="sr-only" htmlFor={`label-${t.id}`}>
                Nome do tema {t.id}
              </label>
              <input id={`label-${t.id}`} name="label" defaultValue={t.label} className="input h-11 max-w-[240px]" maxLength={40} />
              <button className="btn btn-ghost btn-small">Renomear</button>
              <span className="text-[13px] text-[var(--fg-2)]">{t.id}</span>
            </form>
            <Link href={`/admin/desafios?tema=${t.id}`} className="text-[15px] font-semibold text-[var(--fg-2)] underline underline-offset-4">
              {t.total} {t.total === 1 ? "desafio" : "desafios"}
            </Link>
            <form action={updateThemeAction}>
              <input type="hidden" name="id" value={t.id} />
              <input type="hidden" name="active" value={t.active ? "false" : "true"} />
              <button className={`btn btn-small ${t.active ? "btn-ghost" : ""}`}>{t.active ? "Desativar" : "Ativar"}</button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
