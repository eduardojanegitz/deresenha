import Link from "next/link";
import { Piece } from "@/brand/Piece";
import { Signature } from "@/brand/Signature";
import { GamePieceTable } from "./GamePieceTable";

export default function Home() {
  return (
    <div className="mx-auto grid max-w-[1120px] grid-cols-1 gap-7 px-4 pt-3 pb-14 [&>*]:min-w-0 md:grid-cols-[1.15fr_.85fr] md:items-start md:gap-14 md:pt-12">
      <section className="grid content-start gap-[22px]">
        <Signature className="block h-auto w-full max-w-[560px] text-[var(--color-tinta)]" />
        <p className="max-w-[30ch] text-[clamp(18px,4.4vw,22px)] leading-[1.45] text-[var(--color-tinta-2)]">
          Juntou a turma e ninguém sabe o que jogar? Escolhe um jogo, coloca os nomes e começa. Sem cadastro.
        </p>
        <div className="grid max-w-[420px] gap-2.5">
          <Link href="/jogos" className="btn">
            Escolher um jogo
          </Link>
          <Link href="/sala" className="btn btn-ghost">
            Entrar numa sala
          </Link>
        </div>
      </section>

      <section className="grid gap-7" aria-label="Destaques">
        <GamePieceTable />
        <article className="card overflow-hidden rounded-[28px]">
          <div className="flex min-h-[180px] items-end justify-center gap-3 bg-[var(--color-gema-t)] px-5 pt-7 pb-[22px]">
            <Piece kind="tijolo" mood="happy" size={120} alive />
            <div className="num mb-2 grid h-[72px] w-16 rotate-6 place-items-center rounded-2xl bg-white text-[44px] text-[var(--color-tinta)] shadow-[0_5px_0_var(--color-gema-d)]" aria-hidden="true">
              7
            </div>
          </div>
          <div className="grid gap-2 px-5 pt-[18px] pb-5">
            <h2 className="text-[30px] font-black">Jogo da Nota</h2>
            <p className="muted">Alguém recebe uma nota secreta e precisa dizer algo que vale exatamente isso. Ou todo mundo dá nota para a mesma situação e vê quem pensa igual.</p>
            <Link href="/jogos/nota" className="btn btn-gema mt-2.5">
              Jogar agora
            </Link>
          </div>
        </article>
        <nav className="grid gap-2.5" aria-label="Mais">
          {[
            { href: "/noite", title: "Noite de Jogos", text: "Vários jogos seguidos, um campeão no fim.", piece: "capsula" as const },
            { href: "/temas", title: "Meus temas", text: "Desafios com as histórias da sua turma.", piece: "bolota" as const },
            { href: "/historico", title: "Histórico", text: "Partidas e quem mais ganhou neste aparelho.", piece: "meialua" as const },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="card flex items-center gap-3 rounded-[20px] px-4 py-3 transition-transform active:translate-y-1">
              <Piece kind={l.piece} size={40} />
              <span>
                <b className="font-display block text-lg font-extrabold">{l.title}</b>
                <span className="text-sm text-[var(--fg-2)]">{l.text}</span>
              </span>
            </Link>
          ))}
        </nav>
      </section>
    </div>
  );
}
