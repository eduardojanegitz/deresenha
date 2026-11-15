"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Piece } from "@/brand/Piece";
import { useCustomSets } from "@/content/useGameContent";
import { CUSTOM_GAME_LABEL, CUSTOM_HELP, saveSets, validateSet, type CustomGame, type CustomSet } from "@/custom/customSets";
import { Sheet } from "@/ui/play";

const GAMES = Object.keys(CUSTOM_GAME_LABEL) as CustomGame[];
const PIECE_OF: Record<CustomGame, "tijolo" | "capsula" | "pino" | "meialua" | "bolota"> = {
  "nota-secreta": "tijolo",
  "nota-avaliacao": "tijolo",
  mimica: "capsula",
  infiltrado: "pino",
  ranking: "meialua",
  prefere: "bolota",
};

/** Temas da turma: criados aqui, guardados neste aparelho, usados nas partidas num celular só. */
export function CustomThemes() {
  const sets = useCustomSets();
  const [editing, setEditing] = useState<CustomSet | null>(null);
  const [removing, setRemoving] = useState<CustomSet | null>(null);
  const startNew = () => setEditing({ id: "", name: "", game: "nota-avaliacao", lines: [], updatedAt: 0 });

  return (
    <div className="mx-auto max-w-[720px] px-4 pt-2 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Meus temas</h1>
          <p className="muted mt-2 max-w-[52ch]">Desafios da sua turma: “Nossa turma da faculdade”, “Viagem de fim de ano”. Eles aparecem primeiro na lista de temas de cada jogo e ficam guardados só neste aparelho.</p>
        </div>
      </div>

      {!editing && (
        <div className="mt-6 grid gap-3">
          <button className="btn btn-gema" onClick={startNew}>
            Criar um tema
          </button>
          <AnimatePresence initial={false}>
            {sets.map((s) => (
              <motion.div key={s.id} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 30 }} className="card flex items-center gap-3 rounded-[20px] p-4">
                <Piece kind={PIECE_OF[s.game]} size={44} />
                <div className="min-w-0 flex-1">
                  <b className="font-display block truncate text-lg font-extrabold">{s.name}</b>
                  <span className="text-[13px] text-[var(--fg-2)]">
                    {CUSTOM_GAME_LABEL[s.game]}, {s.lines.filter((l) => l.trim()).length} {s.game === "ranking" ? "itens" : "desafios"}
                  </span>
                </div>
                <button className="btn btn-ghost btn-small" onClick={() => setEditing(s)}>
                  Editar
                </button>
                <button className="rounded-xl px-2 py-2 text-[15px] font-semibold text-[var(--fg-2)] underline underline-offset-4" onClick={() => setRemoving(s)}>
                  Apagar
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {sets.length === 0 && (
            <div className="grid justify-items-center gap-2 py-8 text-center">
              <Piece kind="bolota" mood="wow" size={72} />
              <p className="muted max-w-[36ch]">Nenhum tema ainda. Que tal um com as histórias que só a sua turma entende?</p>
            </div>
          )}
        </div>
      )}

      {editing && (
        <Editor
          initial={editing}
          onCancel={() => setEditing(null)}
          onSave={(s) => {
            const now = Date.now();
            const saved = { ...s, id: s.id || now.toString(36), updatedAt: now };
            saveSets([saved, ...sets.filter((x) => x.id !== saved.id)]);
            setEditing(null);
          }}
        />
      )}

      <Sheet open={!!removing} onClose={() => setRemoving(null)} title={`Apagar “${removing?.name ?? ""}”?`} piece={<Piece kind="meialua" mood="sad" size={44} />}>
        <p className="text-[var(--color-tinta-2)]">Não dá para desfazer. Os desafios deste tema somem deste aparelho.</p>
        <div className="grid gap-2.5">
          <button
            className="btn btn-rosa"
            onClick={() => {
              saveSets(sets.filter((x) => x.id !== removing?.id));
              setRemoving(null);
            }}
          >
            Apagar tema
          </button>
          <button className="btn btn-ghost" onClick={() => setRemoving(null)}>
            Manter
          </button>
        </div>
      </Sheet>
    </div>
  );
}

function Editor({ initial, onSave, onCancel }: { initial: CustomSet; onSave: (s: CustomSet) => void; onCancel: () => void }) {
  const [name, setName] = useState(initial.name);
  const [game, setGame] = useState<CustomGame>(initial.game);
  const [text, setText] = useState(initial.lines.join("\n"));
  const [err, setErr] = useState<string | null>(null);
  const help = CUSTOM_HELP[game];
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const draft = { ...initial, name: name.trim(), game, lines: text.split("\n").map((l) => l.trim()).filter(Boolean) };
    const problem = validateSet(draft);
    setErr(problem);
    if (!problem) onSave(draft);
  };
  return (
    <form onSubmit={save} className="card mt-6 grid gap-5 p-5" noValidate>
      <h2>{initial.id ? "Editar tema" : "Novo tema"}</h2>
      <label className="grid gap-2">
        <span className="label">Nome</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Nossa turma da faculdade" />
      </label>
      <label className="grid gap-2">
        <span className="label">Para qual jogo</span>
        <select className="input" value={game} onChange={(e) => setGame(e.target.value as CustomGame)}>
          {GAMES.map((g) => (
            <option key={g} value={g}>
              {CUSTOM_GAME_LABEL[g]}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2">
        <span className="label">Desafios</span>
        <textarea className="input h-auto min-h-56 py-3 leading-relaxed" value={text} onChange={(e) => setText(e.target.value)} placeholder={help.placeholder} />
        <span className="muted text-[13px]">{help.hint}</span>
      </label>
      <p role="alert" className="text-[15px] font-semibold text-[var(--color-erro)]">
        {err}
      </p>
      <div className="flex flex-wrap gap-3">
        <button className="btn btn-gema w-auto px-8">Salvar tema</button>
        <button type="button" className="btn btn-ghost w-auto" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
