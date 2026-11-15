import { ADMIN_GAMES, GAME_LABEL, listGameSettings } from "@/server/admin/repo";
import { saveGameSettingsAction } from "../../actions";

export default async function JogosAdminPage() {
  const settings = await listGameSettings();
  return (
    <div className="grid gap-6">
      <h1 className="text-[clamp(28px,6vw,40px)]">Jogos</h1>
      <p className="muted max-w-[60ch]">Um jogo em pausa continua na biblioteca, mas não deixa começar partidas. As rodadas padrão são o valor inicial na configuração da partida.</p>
      <ul className="grid gap-3 md:grid-cols-2">
        {ADMIN_GAMES.map((g) => {
          const s = settings.find((x) => x.game === g) ?? { enabled: true, default_rounds: 3 };
          return (
            <li key={g} className="card p-5">
              <form action={saveGameSettingsAction} className="grid gap-4">
                <input type="hidden" name="game" value={g} />
                <h2>{GAME_LABEL[g]}</h2>
                <label className="grid gap-2">
                  <span className="label">Situação</span>
                  <select name="enabled" defaultValue={String(s.enabled)} className="input">
                    <option value="true">Disponível</option>
                    <option value="false">Em pausa</option>
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="label">{g === "mimica" ? "Vezes por time (padrão)" : "Rodadas (padrão)"}</span>
                  <input name="defaultRounds" type="number" min={1} max={20} defaultValue={s.default_rounds} className="input" />
                </label>
                <button className="btn btn-small">Salvar</button>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
