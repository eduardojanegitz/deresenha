-- Avisos (notificação push) do Modo Sala: quem pediu para ser avisado quando a partida
-- começar. Uma linha por aparelho e sala; some junto com a sala (on delete cascade).
-- Não guarda nada pessoal além do endereço de entrega que o navegador gera.
create table if not exists room_push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references rooms (id) on delete cascade,
  player_id   uuid not null references room_players (id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now(),
  unique (room_id, endpoint)
);
create index if not exists room_push_room_idx on room_push_subscriptions (room_id);
