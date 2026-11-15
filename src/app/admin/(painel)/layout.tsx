import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/server/admin/session";
import { logoutAction } from "../actions";

export const metadata: Metadata = { title: "Painel", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Visão geral" },
  { href: "/admin/desafios", label: "Desafios" },
  { href: "/admin/temas", label: "Temas" },
  { href: "/admin/jogos", label: "Jogos" },
];

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-[1080px] px-4 pt-2 pb-16">
      <div className="mb-6 flex flex-wrap items-center gap-2 border-b-2 border-[var(--line)] pb-3">
        <span className="font-display mr-2 text-lg font-black">Painel</span>
        <nav className="flex flex-wrap gap-1" aria-label="Painel">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-xl px-3 py-2 text-[15px] font-semibold text-[var(--fg-2)] hover:bg-black/5 hover:text-[var(--fg)]">
              {n.label}
            </Link>
          ))}
        </nav>
        <form action={logoutAction} className="ml-auto">
          <button className="rounded-xl px-3 py-2 text-[15px] font-semibold text-[var(--fg-2)] hover:bg-black/5">Sair</button>
        </form>
      </div>
      {children}
    </div>
  );
}
