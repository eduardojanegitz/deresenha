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
    }
  });

  it("cada tema da Nota, da Mímica e do Quem Sou Eu? tem conteúdo suficiente para uma partida", () => {
    const count = (game: string, theme: string) => CHALLENGES.filter((c) => c.game === game && c.theme === theme).length;
    for (const t of ["brasilidades", "familia", "role", "perrengue", "infancia", "internet", "festas", "praia"]) {
      expect(count("nota", t), `nota ${t}`).toBeGreaterThanOrEqual(8);
    }
    for (const t of ["brasilidades", "role", "perrengue", "tipos", "infancia", "festas", "praia"]) {
      expect(count("mimica", t), `mímica ${t}`).toBeGreaterThanOrEqual(8);
    }
    for (const t of ["tipos", "tv", "brasilidades", "festas", "infancia", "internet", "praia"]) {
      expect(count("quem-sou-eu", t), `quem ${t}`).toBeGreaterThanOrEqual(10);
    }
  });
});
