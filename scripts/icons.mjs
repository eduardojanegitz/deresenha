// Gera os ícones do app (src/app/icon.svg, public/icon-maskable.svg e os PNGs) a partir do monograma
// do letreiro. As constantes repetem src/brand/letreiro.ts: se mudar lá, mude aqui e rode
//   node scripts/icons.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const WORD = JSON.parse(readFileSync(new URL("../src/brand/wordmark-glyphs.json", import.meta.url), "utf8"));
const [D, , R] = WORD.letters;
const COLORS = { face: "#fff3d6", d: "#ffc23d", line: "#0b3b2e", eye: "#0b3b2e" };
const LINE = 9;
const DEPTH = 9;
const SLANT = 0.8;
const EYES = { cx: 52, cy: 47, gap: 19, w: 8.5, h: 21 };
const OVERLAP = 12;

const R_SHIFT = D.x + D.bbox[2] - OVERLAP - (R.x + R.bbox[0]);
const left = D.x + D.bbox[0] - LINE;
const right = R.x + R.bbox[2] + R_SHIFT + LINE + DEPTH * SLANT;
const top = Math.min(D.bbox[1], R.bbox[1]) - LINE;
const bottom = 100 + LINE + DEPTH;

/** Monograma colorido cabendo numa caixa de `size` centrada em (cx, cy). */
function monogram(cx, cy, size, shadow) {
  const w = right - left;
  const h = bottom - top;
  const k = size / Math.max(w, h);
  const tx = cx - (left + w / 2) * k;
  const ty = cy - (top + h / 2) * k;
  const at = (l, dx = 0, dy = 0) => `translate(${(l.x + dx).toFixed(2)} ${dy})`;
  let s = `<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${k.toFixed(4)})" stroke-linejoin="round" stroke-width="${LINE * 2}">`;
  for (const l of [R, D]) for (let i = 1; i <= DEPTH; i++) s += `<path d="${l.d}" transform="${at(l, (l === R ? R_SHIFT : 0) + i * SLANT, i)}" fill="${shadow}" stroke="${shadow}"/>`;
  s += `<path d="${R.d}" transform="${at(R, R_SHIFT)}" fill="${COLORS.face}" stroke="${COLORS.line}" paint-order="stroke"/>`;
  s += `<path d="${D.d}" transform="${at(D)}" fill="${COLORS.d}" stroke="${COLORS.line}" paint-order="stroke"/>`;
  for (const sgn of [-1, 1]) s += `<rect x="${(D.x + EYES.cx + (sgn * EYES.gap) / 2 - EYES.w / 2).toFixed(2)}" y="${EYES.cy - EYES.h / 2}" width="${EYES.w}" height="${EYES.h}" rx="${EYES.w / 2}" fill="${COLORS.eye}"/>`;
  return s + "</g>";
}

const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">${body}</svg>\n`;
// Ícone comum: quadrado arredondado verde-feltro.
writeFileSync(new URL("../src/app/icon.svg", import.meta.url), svg(`<rect width="160" height="160" rx="40" fill="#0F6B52"/>${monogram(80, 80, 118, "#062a20")}`));
// Ícone "maskable": fundo cheio e o desenho dentro da zona segura (80% central).
writeFileSync(new URL("../public/icon-maskable.svg", import.meta.url), svg(`<rect width="160" height="160" fill="#0F6B52"/>${monogram(80, 80, 92, "#062a20")}`));
// PNGs: o iPhone só aceita PNG no ícone da tela inicial, e o Android pede 192 e 512 px
// para oferecer a instalação. O iOS arredonda os cantos sozinho, então lá vai o quadrado cheio.
const sharp = (await import("sharp")).default;
const full = svg(`<rect width="160" height="160" fill="#0F6B52"/>${monogram(80, 80, 118, "#062a20")}`);
const safe = svg(`<rect width="160" height="160" fill="#0F6B52"/>${monogram(80, 80, 92, "#062a20")}`);
const png = (src, size, out) => sharp(Buffer.from(src), { density: (72 * size) / 160 }).resize(size, size).png().toFile(fileURLToPath(new URL(out, import.meta.url)));
await Promise.all([
  png(full, 180, "../src/app/apple-icon.png"),
  png(full, 192, "../public/icon-192.png"),
  png(full, 512, "../public/icon-512.png"),
  png(safe, 512, "../public/icon-maskable-512.png"),
]);
console.log("ícones gerados");
