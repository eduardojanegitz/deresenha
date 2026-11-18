import { describe, expect, it } from "vitest";
import { challengesFor, themesFor } from "@/content/library";
import { RuleError, seeded } from "@/engine/core";
import type { InfiltradoState } from "@/engine/infiltrado";
import type { NotaState } from "@/engine/nota";
import type { PrefereState } from "@/engine/prefere";
import type { LimiteState } from "@/engine/limite";
import type { MentiraState } from "@/engine/mentira";
import type { QuizState } from "@/engine/quiz";
import { createRoomState, HOST_STALE_MS, joinRoom, reduceRoom, rejoinRoom, viewRoom, type RoomAction, type RoomCtx, type RoomState } from "./room";

const pools = { nota: challengesFor("nota"), infiltrado: challengesFor("infiltrado"), quiz: challengesFor("quiz"), prefere: challengesFor("voce-prefere"), limite: challengesFor("limite"), mentira: challengesFor("mentira") };
const ids = (g: Parameters<typeof themesFor>[0]) => themesFor(g).map((t) => t.id);
const themes = { nota: ids("nota"), infiltrado: ids("infiltrado"), quiz: ids("quiz"), "voce-prefere": ids("voce-prefere"), limite: ids("limite"), mentira: ids("mentira") };
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

describe("Quiz Relâmpago em sala", () => {
  const quiz = (s: RoomState) => s.match!.state as QuizState;
  const start = () => {
    let s = act(lobby(3), "a", { type: "set-game", game: "quiz" });
    s = act(s, "a", { type: "configure", quiz: { questions: 3, seconds: 10 } });
    return act(s, "a", { type: "start" });
  };

  it("mede o tempo no servidor, esconde a certa e fecha quando todos respondem", () => {
    let s = start();
    expect(s.deadline).toBe(clock + 10_000 + 1_500);
    const right = quiz(s).question.answer;
    s = act(s, "b", { type: "game", action: { type: "answer", choice: right } }, { now: clock + 2_000 });
    const peek = viewRoom(s, "c", presence, clock + 2_000);
    expect(peek.match?.game === "quiz" && peek.match.state.question.answer).toBeNull();
    expect(peek.match?.game === "quiz" && peek.match.state.answered).toEqual(["b"]);
    expect(JSON.stringify(peek)).not.toContain('"ms":2000');
    s = act(s, "c", { type: "game", action: { type: "answer", choice: (right + 1) % 4 } }, { now: clock + 3_000 });
    s = act(s, "a", { type: "game", action: { type: "answer", choice: right } }, { now: clock + 5_000 });
    expect(quiz(s).phase).toBe("reveal");
    expect(s.deadline).toBeNull();
    expect(quiz(s).gained).toEqual({ a: 150, b: 180, c: 0 });
  });

  it("o tempo esgotado fecha a pergunta e quem saiu não trava", () => {
    let s = start();
    expect(() => act(s, "b", { type: "time-up" })).toThrow(/ainda não acabou/);
    s = act(s, "c", { type: "leave" });
    s = act(s, "a", { type: "game", action: { type: "answer", choice: 0 } });
    expect(quiz(s).phase).toBe("question");
    s = act(s, "b", { type: "time-up" }, { now: s.deadline! });
    expect(quiz(s).phase).toBe("reveal");
    expect(() => act(s, "b", { type: "game", action: { type: "next" } })).toThrow(/Só quem comanda/);
    s = act(s, "a", { type: "game", action: { type: "next" } }, { now: clock + 20_000 });
    expect(quiz(s).index).toBe(2);
    expect(s.deadline).toBe(clock + 20_000 + 11_500);
  });

  it("valida a configuração do quiz", () => {
    const s = act(lobby(3), "a", { type: "set-game", game: "quiz" });
    expect(() => act(s, "a", { type: "configure", quiz: { seconds: 7 } })).toThrow(/Tempo por pergunta/);
    expect(() => act(s, "a", { type: "configure", quiz: { questions: 50 } })).toThrow(/3 a 20/);
  });
});

describe("Você Prefere? em sala", () => {
  const pref = (s: RoomState) => s.match!.state as PrefereState;
  const start = () => act(act(lobby(3), "a", { type: "set-game", game: "voce-prefere" }), "a", { type: "start" });

  it("abre a votação junto com o dilema e esconde as escolhas até todos escolherem", () => {
    let s = start();
    expect(pref(s).phase).toBe("vote");
    s = act(s, "b", { type: "game", action: { type: "choose", choice: "a" } });
    s = act(s, "b", { type: "game", action: { type: "choose", choice: "b" } });
    const peek = viewRoom(s, "c", presence, clock);
    expect(peek.match?.game === "voce-prefere" && peek.match.state.votes).toBeNull();
    expect(peek.match?.game === "voce-prefere" && peek.match.state.voted).toEqual(["b"]);
    expect(JSON.stringify(peek.match)).not.toContain('"b":"b"');
    s = act(s, "a", { type: "game", action: { type: "choose", choice: "b" } });
    s = act(s, "c", { type: "game", action: { type: "choose", choice: "a" } });
    expect(pref(s).phase).toBe("reveal");
    expect(pref(s).history[0]).toMatchObject({ countA: 1, countB: 2 });
  });

  it("só o anfitrião troca, revela e avança; quem saiu não trava", () => {
    let s = start();
    expect(() => act(s, "b", { type: "game", action: { type: "swap" } })).toThrow(/Só quem comanda/);
    s = act(s, "a", { type: "game", action: { type: "swap" } });
    s = act(s, "c", { type: "leave" });
    s = act(s, "a", { type: "game", action: { type: "choose", choice: "a" } });
    expect(pref(s).phase).toBe("vote");
    s = act(s, "b", { type: "game", action: { type: "choose", choice: "a" } });
    expect(pref(s).phase).toBe("reveal");
    s = act(s, "a", { type: "game", action: { type: "next" } });
    expect(pref(s).phase).toBe("vote");
    expect(pref(s).round).toBe(2);
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

describe("Jogo do Limite em sala", () => {
  const lim = (s: RoomState) => s.match!.state as LimiteState;
  it("cada um chuta no próprio celular e revela sozinho quando todos chutam", () => {
    let s = act(lobby(3), "a", { type: "set-game", game: "limite" });
    s = act(s, "a", { type: "configure", limite: { rounds: 2 } });
    s = act(s, "a", { type: "start" });
    expect(lim(s).phase).toBe("guess");
    const answer = lim(s).item.answer;
    s = act(s, "b", { type: "game", action: { type: "guess", value: answer } });
    const peek = viewRoom(s, "c", presence, clock);
    expect(peek.match?.game === "limite" && peek.match.state.item.answer).toBeNull();
    expect(peek.match?.game === "limite" && peek.match.state.guesses).toBeNull();
    expect(() => act(s, "b", { type: "game", action: { type: "reveal" } })).toThrow(RuleError);
    s = act(s, "a", { type: "game", action: { type: "guess", value: answer * 3 } });
    s = act(s, "c", { type: "game", action: { type: "guess", value: answer * 10 } });
    expect(lim(s).phase).toBe("reveal");
    expect(lim(s).winners).toEqual(["b"]);
    expect(lim(s).gained.b).toBe(4);
    s = act(s, "a", { type: "game", action: { type: "next" } });
    expect(lim(s).round).toBe(2);
  });

  it("quem saiu não trava a revelação e o anfitrião pode revelar antes", () => {
    let s = act(lobby(3), "a", { type: "set-game", game: "limite" });
    s = act(s, "a", { type: "start" });
    s = act(s, "a", { type: "game", action: { type: "guess", value: 1 } });
    s = act(s, "b", { type: "game", action: { type: "guess", value: 2 } });
    s = act(s, "c", { type: "leave" });
    expect(lim(s).phase).toBe("reveal");
    let t = act(lobby(3), "a", { type: "set-game", game: "limite" });
    t = act(t, "a", { type: "start" });
    t = act(t, "b", { type: "game", action: { type: "guess", value: 5 } });
    t = act(t, "a", { type: "game", action: { type: "reveal" } });
    expect(lim(t).phase).toBe("reveal");
  });

  it("a revanche na mesma sala não repete as perguntas da partida anterior", () => {
    let s = act(lobby(3), "a", { type: "set-game", game: "limite" });
    s = act(s, "a", { type: "configure", limite: { rounds: 5 } });
    s = act(s, "a", { type: "start" });
    const first = [...lim(s).used];
    s = act(s, "a", { type: "back-to-lobby" });
    expect(s.seen?.limite).toEqual(first);
    for (const id of ["b", "c"]) s = act(s, id, { type: "set-ready", ready: true });
    s = act(s, "a", { type: "start" });
    expect(first).not.toContain(lim(s).item.id);
    expect(lim(s).used.slice(0, first.length)).toEqual(first);
  });
});

describe("Mentira Sincera em sala", () => {
  const men = (s: RoomState) => s.match!.state as MentiraState;
  it("só quem conta vê a missão, a turma vota no próprio celular e revela sozinho", () => {
    let s = act(lobby(4), "a", { type: "set-game", game: "mentira" });
    s = act(s, "a", { type: "start" });
    const teller = men(s).tellerId;
    const voters = IDS.slice(0, 4).filter((id) => id !== teller);
    expect(() => act(s, voters[0]!, { type: "game", action: { type: "start-telling" } })).toThrow(RuleError);
    const peek = viewRoom(s, voters[0]!, presence, clock);
    expect(peek.match?.game === "mentira" && peek.match.state.truth).toBeNull();
    s = act(s, teller, { type: "game", action: { type: "seen" } });
    s = act(s, teller, { type: "game", action: { type: "start-telling" } });
    s = act(s, teller, { type: "game", action: { type: "open-vote" } });
    for (const v of voters) s = act(s, v, { type: "game", action: { type: "choose", choice: "verdade" } });
    expect(men(s).phase).toBe("reveal");
    const right = men(s).truth;
    expect(men(s).gained[teller]).toBe(right ? 0 : 3);
  });

  it("se quem conta sai, a vez dele termina sem pontos", () => {
    let s = act(lobby(4), "a", { type: "set-game", game: "mentira" });
    s = act(s, "a", { type: "start" });
    const teller = men(s).tellerId;
    s = act(s, teller, { type: "leave" });
    expect(men(s).phase).toBe("reveal");
    const host = s.hostId;
    s = act(s, host, { type: "game", action: { type: "next" } });
    expect(men(s).round).toBe(2);
  });
});
