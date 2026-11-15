import type { Metadata, Viewport } from "next";
import { M_PLUS_Rounded_1c, Onest } from "next/font/google";
import { SoundProvider } from "@/ui/sound";
import { TopBar } from "@/ui/TopBar";
import "./globals.css";

const rounded = M_PLUS_Rounded_1c({ weight: ["500", "700", "800", "900"], subsets: ["latin", "latin-ext"], variable: "--font-rounded", display: "swap" });
const onest = Onest({ subsets: ["latin", "latin-ext"], variable: "--font-onest", display: "swap" });

export const metadata: Metadata = {
  title: { default: "DeResenha", template: "%s · DeResenha" },
  description: "Jogos para a turma reunida. Escolhe o jogo, coloca os nomes e começa. Sem cadastro.",
  applicationName: "DeResenha",
  appleWebApp: { capable: true, title: "DeResenha", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#0F6B52",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${rounded.variable} ${onest.variable}`}>
      <body>
        <SoundProvider>
          <TopBar />
          <main id="conteudo">{children}</main>
        </SoundProvider>
      </body>
    </html>
  );
}
