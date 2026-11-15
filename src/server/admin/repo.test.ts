import { describe, expect, it } from "vitest";
import { challengeSchema, themeSchema } from "./repo";

const base = { theme: "comida", difficulty: "medio", minAge: "", status: "published" };

describe("validação de desafios do painel", () => {
  it("aceita cada formato de jogo e normaliza o conteúdo", () => {
    expect(challengeSchema.parse({ ...base, game: "nota", kind: "secreta", text: "  Recheios de pastel " }).data).toEqual({ kind: "secreta", text: "Recheios de pastel" });
    expect(challengeSchema.parse({ ...base, game: "infiltrado", major: "Praia", impostor: "Piscina" }).data).toEqual({ major: "Praia", impostor: "Piscina" });
    const r = challengeSchema.parse({ ...base, game: "ranking", title: "Melhores sorvetes", items: "a\nb\n\nc\nd\ne" });
    expect(r.data).toEqual({ title: "Melhores sorvetes", items: ["a", "b", "c", "d", "e"] });
    expect(challengeSchema.parse({ ...base, game: "mimica", text: "Gato", minAge: "12" }).minAge).toBe(12);
  });

  it("recusa conteúdo inválido com mensagem clara", () => {
    const err = (v: object) => challengeSchema.safeParse({ ...base, ...v }).error?.issues[0]?.message;
    expect(err({ game: "nota", text: "Ok sem modo" })).toMatch(/Nota Secreta ou Avaliação/);
    expect(err({ game: "infiltrado", major: "Praia", impostor: "praia" })).toMatch(/diferentes/);
    expect(err({ game: "ranking", title: "Curto demais", items: "a\nb" })).toMatch(/pelo menos 5/);
    expect(err({ game: "ranking", title: "Repetidos", items: "a\nA\nb\nc\nd" })).toMatch(/repetidos/);
    expect(err({ game: "mimica", text: "" })).toMatch(/pelo menos 1/);
    expect(challengeSchema.safeParse({ ...base, game: "jogo-falso", text: "x" }).success).toBe(false);
  });

  it("identificador de tema só com letras minúsculas, números e hífen", () => {
    expect(themeSchema.parse({ id: "Viagem-2026", label: "Viagem" }).id).toBe("viagem-2026");
    expect(themeSchema.safeParse({ id: "com espaço", label: "X Y" }).success).toBe(false);
  });
});
