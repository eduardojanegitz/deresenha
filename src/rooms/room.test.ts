import { describe, expect, it } from "vitest";
import { challengesFor, themesFor } from "@/content/library";
import { RuleError, seeded } from "@/engine/core";
import type { InfiltradoState } from "@/engine/infiltrado";
import type { NotaState } from "@/engine/nota";
import { createRoomState, HOST_STALE_MS, joinRoom, reduceRoom, rejoinRoom, viewRoom, type RoomAction, type RoomCtx, type RoomState } from "./room";

const pools = { nota: challengesFor("nota"), infiltrado: challengesFor("infiltrado") };
const themes = { nota: themesFor("nota").map((t) => t.id), infiltrado: themesFor("infiltrado").map((t) => t.id) };
const clock = 1_000_000;
const IDS = ["a", "b", "c", "d", "e"];
const presence = Object.fromEntries(IDS.map((id) => [id, clock]));
const ctx = (over: Partial<RoomCtx> = {}): RoomCtx => ({ now: clock, rng: seeded(7), pools, presence, ...over });

function lobby(n = 4): RoomState {
  let s = createRoomState("ABCD", { id: "a", nickname: "Ana", piece: "bolota" }, clock, themes);
  const extra = [
    { id: "b", nickname: "Beto", piece: "tijolo" as const },
    { id: "c", nickname: "Caio", piece: "pino" as const },
    { id: "d", nickname: "Duda", piece: "meialua" as const },
    { id: "e", nickname: "Eli", piece: "capsula" as const },
  ];
  extra.slice(0, n - 1).forEach((p) => (s = joinRoom(s, p, clock)));
  return s;
}
const act = (s: RoomState, who: string, a: RoomAction, c: Partial<RoomCtx> = {}) => reduceRoom(s, who, a, ctx(c));
const nota = (s: RoomState) => s.match!.state as NotaState;
const inf = (s: RoomState) => s.match!.state as InfiltradoState;

describe("entrada", () => {
  it("recusa apelido repetido e entrada depois do início", () => {
    const s = lobby(3);
    expect(() => joinRoom(s, { id: "x", nickname: " beto ", piece: "capsula" }, clock)).toThrow(/Já tem alguém chamado Beto/);
    const playing = act(s, "a", { type: "start" });
    expect(() => joinRoom(playing, { id: "x", nickname: "Zé", piece: "capsula" }, clock)).toThrow(/já começou/);
  });

  it("quem caiu volta para a mesma partida com a mesma identidade", () => {
    let s = act(lobby(4), "a", { type: "start" });
    s = act(s, "c", { type: "leave" });
    expect(s.players.find((p) => p.id === "c")?.left).toBe(true);
    s = rejoinRoom(s, "c");
    expect(s.players.find((p) => p.id === "c")?.left).toBe(false);
  });
});

describe("permissões", () => {
  it("só o anfitrião configura, troca de jogo e começa", () => {
    const s = lobby(3);
    expect(() => act(s, "b", { type: "start" })).toThrow(/Só quem comanda/);
    expect(() => act(s, "b", { type: "set-game", game: "infiltrado" })).toThrow(/Só quem comanda/);
    expect(act(s, "a", { type: "configure", config: { rounds: 2 } }).config.nota.rounds).toBe(2);
  });

  it("cada um registra só o próprio palpite, e quem pensa não chuta", () => {
    let s = act(lobby(4), "a", { type: "start" });
    s = act(s, "a", { type: "game", action: { type: "begin-round" } });
    const teller = nota(s).tellerId!;
    s = act(s, teller, { type: "game", action: { type: "answered" } });
    expect(() => act(s, teller, { type: "game", action: { type: "guess", value: 3 } })).toThrow(/não chuta/);
    const other = IDS.slice(0, 4).find((id) => id !== teller)!;
    s = act(s, other, { type: "game", action: { type: "guess", value: 3 } });
    expect(Object.keys(nota(s).guesses)).toEqual([other]);
  });
});

describe("Jogo da Nota em sala", () => {
  it("fecha sozinho quando todos os presentes chutam e só mostra a nota para quem pensa", () => {
    let s = act(lobby(4), "a", { type: "start" });
    s = act(s, "a", { type: "game", action: { type: "begin-round" } });
    expect(nota(s).phase).toBe("answer");
    const teller = nota(s).tellerId!;
    const others = IDS.slice(0, 4).filter((id) => id !== teller);
    const v1 = viewRoom(s, others[0]!, presence, clock);
    expect(v1.match?.game === "nota" && v1.match.state.secret).toBeNull();
    const vt = viewRoom(s, teller, presence, clock);
    expect(vt.match?.game === "nota" && vt.match.state.secret).toBe(nota(s).secret);
    expect(JSON.stringify(v1)).not.toMatch(/"secret":\d/);

    s = act(s, teller, { type: "game", action: { type: "answered" } });
    s = act(s, others[0]!, { type: "game", action: { type: "guess", value: 5 } });
    const v2 = viewRoom(s, others[1]!, presence, clock);
    expect(v2.match?.game === "nota" && v2.match.state.guesses).toEqual({});
    expect(v2.match?.game === "nota" && v2.match.answered).toEqual([others[0]]);
    s = act(s, others[2]!, { type: "leave" });
    s = act(s, others[1]!, { type: "game", action: { type: "guess", value: 6 } });
    expect(nota(s).phase).toBe("reveal");
  });

  it("o tempo só acaba quando o servidor diz que acabou", () => {
    let s = act(lobby(3), "a", { type: "configure", config: { timerSec: 30 } });
    s = act(s, "a", { type: "start" });
    s = act(s, "a", { type: "game", action: { type: "begin-round" } });
    expect(s.deadline).toBe(clock + 30_000);
    expect(() => act(s, "b", { type: "time-up" })).toThrow(/ainda não acabou/);
    s = act(s, "b", { type: "time-up" }, { now: clock + 30_001 });
    expect(nota(s).phase).toBe("guess");
  });

  it("termina a partida e volta ao lobby para a revanche", () => {
    let s = act(lobby(2), "a", { type: "configure", config: { mode: "avaliacao", rounds: 1 } });
    s = act(s, "a", { type: "start" });
    s = act(s, "a", { type: "game", action: { type: "begin-round" } });
    s = act(s, "a", { type: "game", action: { type: "guess", value: 4 } });
    s = act(s, "b", { type: "game", action: { type: "guess", value: 8 } });
    expect(nota(s).phase).toBe("reveal");
    s = act(s, "a", { type: "game", action: { type: "next" } });
    expect(s.status).toBe("ended");
    s = act(s, "a", { type: "back-to-lobby" });
    expect(s.status).toBe("lobby");
    expect(s.match).toBeNull();
  });
});

describe("Infiltrado em sala", () => {
  const start = (n = 5) => {
    let s = act(lobby(n), "a", { type: "set-game", game: "infiltrado" });
    s = act(s, "a", { type: "start" });
    return s;
  };

  it("exige 4 pessoas", () => {
    const s = act(lobby(3), "a", { type: "set-game", game: "infiltrado" });
    expect(() => act(s, "a", { type: "start" })).toThrow(/pelo menos 4/);
  });

  it("cada celular recebe só a própria palavra; nada revela o infiltrado antes da hora", () => {
    const s = start();
    const m = inf(s);
    for (const id of IDS) {
      const v = viewRoom(s, id, presence, clock);
      const json = JSON.stringify(v);
      const mine = id === m.impostorId ? m.pair.impostor : m.pair.major;
      const other = id === m.impostorId ? m.pair.major : m.pair.impostor;
      expect(v.match?.game === "infiltrado" && v.match.state.myWord).toBe(mine);
      expect(json).not.toContain(`"${other}"`);
      expect(v.match?.game === "infiltrado" && v.match.state.impostorId).toBeNull();
    }
  });

  it("vai para as dicas quando todos viram, e quem saiu não trava", () => {
    let s = start();
    for (const id of ["a", "b", "c"]) s = act(s, id, { type: "game", action: { type: "seen" } });
    expect(inf(s).phase).toBe("distribute");
    s = act(s, "e", { type: "leave" });
    s = act(s, "d", { type: "game", action: { type: "seen" } });
    expect(inf(s).phase).toBe("hints");
  });

  it("cada um vota por si, voto não aparece para os outros e a apuração é automática", () => {
    let s = start();
    for (const id of IDS) s = act(s, id, { type: "game", action: { type: "seen" } });
    expect(() => act(s, "b", { type: "game", action: { type: "open-vote" } })).toThrow(/Só quem comanda/);
    s = act(s, "a", { type: "game", action: { type: "open-vote" } });
    const imp = inf(s).impostorId;
    const scapegoat = IDS.find((id) => id !== imp)!;
    s = act(s, IDS.find((id) => id !== imp)!, { type: "game", action: { type: "vote", targetId: imp } });
    const peek = viewRoom(s, imp, presence, clock);
    expect(peek.match?.game === "infiltrado" && peek.match.state.votes).toEqual({});
    expect(peek.match?.game === "infiltrado" && peek.match.state.voted).toHaveLength(1);
    for (const id of IDS) {
      if (inf(s).votes[id]) continue;
      s = act(s, id, { type: "game", action: { type: "vote", targetId: id === imp ? scapegoat : imp } });
    }
    expect(inf(s).phase).toBe("reveal");
    expect(inf(s).result?.caught).toBe(true);
    const after = viewRoom(s, "b", presence, clock);
    expect(after.match?.game === "infiltrado" && after.match.state.impostorId).toBe(imp);
  });
});

describe("anfitrião", () => {
  it("passa o comando quando o anfitrião sai", () => {
    expect(act(lobby(3), "a", { type: "leave" }).hostId).toBe("b");
  });

  it("outra pessoa só assume o comando se o anfitrião sumiu", () => {
    const s = lobby(3);
    expect(() => act(s, "b", { type: "claim-host" })).toThrow(/ainda está conectado/);
    const later = clock + HOST_STALE_MS + 1;
    expect(act(s, "b", { type: "claim-host" }, { now: later, presence: { a: clock, b: later, c: later } }).hostId).toBe("b");
  });

  it("sala vazia é encerrada e não aceita mais ações", () => {
    const s = act(lobby(1), "a", { type: "leave" });
    expect(s.status).toBe("closed");
    expect(() => joinRoom(s, { id: "z", nickname: "Zé", piece: "pino" }, clock)).toThrow(RuleError);
  });
});
