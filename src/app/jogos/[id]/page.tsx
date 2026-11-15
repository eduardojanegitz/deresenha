import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Piece } from "@/brand/Piece";
import { GAMES, getGame, MODE_LABEL } from "@/games/registry";

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const g = getGame((await params).id);
  return { title: g?.name ?? "Jogo", description: g?.tagline };
}

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const g = getGame((await params).id);
  if (!g) notFound();
  const ready = g.status === "ready";
  const shared = g.available.includes("shared");
  const room = g.available.includes("room");
  return (
    <div className="mx-auto max-w-[560px] px-4 pt-2 pb-14">
      <div className="grid place-items-center rounded-[28px] pt-7 pb-[22px]" style={{ background: g.tint }}>
        <Piece kind={g.piece} mood={ready ? "happy" : "sleep"} size={140} alive={ready} />
      </div>
      <div className="mt-5 grid gap-3">
        <h1>{g.name}</h1>
        <p className="text-[19px] leading-snug">{g.description}</p>
        <p className="muted">
          De {g.players.min} a {g.players.max} pessoas. {g.available.map((m) => `${MODE_LABEL[m]}.`).join(" ")} {g.minutes && `Cerca de ${g.minutes}.`}
        </p>
      </div>

      {ready ? (
        <>
          <section className="mt-8">
            <h2 className="mb-3">Como funciona</h2>
            <ol className="grid gap-3">
              {g.rules.map((r, i) => (
                <li key={i} className="grid grid-cols-[34px_1fr] items-start gap-3">
                  <span className="num grid size-[34px] place-items-center rounded-xl bg-[var(--color-tinta)] text-base text-white">{i + 1}</span>
                  <span>{r}</span>
                </li>
              ))}
            </ol>
          </section>
          {g.scoring && (
            <section className="mt-8">
              <h2 className="mb-3">Pontos</h2>
              <p>{g.scoring}</p>
            </section>
          )}
          {room && !shared ? (
            <div className="sticky-cta">
              <Link href="/sala" className="btn">
                Criar ou entrar numa sala
              </Link>
            </div>
          ) : room ? (
            <div className="card mt-8 grid gap-3 p-5">
              <h2>Cada um no seu celular</h2>
              <p className="muted">Crie uma sala e a turma entra pelo código, link ou QR Code. Os segredos chegam só no celular de quem pode ver.</p>
              <Link href="/sala" className="btn btn-ghost">
                Criar ou entrar numa sala
              </Link>
            </div>
          ) : g.modes.includes("room") ? (
            <p className="muted mt-6 text-[15px]">O modo em que cada um usa o próprio celular ainda não chegou para este jogo. Por enquanto, um celular passa de mão em mão.</p>
          ) : null}
          {shared && (
            <div className="sticky-cta">
              <Link href={`/jogos/${g.id}/jogar`} className="btn">
                Configurar partida
              </Link>
            </div>
          )}
        </>
      ) : (
        <section className="card mt-8 grid gap-3 p-5">
          <h2>Ainda não dá para jogar</h2>
          <p className="muted">{g.pendingNote ?? `Esse jogo está no plano da etapa ${g.stage}.`} Enquanto isso, que tal um dos que já estão prontos?</p>
          <Link href="/jogos" className="btn btn-ghost">
            Ver os jogos prontos
          </Link>
        </section>
      )}
    </div>
  );
}
