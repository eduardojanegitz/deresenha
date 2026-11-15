import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";
import { RuleError, type PieceKind } from "@/engine/core";
import { createRoomState, joinRoom, reduceRoom, rejoinRoom, viewRoom, type RoomAction, type RoomState, type RoomView } from "@/rooms/room";
import { CODE_ALPHABET, CODE_LENGTH } from "@/rooms/schema";
import { contentFor } from "./content";
import { db } from "./db";

/**
 * Serviço do Modo Sala: carrega o estado, aplica a regra pura (src/rooms/room.ts) e salva
 * com controle de versão. Duas ações simultâneas nunca se sobrescrevem: a segunda é
 * reaplicada sobre o estado novo. Uma ação repetida (mesmo id) é aplicada uma vez só.
 */

export class RoomError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const ROOM_TTL = "6 hours";
/** Conteúdo publicado no painel (com cache curto e reserva embutida). */
async function roomContent() {
  const [nota, infiltrado] = await Promise.all([contentFor("nota"), contentFor("infiltrado")]);
  return {
    pools: { nota: nota.challenges, infiltrado: infiltrado.challenges },
    themes: { nota: nota.themes.map((t) => t.id), infiltrado: infiltrado.themes.map((t) => t.id) },
  };
}
/** Atualiza "visto por último" no máximo a cada tantos ms, para não escrever a cada consulta. */
const HEARTBEAT_EVERY_MS = 8_000;

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
const newToken = () => randomBytes(24).toString("base64url");
const newCode = () => Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");

interface RoomRow {
  id: string;
  version: number;
  state: RoomState;
  expired: boolean;
}

async function loadRoom(code: string): Promise<RoomRow> {
  const rows = (await db()`select id, version, state, expires_at < now() as expired from rooms where code = ${code}`) as RoomRow[];
  const row = rows[0];
  if (!row) throw new RoomError(404, "not-found", "Não encontramos uma sala com esse código. Confira as letras.");
  if (row.expired) throw new RoomError(410, "expired", "Essa sala expirou. Crie uma nova para jogar.");
  return row;
}

async function presenceOf(roomId: string): Promise<Record<string, number>> {
  const rows = (await db()`select id, extract(epoch from last_seen) * 1000 as seen from room_players where room_id = ${roomId}`) as { id: string; seen: string }[];
  return Object.fromEntries(rows.map((r) => [r.id, Number(r.seen)]));
}

async function authenticate(roomId: string, token: string | null): Promise<string> {
  if (!token) throw new RoomError(401, "no-token", "Entre na sala com um apelido para continuar.");
  const rows = (await db()`
    select id, extract(epoch from (now() - last_seen)) * 1000 as age
    from room_players where room_id = ${roomId} and token_hash = ${hashToken(token)}`) as { id: string; age: string }[];
  const me = rows[0];
  if (!me) throw new RoomError(401, "bad-token", "Sua entrada nesta sala não vale mais. Entre de novo com um apelido.");
  // Presença: só escreve se o último sinal for antigo, para não gravar a cada consulta.
  if (Number(me.age) > HEARTBEAT_EVERY_MS) await db()`update room_players set last_seen = now() where id = ${me.id}`;
  return me.id;
}

function ruleToRoomError(e: unknown): never {
  if (e instanceof RuleError) throw new RoomError(e.code === "closed" ? 410 : 409, e.code, e.message);
  throw e;
}

/** Salva um novo estado somente se a versão ainda for a que lemos. */
async function save(row: RoomRow, next: RoomState): Promise<boolean> {
  const rows = (await db()`
    update rooms set state = ${JSON.stringify(next)}::jsonb, version = version + 1, status = ${next.status},
      updated_at = now(), expires_at = now() + ${ROOM_TTL}::interval
    where id = ${row.id} and version = ${row.version}
    returning version`) as { version: number }[];
  return rows.length > 0;
}

async function cleanupExpired() {
  // Apaga salas expiradas há mais de um dia (cascata remove participantes e ações).
  await db()`delete from rooms where expires_at < now() - interval '1 day'`;
}

/* ---------- operações públicas ---------- */

export async function createRoom(input: { nickname: string; piece: PieceKind }) {
  if (Math.random() < 0.1) await cleanupExpired().catch(() => {});
  const playerId = randomUUID();
  const token = newToken();
  const { themes } = await roomContent();
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = newCode();
    const state = createRoomState(code, { id: playerId, nickname: input.nickname.trim(), piece: input.piece }, Date.now(), themes);
    try {
      // Sala e credencial do anfitrião nascem juntas, numa transação.
      await db().transaction((sql) => [
        sql`insert into rooms (code, game, status, state) values (${code}, 'sala', 'lobby', ${JSON.stringify(state)}::jsonb)`,
        sql`insert into room_players (id, room_id, token_hash) select ${playerId}, id, ${hashToken(token)} from rooms where code = ${code}`,
      ]);
      return { code, token, playerId };
    } catch (e) {
      if (e instanceof Error && /duplicate key|unique/i.test(e.message)) continue; // código já usado: sorteia outro
      throw e;
    }
  }
  throw new RoomError(503, "busy", "Não conseguimos gerar um código agora. Tente de novo.");
}

export async function joinRoomByCode(code: string, input: { nickname: string; piece: PieceKind }, existingToken: string | null) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const row = await loadRoom(code);
    // Reentrada: o celular já tem uma credencial válida para esta sala.
    if (existingToken) {
      const found = (await db()`select id from room_players where room_id = ${row.id} and token_hash = ${hashToken(existingToken)}`) as { id: string }[];
      if (found[0]) {
        let next: RoomState;
        try {
          next = rejoinRoom(row.state, found[0].id);
        } catch (e) {
          ruleToRoomError(e);
        }
        if (next === row.state || (await save(row, next))) return { code, token: existingToken, playerId: found[0].id };
        continue;
      }
    }
    const playerId = randomUUID();
    const token = newToken();
    let next: RoomState;
    try {
      next = joinRoom(row.state, { id: playerId, nickname: input.nickname, piece: input.piece }, Date.now());
    } catch (e) {
      ruleToRoomError(e);
    }
    const rows = (await db()`
      with upd as (
        update rooms set state = ${JSON.stringify(next)}::jsonb, version = version + 1, updated_at = now(), expires_at = now() + ${ROOM_TTL}::interval
        where id = ${row.id} and version = ${row.version} returning id
      )
      insert into room_players (id, room_id, token_hash) select ${playerId}, id, ${hashToken(token)} from upd
      returning id`) as { id: string }[];
    if (rows[0]) return { code, token, playerId };
  }
  throw new RoomError(409, "busy", "A sala está movimentada. Tente entrar de novo.");
}

export async function getView(code: string, token: string | null, knownVersion?: number): Promise<{ version: number; view: RoomView | null }> {
  const row = await loadRoom(code);
  const playerId = await authenticate(row.id, token);
  if (knownVersion === row.version) return { version: row.version, view: null };
  const presence = await presenceOf(row.id);
  return { version: row.version, view: viewRoom(row.state, playerId, presence, Date.now()) };
}

export async function act(code: string, token: string | null, clientActionId: string, action: RoomAction) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const row = await loadRoom(code);
    const playerId = await authenticate(row.id, token);
    const dup = (await db()`select 1 from room_actions where room_id = ${row.id} and client_action_id = ${clientActionId}`) as unknown[];
    if (dup.length) return getView(code, token);

    const [presence, content] = await Promise.all([presenceOf(row.id), roomContent()]);
    const now = Date.now();
    let next: RoomState;
    try {
      next = reduceRoom(row.state, playerId, action, { now, rng: Math.random, pools: content.pools, presence });
    } catch (e) {
      ruleToRoomError(e);
    }
    // Registro da ação e novo estado na mesma instrução: ou os dois acontecem, ou nenhum.
    // A linha da sala é travada e a versão conferida antes de registrar a ação.
    const rows = (await db()`
      with cur as (select id from rooms where id = ${row.id} and version = ${row.version} for update),
      ins as (
        insert into room_actions (room_id, client_action_id, player_id, type, version_after)
        select id, ${clientActionId}, ${playerId}, ${action.type}, ${row.version + 1} from cur
        on conflict do nothing returning room_id
      )
      update rooms set state = ${JSON.stringify(next)}::jsonb, version = version + 1, status = ${next.status},
        updated_at = now(), expires_at = now() + ${ROOM_TTL}::interval
      where id = ${row.id} and exists (select 1 from ins)
      returning version`) as { version: number }[];
    if (rows[0]) return { version: rows[0].version, view: viewRoom(next, playerId, presence, now) };
    // Nada salvo: ou outra ação passou na frente (tenta de novo) ou é repetida (o laço detecta).
  }
  throw new RoomError(409, "busy", "Muita coisa ao mesmo tempo. Tente de novo.");
}

