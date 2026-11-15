"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Piece } from "@/brand/Piece";
import type { PieceKind } from "@/engine/core";
import { api, saveCreds } from "@/rooms/client";
import { codeSchema } from "@/rooms/schema";
import { PiecePicker } from "./PiecePicker";

/** Criar ou entrar numa sala: o caminho mais curto até o lobby. */
export function SalaHome() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [piece, setPiece] = useState<PieceKind>("bolota");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [codeErr, setCodeErr] = useState<string | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return setErr("Escolha um apelido para os outros te reconhecerem.");
    setBusy(true);
    const res = await api<{ code: string; token: string; playerId: string }>("/api/rooms", { method: "POST", body: JSON.stringify({ nickname, piece, game: "nota" }) });
    setBusy(false);
    if (!res.ok) return setErr(res.message);
    saveCreds(res.data.code, { token: res.data.token, playerId: res.data.playerId });
    router.push(`/sala/${res.data.code}`);
  };

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = codeSchema.safeParse(code);
    if (!parsed.success) return setCodeErr(parsed.error.issues[0]?.message ?? "Código inválido.");
    router.push(`/sala/${parsed.data}`);
  };

  return (
    <div className="mx-auto grid max-w-[960px] gap-6 px-4 pt-2 pb-16 md:grid-cols-2">
      <div className="md:col-span-2">
        <h1>Cada um no seu celular</h1>
        <p className="muted mt-2 max-w-[52ch]">Uma pessoa cria a sala e a turma entra pelo código, pelo link ou pelo QR Code. Sem cadastro. Dá para jogar Jogo da Nota, Infiltrado, Quiz Relâmpago e Você Prefere? assim.</p>
      </div>

      <form onSubmit={join} className="card flex flex-col gap-4 rounded-[28px] p-5" noValidate>
        <div className="flex items-center gap-3">
          <Piece kind="bolota" mood="wow" size={48} />
          <h2>Entrar numa sala</h2>
        </div>
        <label className="grid gap-2">
          <span className="label">Código da sala</span>
          <input
            className="input num h-16 text-center text-[32px] tracking-[0.3em] uppercase"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase().slice(0, 4));
              setCodeErr(null);
            }}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            maxLength={4}
            placeholder="ABCD"
            aria-invalid={!!codeErr}
            aria-describedby="code-err"
          />
        </label>
        <p id="code-err" role="alert" className="text-[15px] font-semibold text-[var(--color-erro)] empty:hidden">
          {codeErr}
        </p>
        <p className="muted text-[15px]">Peça o código de 4 letras para quem criou a sala, ou abra o link ou o QR Code que a pessoa mandou.</p>
        {/* O botão fica no pé do cartão, alinhado com o "Criar sala" ao lado. */}
        <button className="btn mt-auto" type="submit">
          Entrar
        </button>
      </form>

      <form onSubmit={create} className="card flex flex-col gap-4 rounded-[28px] p-5" noValidate>
        <div className="flex items-center gap-3">
          <Piece kind="tijolo" mood="happy" size={48} />
          <h2>Criar uma sala</h2>
        </div>
        <label className="grid gap-2">
          <span className="label">Seu apelido</span>
          <input className="input" value={nickname} onChange={(e) => (setNickname(e.target.value), setErr(null))} maxLength={16} autoComplete="nickname" placeholder="Como a turma te chama" />
        </label>
        <PiecePicker value={piece} onChange={setPiece} />
        <p role="alert" className="text-[15px] font-semibold text-[var(--color-erro)] empty:hidden">
          {err}
        </p>
        <button className="btn btn-gema mt-auto" type="submit" disabled={busy}>
          {busy ? "Criando…" : "Criar sala"}
        </button>
      </form>
    </div>
  );
}
