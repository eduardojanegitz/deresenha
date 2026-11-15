import type { Metadata } from "next";
import { Monogram } from "@/brand/Monogram";
import { Piece, PIECES } from "@/brand/Piece";
import { PIECE_KINDS } from "@/engine/core";
import { SignatureReplay } from "./SignatureReplay";

export const metadata: Metadata = { title: "Marca" };

const SWATCHES: [string, string, string][] = [
  ["Feltro", "#0F6B52", "Principal. Ações e marca."],
  ["Chiclete", "#FF6F91", "Secundária. Bolota, entradas."],
  ["Gema", "#FFC23D", "Destaque. Notas e foco."],
  ["Céu", "#6EC1FF", "Meia-Lua, Ranking."],
  ["Lilás", "#B7A4FF", "Pino, segredos."],
  ["Menta", "#43C59E", "Cápsula, acertos."],
  ["Giz", "#F1F4EF", "Fundo."],
  ["Noite", "#0B3B2E", "Segredos e revelações."],
  ["Tinta", "#14241E", "Texto principal."],
  ["Tinta 2", "#4B5E56", "Texto secundário."],
  ["Sucesso", "#23A05B", "Acertos, sempre com texto."],
  ["Erro", "#E2434B", "Erros, tempo acabando."],
  ["Aviso", "#E8890C", "Avisos."],
];

export default function MarcaPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-4 pt-2 pb-16">
      <h1>Marca</h1>
      <p className="muted mt-2 max-w-[56ch]">O DeResenha é a caixa de jogos da turma. Tudo nasce de peças de tabuleiro que ganharam vida, sobre uma mesa de feltro. O nome é pintado como letreiro de boteco, onde a resenha acontece.</p>

      <section className="mt-8">
        <h2 className="mb-3">Monograma</h2>
        <div className="card grid place-items-center rounded-[28px] px-5 py-8">
          <Monogram className="h-auto w-full max-w-[220px]" label="Monograma DR" />
        </div>
        <p className="muted mt-3 max-w-[60ch]">
          O D e o R encaixados, como no começo da assinatura. Letras da Titan One, recheio creme, contorno verde-noite e sombra em bloco verde-feltro. O D é um bloco amarelo com rosto, parente das peças: pisca, espia e conduz a abertura do nome.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="mb-3">Assinatura</h2>
        <SignatureReplay />
      </section>

      <section className="mt-8">
        <h2 className="mb-3">Tamanhos e cores</h2>
        <div className="flex flex-wrap items-end gap-[18px]">
          {[16, 24, 32, 48, 72, 112].map((s) => (
            <div key={s} className="grid place-items-center rounded-[22%] bg-[var(--color-feltro)]" style={{ width: s, height: s }}>
              <Monogram className="h-auto w-[74%]" shadow="#062a20" />
            </div>
          ))}
        </div>
        <div className="mt-3.5 grid grid-cols-2 gap-2.5 md:grid-cols-4">
          {[
            ["#fff", undefined],
            ["var(--color-feltro)", "#062a20"],
            ["var(--color-chiclete-t)", undefined],
            ["var(--color-noite)", "#0f6b52"],
          ].map(([bg, shadow]) => (
            <div key={bg} className="grid place-items-center rounded-[22px] p-[22px]" style={{ background: bg }}>
              <Monogram className="h-14 w-auto" shadow={shadow} />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3">Paleta</h2>
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5">
          {SWATCHES.map(([n, h, r]) => (
            <li key={n} className="card overflow-hidden rounded-[20px]">
              <i className="block h-[72px]" style={{ background: h }} />
              <div className="px-3 py-2.5 text-[13.5px] leading-snug">
                <b className="block text-[15px]">{n}</b>
                {h}
                <br />
                <span className="muted">{r}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="mb-3">Tipografia</h2>
        <div className="card grid gap-2 p-5">
          <p className="font-display text-[clamp(34px,8vw,56px)] leading-[1.05] font-black">Nota 7, sem recurso.</p>
          <p className="muted">M PLUS Rounded 1c, 900. Títulos, botões e números.</p>
          <p className="mt-2.5 max-w-[56ch] text-lg">Onest para a interface: textos, rótulos e instruções. Desenho aberto, números claros e boa leitura em telas pequenas, de longe e com pressa.</p>
          <p className="muted">Onest, 400 a 700.</p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3">As peças</h2>
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
          {PIECE_KINDS.map((k) => (
            <li key={k} className="card grid grid-cols-[auto_1fr] items-center gap-3.5 rounded-[22px] p-4">
              <Piece kind={k} size={72} alive />
              <div>
                <h3 className="text-[19px] font-extrabold">{PIECES[k].name}</h3>
                <p className="text-sm leading-snug text-[var(--fg-2)]">{PIECES[k].role}</p>
                <div className="mt-2 flex gap-1">
                  {(["happy", "wow", "sus", "sad", "sleep"] as const).map((m) => (
                    <Piece key={m} kind={k} mood={m} size={28} />
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="mb-3">Movimento</h2>
        <dl className="grid gap-2">
          {[
            ["Deslize", "Troca de tela e de fase. 320 ms, desacelerando, no máximo 16px de deslocamento."],
            ["Encaixe", "Algo que chega ao lugar: item no ranking, carta virando. Mola com leve passada."],
            ["Afundar", "Toque em botão. 90 ms, o botão desce a própria espessura."],
            ["Suspense", "Antes de revelar um número. Os dígitos giram e desaceleram em degraus."],
            ["Queda", "Palpites caindo no placar. Uma peça depois da outra, quicando."],
          ].map(([k, v]) => (
            <div key={k} className="card grid grid-cols-[110px_1fr] gap-3 rounded-2xl px-3.5 py-3 text-[15px]">
              <dt className="font-display font-extrabold">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
