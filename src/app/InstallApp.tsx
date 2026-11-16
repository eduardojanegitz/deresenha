"use client";

import { useState } from "react";
import { Piece } from "@/brand/Piece";
import { useInstall, type InstallPlatform } from "@/ui/install";
import { Sheet } from "@/ui/play";

/**
 * Faixa "Leve o DeResenha no celular". No Chrome do Android abre o pedido de instalação do
 * próprio navegador; no iPhone (que não deixa o site instalar sozinho) mostra o passo a passo
 * do Safari. Some quando o DeResenha já está aberto como app.
 */
export function InstallApp() {
  const { platform, canPrompt, justInstalled, prompt } = useInstall();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  if (platform === "standalone") return null;
  const installed = done || justInstalled;
  const onPhone = platform !== "desktop" && platform !== null;

  const onClick = async () => {
    if (canPrompt && platform !== "desktop") {
      if (await prompt()) setDone(true);
      return;
    }
    setOpen(true);
  };

  return (
    <section aria-labelledby="instalar-titulo" className="card grid items-center gap-5 overflow-hidden rounded-[28px] bg-[var(--color-feltro)] px-5 py-6 text-white sm:grid-cols-[auto_1fr_auto] sm:gap-7 sm:px-8">
      <HomeScreen />
      <div className="grid gap-1.5">
        <h2 id="instalar-titulo" className="text-[26px] leading-tight font-black">
          {installed ? "Pronto, já está no seu celular" : "Leve o DeResenha no celular"}
        </h2>
        <p className="max-w-[46ch] text-[17px] leading-snug text-white/85">
          {installed
            ? "Procure o ícone do DeResenha na tela inicial. Ele abre em tela cheia, como um app."
            : "Fica na tela inicial como um app e abre em tela cheia, sem a barra do navegador. Não ocupa espaço e não precisa de loja."}
        </p>
      </div>
      {!installed && (
        <button type="button" onClick={onClick} className="btn btn-gema sm:w-auto sm:min-w-[230px]">
          <PhoneArrow />
          {onPhone || platform === null ? "Instalar no celular" : "Como instalar no celular"}
        </button>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={sheetTitle(platform)} piece={<Piece kind="meialua" mood="happy" size={44} />}>
        <Steps platform={platform} />
        <button type="button" className="btn mt-1" onClick={() => setOpen(false)}>
          Entendi
        </button>
      </Sheet>
    </section>
  );
}

function sheetTitle(p: InstallPlatform | null) {
  if (p === "ios" || p === "ios-other") return "Instalar no iPhone";
  if (p === "ios-inapp") return "Abra no Safari primeiro";
  if (p === "android") return "Instalar no Android";
  return "Instalar no celular";
}

function Steps({ platform }: { platform: InstallPlatform | null }) {
  if (platform === "ios") return <IosSteps />;
  if (platform === "ios-other") return <IosSteps where="ao lado do endereço, no alto da tela" />;
  if (platform === "ios-inapp") return <InAppSteps />;
  if (platform === "android") return <AndroidSteps />;
  return <DesktopSteps />;
}

function IosSteps({ where = "na barra do Safari" }: { where?: string }) {
  return (
    <ol className="grid gap-3">
      <Step n={1}>
        Toque em <b>Compartilhar</b> <ShareIcon /> {where}. Se ele não aparecer, toque antes em <b>•••</b>.
      </Step>
      <Step n={2}>
        Role a lista e toque em <b>Adicionar à Tela de Início</b> <PlusSquareIcon />.
      </Step>
      <Step n={3}>
        Toque em <b>Adicionar</b>. O ícone do DeResenha aparece na sua tela inicial.
      </Step>
    </ol>
  );
}

function AndroidSteps() {
  return (
    <ol className="grid gap-3">
      <Step n={1}>
        Toque no menu <b>⋮</b> do navegador, no canto de cima.
      </Step>
      <Step n={2}>
        Toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.
      </Step>
      <Step n={3}>Confirme. O ícone do DeResenha aparece junto dos seus apps.</Step>
    </ol>
  );
}

function InAppSteps() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <>
      <p className="muted">Você abriu o DeResenha dentro de outro app (Instagram, WhatsApp…), e esse navegador não instala sites.</p>
      <ol className="grid gap-3">
        <Step n={1}>
          Toque em <b>•••</b> e escolha <b>Abrir no Safari</b>. Se não tiver essa opção, copie o endereço e cole no Safari.
        </Step>
        <Step n={2}>
          No Safari, toque em <b>Compartilhar</b> <ShareIcon /> e depois em <b>Adicionar à Tela de Início</b> <PlusSquareIcon />.
        </Step>
      </ol>
      <button type="button" className="btn btn-ghost btn-small" onClick={copy}>
        {copied ? "Endereço copiado" : "Copiar endereço"}
      </button>
    </>
  );
}

function DesktopSteps() {
  const host = typeof window === "undefined" ? "" : window.location.host;
  return (
    <>
      <p className="muted">
        Abra <b className="text-[var(--color-tinta)]">{host}</b> no navegador do celular e siga os passos.
      </p>
      <h3 className="mt-1 text-lg font-extrabold">No iPhone (Safari)</h3>
      <IosSteps />
      <h3 className="mt-1 text-lg font-extrabold">No Android (Chrome)</h3>
      <AndroidSteps />
    </>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[34px_1fr] items-start gap-3 text-[17px] leading-snug">
      <span className="num grid h-[34px] w-[34px] place-items-center rounded-full bg-[var(--color-gema)] text-lg text-[var(--color-tinta)]">{n}</span>
      <span className="pt-1">{children}</span>
    </li>
  );
}

/** Um pedaço de tela inicial com o ícone do DeResenha entre outros apps. */
function HomeScreen() {
  return (
    <div aria-hidden="true" className="mx-auto h-[132px] w-[120px] rounded-t-[30px] border-[5px] border-b-0 border-[#062a20] bg-[#0a4f3c] px-3 pt-4 sm:mx-0">
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <i key={i} className="block aspect-square rounded-[9px] bg-white/15" />
        ))}
        <img src="/icon-192.png" alt="" width={56} height={56} className="col-span-2 row-span-2 aspect-square w-full rounded-[14px] shadow-[0_4px_0_#062a20]" />
        <i className="block aspect-square rounded-[9px] bg-white/15" />
      </div>
    </div>
  );
}

const svgBase = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2.2, "aria-hidden": true } as const;

const ShareIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...svgBase} className="inline -translate-y-0.5 text-[#007aff]">
    <path d="M12 3v12M7.5 7.5L12 3l4.5 4.5M7 11H5.5v10h13V11H17" />
  </svg>
);

const PlusSquareIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...svgBase} className="inline -translate-y-0.5">
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);

const PhoneArrow = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" {...svgBase}>
    <rect x="6" y="2.5" width="12" height="19" rx="3" />
    <path d="M12 7v7M9 11l3 3 3-3" />
  </svg>
);
