// Gera as variáveis do painel administrativo. A senha nunca é gravada, só o hash.
// Uso: npm run admin:password
// Depois copie as duas linhas impressas para o .env (local) e para as variáveis da Vercel.
import { randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline";

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
const ask = (q) => new Promise((res) => rl.question(q, res));
// Esconde o que é digitado.
rl._writeToOutput = function (s) {
  if (rl.stdoutMuted && !s.includes("\n")) rl.output.write("*");
  else rl.output.write(s);
};

rl.stdoutMuted = true;
const a = await ask("Senha do painel (mínimo 12 caracteres): ");
rl.output.write("\n");
const b = await ask("Repita a senha: ");
rl.output.write("\n");
rl.close();

if (a !== b) {
  console.error("As senhas não conferem.");
  process.exit(1);
}
if (a.length < 12) {
  console.error("Use pelo menos 12 caracteres.");
  process.exit(1);
}
const N = 2 ** 15;
const salt = randomBytes(16);
const hash = scryptSync(a, salt, 32, { N, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
console.log("\nCopie para o .env:\n");
console.log(`ADMIN_PASSWORD_HASH="${["scrypt", N, 8, 1, salt.toString("base64url"), hash.toString("base64url")].join(":")}"`);
console.log(`ADMIN_SESSION_SECRET="${randomBytes(32).toString("base64url")}"`);
