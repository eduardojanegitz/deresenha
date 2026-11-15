import { describe, expect, it } from "vitest";
import { challengesFor, themesFor } from "@/content/library";
import { RuleError, seeded } from "@/engine/core";
import { createRoomState, HOST_STALE_MS, joinRoom, reduceRoom, rejoinRoom, viewRoom, type RoomAction, type RoomCtx, type RoomState } from "./room";

const pool = challengesFor("nota");
const themes = themesFor("nota").map((t) => t.id);
let clock = 1_000_000;
const ctx = (over: Partial<RoomCtx> = {}): RoomCtx => ({ now: clock, rng: seeded(clock), pool, presence: { a: clock, b: clock, c: clock, d: clock }, ...over });

function lobby(n = 4): RoomState {
  let s = createRoomState("ABCD", { id: "a", nickname: "Ana", piece: "bolota" }, clock, themes);
  const extra = [
    { id: "b", nickname: "Beto", piece: "tijolo" as const },
    { id: "c", nickname: "Caio", piece: "pino" as const },
    { id: "d", nickname: "Duda", piece: "meialua" as const },
  ];
  extra.slice(0, n - 1).forEach((p) => (s = joinRoom(s, p, clock)));
  return s;
}
const act = (s: RoomState, who: string, a: RoomAction, c: Partial<RoomCtx> = {}) => reduceRoom(s, who, a, ctx(c));

describe("entrada", () => {
  it("recusa apelido repetido e entrada depois do início", () => {
    const s = lobby(3);
    expect(() => joinRoom(s, { id: "x", nickname: " beto ", piece: "capsula" }, clock)).toThrow(/Já tem alguém/);
    const playing = act(s, "a", { type: "start" });
    expect(() => joinRoom(playing, { id: "x", nickname: "Eli", piece: "capsula" }, clock)).toThrow(/já começou/);
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
  it("só o anfitrião configura e começa", () => {
    const s = lobby(3);
    expect(() => act(s, "b", { type: "start" })).toThrow(/Só quem comanda/);
    expect(() => act(s, "b", { type: "configure", config: { rounds: 2 } })).toThrow(/Só quem comanda/);
    expect(act(s, "a", { type: "configure", config: { rounds: 2 } }).config.rounds).toBe(2);
  });

  it("cada um registra só o próprio palpite, e quem pensa não chuta", () => {
    let s = act(lobby(4), "a", { type: "start" });
    s = act(s, "a", { type: "game", action: { type: "begin-round" } });
    const teller = s.match!.tellerId!;
    s = act(s, teller, { type: "game", action: { type: "answered" } });
    expect(() => act(s, teller, { type: "game", action: { type: "guess", value: 3 } })).toThrow(/não chuta/);
    const other = ["a", "b", "c", "d"].find((id) => id !== teller)!;
    s = act(s, other, { type: "game", action: { type: "guess", value: 3 } });
    expect(Object.keys(s.match!.guesses)).toEqual([other]);
  });
});

describe("rodada no Modo Sala", () => {
  it("fecha sozinho quando todos os presentes chutam e só mostra a nota para quem pensa", () => {
    let s = act(lobby(4), "a", { type: "start" });
    s = act(s, "a", { type: "game", action: { type: "begin-round" } });
    expect(s.match!.phase).toBe("answer");
    const teller = s.match!.tellerId!;
    const others = ["a", "b", "c", "d"].filter((id) => id !== teller);
    const v1 = viewRoom(s, others[0]!, ctx().presence, clock);
    expect(v1.match!.secret).toBeNull();
    expect(viewRoom(s, teller, ctx().presence, clock).match!.secret).toBe(s.match!.secret);
    expect(JSON.stringify(v1)).not.toMatch(/"secret":\d/);

    s = act(s, teller, { type: "game", action: { type: "answered" } });
    s = act(s, others[0]!, { type: "game", action: { type: "guess", value: 5 } });
    // palpites dos outros não aparecem para quem ainda não chutou
    expect(viewRoom(s, others[1]!, ctx().presence, clock).match!.guesses).toEqual({});
    expect(viewRoom(s, others[1]!, ctx().presence, clock).answered).toEqual([others[0]]);
    // um jogador sai: a rodada não fica presa esperando por ele
    s = act(s, others[2]!, { type: "leave" });
    s = act(s, others[1]!, { type: "game", action: { type: "guess", value: 6 } });
    expect(s.match!.phase).toBe("reveal");
  });

  it("o tempo só acaba quando o servidor diz que acabou", () => {
    let s = act(lobby(3), "a", { type: "configure", config: { timerSec: 30 } });
    s = act(s, "a", { type: "start" });
    s = act(s, "a", { type: "game", action: { type: "begin-round" } });
    expect(s.deadline).toBe(clock + 30_000);
    expect(() => act(s, "b", { type: "time-up" })).toThrow(/ainda não acabou/);
    s = act(s, "b", { type: "time-up" }, { now: clock + 30_001 });
    expect(s.match!.phase).toBe("guess");
  });

  it("termina a partida e volta ao lobby para a revanche", () => {
    let s = act(lobby(2), "a", { type: "configure", config: { mode: "avaliacao", rounds: 1 } });
    s = act(s, "a", { type: "start" });
    s = act(s, "a", { type: "game", action: { type: "begin-round" } });
    s = act(s, "a", { type: "game", action: { type: "guess", value: 4 } });
    s = act(s, "b", { type: "game", action: { type: "guess", value: 8 } });
    expect(s.match!.phase).toBe("reveal");
    s = act(s, "a", { type: "game", action: { type: "next" } });
    expect(s.status).toBe("ended");
    s = act(s, "a", { type: "back-to-lobby" });
    expect(s.status).toBe("lobby");
    expect(s.match).toBeNull();
  });
});

describe("anfitrião", () => {
  it("passa o comando quando o anfitrião sai", () => {
    const s = act(lobby(3), "a", { type: "leave" });
    expect(s.hostId).toBe("b");
  });

  it("outra pessoa só assume o comando se o anfitrião sumiu", () => {
    const s = lobby(3);
    expect(() => act(s, "b", { type: "claim-host" })).toThrow(/ainda está conectado/);
    const later = clock + HOST_STALE_MS + 1;
    const s2 = act(s, "b", { type: "claim-host" }, { now: later, presence: { a: clock, b: later, c: later } });
    expect(s2.hostId).toBe("b");
  });

  it("sala vazia é encerrada e não aceita mais ações", () => {
    let s = lobby(1);
    s = act(s, "a", { type: "leave" });
    expect(s.status).toBe("closed");
    expect(() => joinRoom(s, { id: "z", nickname: "Zé", piece: "pino" }, clock)).toThrow(RuleError);
  });
});
