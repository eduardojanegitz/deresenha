import Link from "next/link";
import { Piece } from "@/brand/Piece";
import { Signature } from "@/brand/Signature";
import { GamePieceTable } from "./GamePieceTable";

/**
 * Início em três faixas: a marca e o convite (com a mesa de peças ao lado), três portas de
 * entrada com o mesmo peso (jogo do dia, cada um no seu celular, campeonato) e os atalhos.
 */
export default function Home() {
  return (
    <div className="mx-auto grid max-w-[1120px] gap-10 px-4 pt-3 pb-16 md:gap-14 md:pt-10">
      <section className="grid grid-cols-1 items-center gap-8 [&>*]:min-w-0 lg:grid-cols-[1.2fr_.8fr] lg:gap-12">
        <div className="grid content-start gap-6">
          <Signature className="block h-auto w-full max-w-[640px] cursor-pointer select-none" />
          <p className="max-w-[34ch] text-[clamp(18px,4.4vw,23px)] leading-[1.45] text-[var(--color-tinta-2)]">
            Juntou a turma e ninguém sabe o que jogar? Escolhe um jogo, coloca os nomes e começa. Sem cadastro.
          </p>
          <div className="grid max-w-[560px] gap-2.5 sm:grid-cols-2">
            <Link href="/jogos" className="btn">
              Escolher um jogo
            </Link>
            <Link href="/sala" className="btn btn-ghost">
              Entrar numa sala
            </Link>
          </div>
        </div>
        <div className="w-full max-w-[460px] lg:max-w-none">
          <GamePieceTable />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 [&>*]:min-w-0 md:grid-cols-3" aria-label="Destaques">
        <Feature
          href="/jogos/nota"
          tint="var(--color-gema-t)"
          title="Jogo da Nota"
          text="Alguém recebe uma nota secreta e diz algo que vale exatamente isso. Ou todo mundo dá nota para a mesma situação."
          cta="Jogar agora"
          ctaClass="btn-gema"
        >
          <Piece kind="tijolo" mood="happy" size={92} alive />
          <span className="num mb-1 grid h-14 w-12 rotate-6 place-items-center rounded-2xl bg-white text-[34px] text-[var(--color-tinta)] shadow-[0_5px_0_var(--color-gema-d)]" aria-hidden="true">
            7
          </span>
        </Feature>

        <Feature
          href="/jogos/quiz"
          tint="var(--color-ceu-t)"
          title="Cada um no seu celular"
          text="Crie uma sala e a turma entra pelo código. No Quiz Relâmpago, acertar rápido vale mais."
          cta="Ver o Quiz Relâmpago"
          ctaClass="btn-ceu"
        >
          <Piece kind="meialua" mood="wow" size={86} alive blinkDelay={1.4} />
          <span className="mb-1 grid grid-cols-2 gap-1.5" aria-hidden="true">
            {["var(--color-gema)", "var(--color-chiclete)", "var(--color-ceu)", "var(--color-menta)"].map((c, i) => (
              <i key={i} className="block h-6 w-9 rounded-lg" style={{ background: c, boxShadow: "0 3px 0 rgba(20,36,30,.18)" }} />
            ))}
          </span>
        </Feature>

        <Feature
          href="/noite"
          tint="var(--color-menta-t)"
          title="Noite de Jogos"
          text="Vários jogos seguidos, pontos somados de forma justa e um campeão no fim da noite."
          cta="Montar a noite"
          ctaClass="btn-menta"
        >
          <span className="flex items-end gap-1.5" aria-hidden="true">
            <span className="grid justify-items-center">
              <Piece kind="pino" mood="neutral" size={44} />
              <i className="block h-7 w-12 rounded-t-lg bg-[var(--color-ceu)]" />
            </span>
            <span className="grid justify-items-center">
              <Piece kind="capsula" mood="happy" size={52} alive blinkDelay={0.6} />
              <i className="block h-11 w-12 rounded-t-lg bg-[var(--color-gema)]" />
            </span>
            <span className="grid justify-items-center">
              <Piece kind="bolota" mood="neutral" size={42} />
              <i className="block h-5 w-12 rounded-t-lg bg-[var(--color-chiclete)]" />
            </span>
          </span>
        </Feature>
      </section>

      <nav className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Atalhos">
        {[
          { href: "/jogos", title: "Todos os jogos", text: "Sete jogos prontos, da Mímica ao Quiz Relâmpago.", piece: "pino" as const },
          { href: "/temas", title: "Meus temas", text: "Desafios com as histórias da sua turma.", piece: "bolota" as const },
          { href: "/historico", title: "Histórico", text: "Partidas e quem mais ganhou neste aparelho.", piece: "tijolo" as const },
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
    </div>
  );
}

function Feature({ href, tint, title, text, cta, ctaClass, children }: { href: string; tint: string; title: string; text: string; cta: string; ctaClass: string; children: React.ReactNode }) {
  return (
    <article className="card flex flex-col overflow-hidden rounded-[28px]">
      <div className="flex min-h-[150px] items-end justify-center gap-3 px-5 pt-6 pb-5" style={{ background: tint }}>
        {children}
      </div>
      <div className="flex flex-1 flex-col gap-2 px-5 pt-4 pb-5">
        <h2 className="text-[26px] font-black">{title}</h2>
        <p className="muted flex-1">{text}</p>
        <Link href={href} className={`btn ${ctaClass} mt-3`}>
          {cta}
        </Link>
      </div>
    </article>
  );
}
