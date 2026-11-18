// Gera um par de chaves VAPID para os avisos (notificação push) do Modo Sala.
// Uso: npm run push:keys            (mostra as chaves para colar na Vercel)
//      npm run push:keys -- --env   (grava direto no .env local, sem mostrar)
import { appendFileSync, readFileSync } from "node:fs";
import webpush from "web-push";

const { publicKey, privateKey } = webpush.generateVAPIDKeys();
const lines = [`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}`, `VAPID_PRIVATE_KEY=${privateKey}`, "VAPID_SUBJECT=mailto:troque-pelo-seu-email@exemplo.com"];

if (process.argv.includes("--env")) {
  let current = "";
  try {
    current = readFileSync(".env", "utf8");
  } catch {}
  if (current.includes("VAPID_PRIVATE_KEY=")) {
    console.log("O .env já tem chaves VAPID. Nada foi alterado.");
  } else {
    appendFileSync(".env", `${current.endsWith("\n") || !current ? "" : "\n"}\n# Avisos do Modo Sala (npm run push:keys)\n${lines.join("\n")}\n`);
    console.log("Chaves gravadas no .env. Reinicie o npm run dev.");
  }
} else {
  console.log("Cole estas três variáveis na Vercel (Settings → Environment Variables):\n");
  console.log(lines.join("\n"));
  console.log("\nTroque o VAPID_SUBJECT por um e-mail seu. A chave privada não deve ir para o GitHub.");
}
