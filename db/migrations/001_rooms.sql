-- Modo Sala. O estado autoritativo da partida mora em rooms.state (jsonb) e nunca vai
-- inteiro para o cliente: o servidor projeta o que cada participante pode ver.
-- Dados pessoais: só o apelido, dentro do estado da sala, apagado quando a sala expira.

create table if not exists rooms (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  game        text not null,
  status      text not null default 'lobby' check (status in ('lobby', 'playing', 'ended', 'closed')),
  version     integer not null default 0,
  state       jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '6 hours'
);
create index if not exists rooms_expires_idx on rooms (expires_at);

-- Credencial de cada participante. Guardamos só o hash do token; o token fica no celular.
create table if not exists room_players (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references rooms (id) on delete cascade,
  token_hash  text not null unique,
  created_at  timestamptz not null default now(),
  last_seen   timestamptz not null default now()
);
create index if not exists room_players_room_idx on room_players (room_id);

-- Registro de ações já aplicadas: um mesmo client_action_id nunca é aplicado duas vezes.
create table if not exists room_actions (
  room_id           uuid not null references rooms (id) on delete cascade,
  client_action_id  text not null,
  player_id         uuid not null,
  type              text not null,
  version_after     integer not null,
  created_at        timestamptz not null default now(),
  primary key (room_id, client_action_id)
);
