import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Piece } from "@/brand/Piece";
import { adminConfigured, getAdmin } from "@/server/admin/session";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Painel", robots: { index: false, follow: false } };

export default async function EntrarPage() {
  if (await getAdmin()) redirect("/admin");
  const configured = adminConfigured();
  return (
    <div className="mx-auto grid max-w-[420px] gap-5 px-4 pt-10 pb-16">
      <div className="grid justify-items-center gap-3 text-center">
        <Piece kind="pino" mood="sus" size={80} />
        <h1>Painel</h1>
        <p className="muted">Área restrita para cuidar dos jogos, temas e desafios.</p>
      </div>
      {configured ? (
        <LoginForm />
      ) : (
        <div className="card grid gap-2 p-5 text-[15px]">
          <b>O painel ainda não foi configurado.</b>
          <p className="muted">
            Rode <code>npm run admin:password</code> no projeto e coloque as duas variáveis geradas no <code>.env</code> (e na hospedagem). Depois reinicie o servidor.
          </p>
        </div>
      )}
    </div>
  );
}
