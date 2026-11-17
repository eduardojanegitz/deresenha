import { describe, expect, it } from "vitest";
import { CHALLENGES, THEMES } from "./library";

describe("conteúdo embutido", () => {
  it("cada desafio tem id único e um tema que existe", () => {
    const ids = CHALLENGES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    const themes = new Set(THEMES.map((t) => t.id));
    expect(CHALLENGES.filter((c) => !themes.has(c.theme)).map((c) => c.id)).toEqual([]);
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
  });

  it("textos cabem nos limites do painel administrativo", () => {
    for (const c of CHALLENGES) {
      if (c.game === "nota") expect(c.text.length, c.id).toBeLessThanOrEqual(140);
      if (c.game === "mimica") expect(c.text.length, c.id).toBeLessThanOrEqual(60);
      if (c.game === "quem-sou-eu") expect(c.name.length, c.id).toBeLessThanOrEqual(40);
      if (c.game === "quiz") {
        expect(c.question.length, c.id).toBeLessThanOrEqual(160);
        expect(c.options.length, c.id).toBeGreaterThanOrEqual(2);
        expect(c.options.length, c.id).toBeLessThanOrEqual(4);
        expect(c.options.every((o) => o.length <= 60), c.id).toBe(true);
        expect(new Set(c.options.map((o) => o.toLowerCase())).size, c.id).toBe(c.options.length);
      }
      if (c.game === "mentira") expect(c.text.length, c.id).toBeLessThanOrEqual(140);
      if (c.game === "limite") {
        expect(c.question.length, c.id).toBeLessThanOrEqual(200);
        expect(c.unit.length, c.id).toBeLessThanOrEqual(30);
        expect((c.fact ?? "").length, c.id).toBeLessThanOrEqual(200);
        expect(c.answer, c.id).toBeGreaterThan(0);
      }
    }
  });

  it("cada tema da Nota, da Mímica, do Quem Sou Eu? e do Limite tem conteúdo suficiente para uma partida", () => {
    const count = (game: string, theme: string) => CHALLENGES.filter((c) => c.game === game && c.theme === theme).length;
    for (const t of ["brasilidades", "familia", "role", "perrengue", "infancia", "internet", "festas", "praia"]) {
      expect(count("nota", t), `nota ${t}`).toBeGreaterThanOrEqual(8);
    }
    for (const t of ["brasilidades", "role", "perrengue", "tipos", "infancia", "festas", "praia"]) {
      expect(count("mimica", t), `mímica ${t}`).toBeGreaterThanOrEqual(8);
    }
    for (const t of ["recordes", "corpo", "bichos", "comilanca", "brasil-numeros", "espaco", "contas-da-vida", "mundo", "cultura-pop", "esportes", "tecnologia", "historia-absurda", "nojeira", "quanto-tempo", "fortunas"]) {
      expect(count("limite", t), `limite ${t}`).toBeGreaterThanOrEqual(8);
    }
    for (const t of ["micos", "confissoes", "role", "perrengue", "infancia", "familia", "amor", "trampo", "viagem"]) {
      expect(count("mentira", t), `mentira ${t}`).toBeGreaterThanOrEqual(8);
    }
    for (const t of ["tipos", "tv", "brasilidades", "festas", "infancia", "internet", "praia"]) {
      expect(count("quem-sou-eu", t), `quem ${t}`).toBeGreaterThanOrEqual(10);
    }
  });
});
