"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Monogram } from "@/brand/Monogram";
import { IconBack, IconSound } from "./Icons";
import { useSound } from "./sound";
// Carregado em toda página para guardar o aviso de instalação do Chrome assim que ele vier.
import "./install";

export function TopBar() {
  const path = usePathname();
  const router = useRouter();
  const { muted, toggle } = useSound();
  const nav = [
    { href: "/jogos", label: "Jogos" },
    { href: "/marca", label: "Marca" },
  ];
  const back = () => {
    if (window.history.length > 1) router.back();
    else router.push("/");
  };
  return (
    <header className="sticky top-0 z-20 flex items-center gap-1 bg-[var(--bg)] px-4 py-2.5 transition-colors" style={{ viewTransitionName: "topbar" }}>
      {path !== "/" && (
        <button onClick={back} className="grid size-11 place-items-center rounded-2xl hover:bg-black/5" aria-label="Voltar">
          <IconBack />
        </button>
      )}
      <Link href="/" className="flex items-center rounded-xl p-1" aria-label="DeResenha, início">
        <Monogram className="h-[34px] w-auto" />
      </Link>
      <nav className="ml-auto flex items-center gap-0.5" aria-label="Principal">
        {nav.map((n) => {
          const active = path.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-xl px-3 py-2.5 text-[15px] font-semibold hover:bg-black/5 ${active ? "text-[var(--fg)]" : "text-[var(--fg-2)]"}`}
            >
              {n.label}
            </Link>
          );
        })}
        <button onClick={toggle} className="grid size-11 place-items-center rounded-2xl text-[var(--fg-2)] hover:bg-black/5" aria-label={muted ? "Ligar sons" : "Silenciar sons"} aria-pressed={!muted}>
          <IconSound muted={muted} />
        </button>
      </nav>
    </header>
  );
}
